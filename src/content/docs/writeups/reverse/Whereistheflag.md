---
title: "Bugku CTF - Whereistheflag"
description: "OLLVM 混淆 Rust 静态二进制，以 write 锚定并用条件 watchpoint 追踪 u128 比较后打补丁取 flag。"
date: 2026-07-27
author: "AlbusPhos"
category: "Reverse"
subcategory: "OLLVM混淆"
tags: ["rust", "ollvm", "gdb-watchpoint", "u128-compare"]
difficulty: "Hard"
my_difficulty: "Hard"
event: "Bugku CTF"
cve: []
vuln_type: []
technique: ["gdb watchpoint",  "ollvm bypass"]
---


## Meta Info

[Bugku CTF - Whereistheflag](https://ctf.bugku.com/challenges/detail/id/3085.html)

### Challenge Statement

题面仅提供待分析二进制与 Rust 源码片段，无额外文字描述。

### Attachments

| Filename | Size | Type | SHA256 | Notes |
| ------------- | ---------- | --------------- | ------------------ | -------------------- |
| Whereistheflag | 15MB | x86-64 ELF | `38383225ad6bb804c52d6c848f4eec1bddd88de41108c09b5ac8a416855b2262` | BuildID `ec2839e96efc72f25537d5e8dc7e5aedbb2aff74` |
| main.rs | 638B | Rust 源码 | `be7a5ee7c1200aba76d01e14169d1b2f35e0f1d9b840b6c1598f38ffb46b0ca1` | 含 OLLVM 编译参数与 `seed() == 123456789` 比较逻辑，见 Workflow Step 1 |

### Environment

| Tool/Component | Version |
| -------------------- | --------------------------- |
| OS | Kali GNU/Linux Rolling x86_64 |
| GDB + pwndbg | 任意近年版本，需支持 `catch syscall` / `awatch` 条件断点 |
| file / checksec | 常规版本，用于确认链接方式与保护机制 |
| IDA | 仅用于验证静态不可读，未作为主路径 |

### Flag

```
bugku{7b476efc-1f1b-4c01-b8f9-d664d12ca75f}
```

---

## Summary

15MB Rust static-pie 二进制经 OLLVM 多轮混淆，字符串编译期加密使 IDA 与 `strings` 失效。以 `write` 系统调用锚定失败分支输出时刻，穷举常量 `123456789` 的 u128 内存副本并用条件 `awatch` 重建栈上搬运路径，从 `xor` 低位 / `xor` 高位展开语义反推出 `seed()` 返回值位置，打补丁使比较成立即触发 flag 分支。

<details>
<summary>Attack Chain Diagram</summary>

```mermaid
graph LR
    A[write 锚定失败分支] --> B[穷举常量副本并验证高位]
    B --> C[条件 awatch 重建搬运路径]
    C --> D[定位 xor 比较并 patch 取 flag]
```

</details>

---

## Initial Recon

### Observed Information

```bash
ll ./Whereistheflag
# -rwxrwxr-x 1 zz zz 15M  7月26日 22:06 ./Whereistheflag

file ./Whereistheflag
# ELF 64-bit LSB pie executable, x86-64, static-pie linked, for GNU/Linux 3.2.0, stripped

checksec --file=./Whereistheflag
# Full RELRO, No canary, NX enabled, PIE enabled, No Symbols
```

- 64 位 Linux ELF，`static-pie linked`，标准库全部内嵌；`stripped`，无法按符号定位 `main`。
- 体积约 15MB，远超简单逻辑应有大小，结合题面源码中 `__OLLVM_PASS_OBFUSCATE_FORCE__` 与 `passes=rp,rl,cff,bbs,is,bbs,cff,is`，判定为 OLLVM 高强度混淆（含控制流平坦化、基本块分割、指令替换，且标准库一同混淆编译）。
- `ss!` / `s2!` 为编译期加解密宏，`bugku{`、`123456789`、`zako ~` 均不以明文存在，`strings` 与 IDA 字符串窗口无法直接定位。

### Decision Reasoning

基于以上信息的方向判断：

- 多轮 `cff` + `bbs` 已把简单分支展开为状态机巨型 `switch`，`is` 用 MBA 替换基本运算 → 排除以 IDA 反编译为主的静态还原路线，只把 IDA 作为辅助验证。
- 比较操作无论如何变换控制流，最终必须把两个操作数真实载入寄存器/内存并执行比较指令 → 选择动态调试加数据流追踪，从已知常量 `123456789` 出发逆向定位未知量 `seed()`，而不是去爆破几乎不可能命中的随机 `seed`。
- 字符串不可见意味着按特征搜 flag 路径已死，唯一可靠锚点是程序行为（失败分支必然调用 `write` 输出），因此第一步锚定 `write`。

---

## Workflow

### Step 1: 还原比较语义与混淆配置

题面附带的 Rust 源码是全题逻辑起点，先把它固定下来，避免后续在汇编里迷路：

```rust
use std::str::FromStr;
use lib::runtime::*;

#[main]
async fn main() {
    unsafe { core::arch::asm!("# __OLLVM_PASS_OBFUSCATE_FORCE__"); }
    // RUSTFLAGS="-C target-feature=+crt-static -Z llvm-plugins=ollvm_pass.so
    //   -C passes=rp,rl,cff,bbs,is,bbs,cff,is"
    // RUST_MIN_STACK=16777216 cargo +nightly build --release
    //   --target x86_64-unknown-linux-gnu -Z build-std=std,panic_abort,core,alloc

    if seed() == u128::from_str(ss!("123456789")).unwrap() {
        println!("{}", s2!("bugku{???}"));  // 类似 obfstr 的编译期解密宏
    } else {
        println!("{}", ss!("zako ~"));
        panic!("You can't see me");
    }
}
```

编译参数的含义：

| 参数 | 说明 |
|---|---|
| `-C target-feature=+crt-static` | 强制静态链接，包含完整 Rust 标准库 |
| `-Z llvm-plugins=ollvm_pass.so` | 加载 OLLVM 混淆插件 |
| `-C passes=rp,rl,cff,bbs,is,bbs,cff,is` | 多轮叠加混淆：控制流平坦化（cff）、基本块分割（bbs）、指令替换（is）等 |
| `-Z build-std=std,panic_abort,core,alloc` | 对 Rust 标准库本身一同混淆编译 |

程序核心是 `seed()`（返回 `u128` 随机值）与常量 `u128(123456789)` 的相等比较，成立则解密输出 flag，否则输出 `zako ~` 并 panic。正常运行该条件几乎不可能成立，于是解题目标也随之明确：不必还原全部混淆，只需在运行时找到真正参与比较的两个 128 位操作数，把其中一个覆写为另一个的值即可。

> 静态还原已死、比较语义仍然可能存在：后续所有动作都围绕“常量在哪、比较在哪”展开，不再纠缠控制流形态。

---

### Step 2: 以 write 锚定失败分支并穷举常量副本

先让程序跑到失败分支的输出点，确认常量解析已完成、比较已发生。拦截 `write` 系统调用：

```gdb
pwndbg> start
pwndbg> catch syscall write
pwndbg> c
```

命中时程序正准备输出 `zako ~`，比较已经完成：

```
Thread 1 "Whereistheflag" hit Catchpoint 1 (call to syscall write), 0x00007ffff7dc40be in ?? ()
*RDI  1
*RSI  0x555555556b50 ◂— 0xa7e206f6b617a  /* 'zako ~\n' */
*RDX  7
```

此时寄存器里还出现了三个眼熟的值：`R14 = 0xbf58476d1ce4e5b9`、`R15 = 0x94d049bb133111eb`，以及后续多次出现的 `0x9e3779b97f4a7c15`。这是 SplitMix64 一类 PRNG 的标准常量（黄金比例增量与 finalizer 混合乘数），说明 `seed()` 内部用了此类算法。它们是算法固定常量而非随机结果本身，不能作为定位 `seed()` 返回值存储位置的依据，后续必须与真正的比较操作数严格区分。

于是转而搜索已知常量 `123456789 = 0x75bcd15` 在内存中的全部副本，并逐一验证相邻 8 字节是否为 0，以排除字节错位导致的伪匹配：

```gdb
pwndbg> search -t qword 0x00000000075bcd15
Searching for an 8-byte integer: b'\x15\xcd[\x07\x00\x00\x00\x00'
[stack]  0x7fffffffbc70 0x75bcd15
[stack]  0x7fffffffbcb0 0x75bcd15
[stack]  0x7fffffffbd10 0x75bcd15
[stack]  0x7fffffffbe68 0x75bcd15
```

```gdb
pwndbg> x 0x7fffffffbc78
0x7fffffffbc78: 0x00000000     ✔ 符合
pwndbg> x 0x7fffffffbcb8
0x7fffffffbcb8: 0x00000000     ✔ 符合
pwndbg> x 0x7fffffffbd18
0x7fffffffbd18: 0x00000000     ✔ 符合
pwndbg> x 0x7fffffffbe70
0x7fffffffbe70: 0x3df952bc     ✘ 非零
```

> `bc70`、`bcb0`、`bd10` 三处符合 `u128(123456789)` 的“低位为值、高位为 0”布局，纳入观察；`be68` 高位非零予以排除。不预先猜测哪个是最终比较位置，全部下条件观察点，让程序自己“带路”。

---

### Step 3: 对有效候选下条件观察点，重建栈上搬运路径

对三处有效候选同时设置条件访问断点，然后删掉 `write` 锚点、重新运行，让每一次读写都触发断点：

```gdb
pwndbg> awatch *0x7fffffffbc70 if *(long long *)0x7fffffffbc70 == 123456789
pwndbg> awatch *0x7fffffffbcb0 if *(long long *)0x7fffffffbcb0 == 123456789
pwndbg> awatch *0x7fffffffbd10 if *(long long *)0x7fffffffbd10 == 123456789
pwndbg> d 1
pwndbg> r
```

断点按 `bd10 → bcb0 → bc70` 的顺序依次命中，恰好串起一条完整的搬运链。第一次命中 `bd10` 时正在把解析好的常量连同高位 `0` 一起写入：

```
Thread 1 hit Hardware access (read/write) watchpoint 5: *0x7fffffffbd10
Old value = 12345678
New value = 123456789
► 0x7ffff70b46b9  mov  qword ptr [rdi + 8], rsi     ; [0x7fffffffbd18] <= 0
```

紧接着同一段代码又把它拷贝到 `bcb0`：

```
0x7ffff70b46bd  mov  rdi, [rbp-0x90]        ; rdi = 0x7fffffffbcb0
0x7ffff70b46c4  mov  qword ptr [rdi], rax   ; [bcb0] <= 0x75bcd15
0x7ffff70b46c7  mov  qword ptr [rdi+8], rsi ; [bcb8] <= 0
```

第二次命中是 `bcb0` 的写入，第三次是 `bcb0` 的读取，读取处的反汇编同时暴露了下一跳去向，也顺带解释了 Step 2 中被排除的 `be68` 只是又一次冗余拷贝：

```
Thread 1 hit watchpoint 4: *0x7fffffffbcb0
Value = 123456789
► 0x7ffff70b5aa3  mov  rax, [rax+8]
   0x7ffff70b5ab1  mov  qword ptr [rbp-0x2b8], rdx   ; [be68] <= 0x75bcd15
   0x7ffff70b5ab8  mov  rcx, [rbp-0x80]              ; rcx = 0x7fffffffbc70
   0x7ffff70b5abc  mov  qword ptr [rcx], rdx         ; [bc70] <= 0x75bcd15
```

第四次命中是 `bc70` 的写入，第五次则是 `bc70` 的读取，而这一次 RIP 停下的地方完全不同——关键的比较指令终于出现：

```
Thread 1 hit watchpoint 2: *0x7fffffffbc70
Value = 123456789
► 0x7ffff70b53c2   xor  r15, qword ptr [rbp - 0x208]
   0x7ffff70b53c9   mov  qword ptr [rbp - 0x40], r11
   0x7ffff70b53cd   mov  qword ptr [rbp - 0x58], r10
   0x7ffff70b53d1   mov  r12, qword ptr [rax + 8]
   0x7ffff70b53d5   xor  r12, qword ptr [rbp - 0x200]
```

> 搬运路径收敛于此：常量经 `bd10 → bcb0 → bc70` 三级拷贝后被读出参与运算，`xor` 的另一侧操作数即为待求的 `seed()` 返回值，下一步只需从指令语义确认比较形态。

---

### Step 4: 从指令语义确认 128 位比较并打补丁

这一步不靠“数值看起来随机”来猜，而是靠指令形态下结论。上述两条 `xor` 构成典型的 `u128` 相等比较展开：

```
low_diff  = const_lo XOR [rbp-0x208]
high_diff = const_hi XOR [rbp-0x200]
equal     = (low_diff OR high_diff) == 0
```

现场寄存器也对得上：`RAX = 0x7fffffffbc70` 指向常量低位，`R12（xor 之前）= [rax+8] = 0` 为常量高位，`R15 = 0xc58b76a55e5deea7 = 0x75bcd15 ^ [rbp-0x208]` 正好是低位差值。由此从指令语义上推导出 `[rbp-0x208]` 是 `seed()` 返回值的低 64 位，`[rbp-0x200]` 是其高 64 位。

此刻 RIP 正停在第一条 `xor` 上、原始值尚未被破坏，直接修改被比较的操作数，让两次异或结果均为 0：

```gdb
pwndbg> set {long long}($rbp - 0x208) = 0x75bcd15
pwndbg> set {long long}($rbp - 0x200) = 0
pwndbg> c
```

后续的 `or` 与条件跳转随即判定为相等，程序进入 `s2!` 解密分支并打印：

```
Continuing.
bugku{7b476efc-1f1b-4c01-b8f9-d664d12ca75f}
[Inferior 1 (process 25241) exited normally]
```

> `continue` 后直接出现 flag，形成“定位比较 → 修改操作数 → 输出分支”的完整因果闭环，解题结束。

---

## Reflection

本次最大的思维定式是“混淆强就该上 IDA 硬啃”，实际 15MB static-pie 加四轮 OLLVM 下反编译已无性价比；转而抓住“比较必落到真实指令”这一不变量，用常量驱动的动态追踪降维打击，这是可复用的方法论：在控制流被严重混淆时可考虑追踪已知数据流——控制流形态可以任意伪造，但已知常量（如本例的 `123456789`）在内存中的出现位置与搬运路径是伪造不了的，顺着它走就能绕过状态机与 MBA 直达真正的比较点。真实防御视角：若比较前对常量做白盒拆分或把判定搬进反调试的定时检查，简单的 watchpoint 搬运追踪就会困难得多。

---

## Links

- [Bugku CTF — Whereistheflag](https://ctf.bugku.com/challenges/detail/id/3085.html)
- [ollvm_pass](https://github.com/AlbusPhos/ollvm_pass)