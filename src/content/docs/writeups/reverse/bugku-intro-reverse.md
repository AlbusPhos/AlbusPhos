---
title: "Bugku CTF - 入门题Reverse"
description: "MinGW 编译的入门混淆题，IDA 定位 main 后还原异或减法解密脚本，运行即得 flag。"
date: 2026-10-16
author: "AlbusPhos"
category: "Reverse"
subcategory: "XOR Obfuscation"
tags: ["xor", "mingw", "ida"]
difficulty: "Easy"
my_difficulty: "Easy"
event: "Bugku CTF"
points: 30
solves: 456
first_blood: false
cve: []
vuln_type: []
technique: ["ida-static-analysis", "xor-decoding"]
---

## Meta Info

[Bugku CTF - 入门题Reverse](https://ctf.bugku.com/challenges/detail/id/2970.html)

### Challenge Statement


### Attachments

| Filename | Size | Type | SHA256 | Notes |
| ------------- | ---------- | --------------- | ------------------ | -------------------- |
| file.zip | 29607 B | Zip archive (deflate, uncompressed 79289) | `afc23753e6b388d46a177ff00cfe89a0d0c7733c3d64fceda6f3225e3b914779` | 解压得到 `challenge.exe` |
| challenge.exe | 79289 B | PE32+ x86-64 console, 16 sections | `4bcaaa91b232baaaa987b62ee87a7a8c760558953cfd86c2940588542d7f83cb` | DiE 识别 MinGW GCC 14.2.0（x86_64-win32-seh-rev2） |

### Environment

| Tool/Component | Version |
| -------------------- | --------------------------- |
| OS | Kali GNU/Linux Rolling x86_64 |
| 7-Zip | 26.03 (x64, 2026-09-03) |
| DiE (`diec`) | 3.21 |
| strings2 | 个人自建工具 |
| IDA Pro | 9.5 |


### Flag

```
flag{reversing_made_easy_2025}
```

---

## Summary

MinGW 编译的 64 位 Windows 入门题，无壳无反调试。`strings2` 只扫出 MinGW 运行时噪声，真正的比对逻辑藏在 `main` 里：程序读入一行输入，要求长度恰为 30，逐字节做 `(c + 3) ^ 0x5A` 后与栈上 30 字节密文比对，全对才回显 `Correct!`。密文分两段存放——24 字节可见串拷到 `Buffer[64]`，一次 8 字节 `QWORD` 写到 `Buffer[75]`（`_WORD` 数组，下标差 11 即 22 字节偏移，与可见串尾部 2 字节重叠，实增 6 字节）。IDA 读出两段常量做逆运算 `(b ^ 0x5A) - 3` 即得 flag。

---

## Initial Recon

### Observed Information

```bash
7z x ./file.zip
# Size: 79289, Compressed: 29607, Everything is Ok

diec ./challenge.exe
# PE64
# Compiler: MinGW(GCC: (x86_64-win32-seh-rev2, Built by MinGW-Builds project) 14.2.0)

strings2 ./challenge.exe | tail -n 50
# .rdata$ / __mingw_ / !This program cannot be run in DOS mode.
# GCC: (x86_64-win32-seh-rev2, Built by MinGW-Builds project) 14.2.0
# C:/buildroot/.../libgcc2.c 等构建路径
# 未见 flag 或可疑密文字符串
```

- 标准 MinGW 产物：16 个节，`stripped` 程度低但字符串表全是 libgcc / mingw 运行时噪声，静态扫串无收获。
- 二进制仅 78 KiB，无 PyInstaller / UPX 等打包器痕迹 → 排除解包路线，直接上 IDA 看反汇编。


---

## Workflow

### Step 1: IDA 定位 main，读出密文与变换

IDA 打开 `challenge.exe`，直接进 `main` 函数，关键逻辑一目了然：

![IDA 中查看 main 函数](<../../../../assets/attachments/intro-reverse-ida-main.png>)

伪代码（IDA `main`，整理后，原语义不变）：

```c
_main(argc, argv, envp);
qmemcpy(&Buffer[64], "35>0$/2#2/,6+08*>=282>,&", 24);  // 可见串仅 24 字节
*(_QWORD *)&Buffer[75] = 0xDA626F696F38262CULL;         // _WORD 数组：下标差 11 = 22 字节偏移
v7 = 30;
printf("Enter flag: ");
if (fgets(Buffer, 128, stdin) == NULL) return 0;
// 去尾部换行后要求长度 == 30，否则 "Wrong length."
if (v7 == strlen(Buffer)) {
    for (i = 0; i < v7; ++i) {
        v6 = Buffer[i];
        v6 += 3;
        v6 ^= 0x5A;
        if (v6 != *(((char *)&Buffer[64]) + i)) {
            printf("Incorrect.\n");
            return 0;
        }
    }
    printf("Correct! Here is your flag: %s\n", Buffer);
}
```

三个关键点：

- 程序是交互式校验器，不是解码器——flag 是满足比对的**输入本身**，通过即原样回显，不存在“运行直接打印 flag”的路径。
- `Buffer` 是 `_WORD` 数组，`&Buffer[75]` 相对 `&Buffer[64]` 的字节偏移是 `(75-64)*2 = 22`，不是 24。`QWORD` 的 8 个字节覆盖可见串最后 2 字节（`", &"` = `0x2C 0x26`，恰与 `QWORD` 小端头两字节相同）后再追加 6 字节，密文共 `24 + 6 = 30` 字节，与 `v7 = 30` 的长度门一致。
- 变换方向是加密侧 `(c + 3) ^ 0x5A`，解密做逆运算 `(b ^ 0x5A) - 3`。

> 密文 30 字节 + 长度门 30 + 单字节可逆变换即为全部考点，无需动调。

---

### Step 2: 编写解密脚本并运行

```cpp
#include <iostream>

using namespace std;

int main() {
    // 可见串 24 字节；QWORD 写在 +22 字节偏移处（与伪代码 &Buffer[75] 等价），重叠 2 字节
    char enc[24] = "35>0$/2#2/,6+08*>=282>,&";
    char cipher[30];
    for (int i = 0; i < 22; ++i) cipher[i] = enc[i];
    *(_QWORD *)(cipher + 22) = 0xDA626F696F38262CULL;

    for (int i = 0; i < 30; ++i) {
        cout << (char)((cipher[i] ^ 0x5Au) - 3);
    }
    return 0;
}
```


```python
s = b'35>0$/2#2/,6+08*>=282>,&'          # 24 字节
qw = (0xDA626F696F38262C).to_bytes(8, 'little')
cipher = bytearray(s[:22]) + bytearray(qw)  # +22 偏移重叠 2 字节，共 30 字节
flag = ''.join(chr((b ^ 0x5A) - 3) for b in cipher)
print(flag, len(flag))
# flag{reversing_made_easy_2025} 30
```

> 注意：若把 `QWORD` 当成追加 8 字节（共 32 字节）解码，会得到 `flag{reversing_made_easysy_2025}`——多出的 `sy` 正是被重叠覆盖的 `", &"` 两字节的解码结果。这个 32 字节版本过不了程序 `v7 == 30` 的长度门，提交前务必以伪代码的下标为准。

#### Execution Result

```
$ ./decode
flag{reversing_made_easy_2025}
```

---

## Links

- [Bugku CTF — 入门题Reverse](https://ctf.bugku.com/challenges/detail/id/2970.html)
