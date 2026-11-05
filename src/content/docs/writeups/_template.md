---
# ============ Basic Info ============
title: "{{EVENT_NAME}} - {{CHALLENGE_NAME}}"   #[强制必须] 非空字符串，页面标题
description: "{{一句话描述该题目，建议20-80字，用于列表页摘要/SEO}}"  #[强制必须] 非空字符串

# ============ Time Info ============
date: 2026-01-01                         #[建议] 格式 YYYY-MM-DD

# ============ Author Info ============
author: "{{your_handle}}"                  #[强制必须] 用于归属与建库索引

# ============ Category Info ============
# 字段定位说明（避免打标混乱，四个字段职责不重叠）：
#   subcategory : 单值，题目所属宏观子领域，用于目录/归档分组
#   vuln_type   : 数组，漏洞"根因"分类（what's broken），如 heap-overflow / sql-injection / race-condition
#   technique   : 数组，针对该根因的"具体利用手法"（how it's abused），如 house-of-force / jwt-forgery / tcache-poisoning
#   tags        : 数组，自由检索关键词，可与上述字段重复，面向全文检索而非严格分类，不做强制去重校验
category: "{{Pwn}}"                        #[强制必须] 枚举值：Pwn/Reverse/Web/Crypto/Misc/Mobile/Blockchain/AI/Forensics/OSINT/Hardware
subcategory: "{{Heap Exploitation}}"       #[建议] 自由文本单值子分类，如 Heap/ROP/SQLi/RSA/APK逆向
tags: ["{{ret2libc}}", "{{house-of-force}}"] #[建议] 自由检索关键词数组，统一英文短语，全小写，使用连字符分隔

# ============ Difficulty Info ============
difficulty: "{{Medium}}"                   #[建议] 官方标注难度，枚举：Easy/Medium/Hard/Insane
my_difficulty: "{{Hard}}"                  #[额外] 个人主观体感难度，枚举与 difficulty 一致，可与官方不同

# ============ Event Info ============
event: "{{EVENT_NAME}} {{2024}}"           #[强制必须] 赛事/平台名（按情况调整），用于分组归档
points: 450                              #[额外] 题目分值；Number类型
solves: 23                               #[额外] 解出队伍数；Number类型
first_blood: false                       #[额外] 是否一血；Boolean类型

# ============ Vulnerability/Technique Info (for indexing) ============
cve: ["{{CVE-2021-XXXXX}}"]                #[额外] 如涉及已知CVE，无则留空数组 []
vuln_type: ["{{Stack Overflow}}"]   #[建议] 漏洞根因类型数组，无则留空 []
technique: ["{{ret2text}}", "{{stack pivoting}}"]     #[建议] 利用技术数组，无则留空 []
---

<!--
说明：标题已写入 frontmatter 的 title 字段，正文不再重复写一级标题，
以适配 Astro/Starlight 框架（框架会自动从 frontmatter 渲染页面标题）。

占位符说明：全文所有 {{xxx}} 均为待填内容，发布前必须替换或按说明删除对应行/块；
正文中不应遗留任何未替换的 {{}} 标记。
-->

## Meta Info
<!-- [强制必须] 本章节标题必须保留，是题目的基础档案信息，独立于下方"叙事性"内容 -->


[{{EVENT_NAME}} - {{CHALLENGE_NAME}}]({{URL}})   <!-- [建议] 题目来源，有来源时添加；无来源时整行删除-->

### Challenge Statement
<!-- [建议] 粘贴原始题目描述/题面文字 -->

> {{在此粘贴原始题目描述，无则删除本行"}}

### Attachments
<!-- [建议] 
     有附件：填写下方表格，每行一个文件；
     无附件则整节删除 -->

| Filename      | Size       | Type            | SHA256            | Notes                |
| ------------- | ---------- | --------------- | ------------------ | -------------------- |
| {{chall}}     | {{12KB}}   | {{ELF 64-bit}}  | `{{SHA256_HASH}}`  | {{无符号表、剥离调试信息}} |
| {{libc.so.6}} | {{1.8MB}}  | {{glibc 2.31}}  | `{{SHA256_HASH}}`  |                       |

### Remote / Target
<!-- [建议] 无则整节删除 -->

- nc: `{{nc chal.example.com 1337}}`
- Web: `{{https://chal.example.com}}`

### Environment
<!-- [建议] 工具/版本信息可能影响exploit可复现性 -->

| Tool/Component      | Version                    |
| -------------------- | --------------------------- |
| OS                    | {{Ubuntu 22.04}}           |
| glibc                 | {{2.35}}                   |
| Debugger              | {{gdb + pwndbg 2024.x}}    |
| Decompiler            | {{IDA Pro 8.3 / Ghidra 11}} |
| Other Dependencies    | {{}}                        |

### Time Spent
<!-- [额外] 如果进行了计时才添加本小节，无则整节删除 -->

约 {{X}} 小时

### Flag
<!-- [强制必须] writeup的核心证明物，必须存在（可脱敏处理），完全缺失视为writeup不完整。
     脱敏时请保留可辨识特征（如长度范围/已知前后缀），避免整串替换为无意义占位符导致无法作为"解出证明" -->

```
{{FLAG}}
```

---

## Summary
<!-- [强制必须] 本章节标题必须保留。工作流是叙事性结构，不便速读，此处必须给出"结论先行"的速览 -->

{{四句话以内的总结，建议一句话，必须能让读者3秒内判断这题考什么，如"XX函数未校验长度导致堆溢出，通过tcache poisoning劫持__free_hook getshell"}}

<details>
<summary>Attack Chain Diagram</summary>

<!-- [额外] 判断标准：若解题过程包含3个以上相互依赖的关键转折点（如多次信息泄露+多阶段利用），建议保留此图；
     否则（如单一溢出点直接ret2libc）整体删除此details块（含标签），不要留空壳 -->

```mermaid
graph LR
    A[{{Find Vulnerability}}] --> B[{{Build Exploit Chain}}]
    B --> C[{{Get Flag}}]
```

</details>

---

## Initial Recon
<!-- [强制必须] 本章节标题必须保留。目的不是信息转储，而是回答："基于目前看到的东西，我打算往哪个方向打，为什么？排除了哪些方向？"
     这是解题决策的起点，后续Workflow每一步都应能追溯回这里的某个判断。
     与下方 Workflow 中各 Step 的 Decision 分工：
       - 本章节负责"宏观方向判断"（选择哪条攻击路线、排除哪些路线）
       - Step 内的 Decision 负责"微观步骤判断"（某个具体操作的结果说明了什么、下一步具体做什么）
       - 若宏观方向已在本章节讲清楚，Step 内 Decision 不必重复论证选路线的理由 -->

### Observed Information
<!-- [必须] 按需使用以下任意形式记录，不强制表格/命令的具体格式；按题目类别自行增删子项 -->

```bash
file chall && checksec --file=chall
```

{{NX enabled, PIE disabled, no Canary | whatweb显示框架/中间件信息 | n/e/c等参数提取结果 | 包名/合约地址/加固方式}}

### Decision Reasoning
<!-- [建议] 说明：
     1. 基于已知信息，倾向于哪个攻击方向
     2. 为什么选这个方向（排除了哪些可能性，依据是什么）
 -->

基于以上信息的方向判断：
- {{判断依据1}} →  {{……}}
- {{判断依据2}} → {{……}}

---

## Workflow
<!-- [强制必须] 本章节标题必须保留，是writeup的核心主体。按实际解题时间线记录。

     写作原则：用自然叙事呈现技术思考过程——代码与说明文字交替出现，用因果连接词
     （于是/因此/这表明/但是/为了验证/结果）把逻辑自然串联起来。

     落笔前请在心里过一遍这四个问题，但不需要在正文中逐一标注：
       1. 做了什么操作/代码（What）
       2. 得到了什么具体、可验证的结果（Findings）
       3. 这个结果指向或排除了什么方向（Decision）
       4. 非显而易见时，为什么选这个方向而不是其他（Why）

     关键转折点（揭示漏洞、确定利用路线、推翻某个假设、确认关键参数）
     建议用 blockquote（>）标出结论性判断，作为视觉上的"锚点"，
     不需要单独的"Decision:"或"Why:"标题。

     篇幅弹性：
       - 简单操作（如验证一个已知结论）：代码块 + 一句话即可，不必展开
       - 复杂操作（多次试错/多个信息点交织验证）：允许自由展开多段叙述，
         代码块可随时穿插在文字中间，不必集中堆放在开头

     Step数量与粒度完全按实际解题时间线决定，不强制对齐某个数量。 -->

### Step 0: Environment Setup
<!-- [额外] 创建本地复现需要的环境，如果需要才添加，无则整节删除 -->

```bash
docker-compose up -d
patchelf --set-interpreter ./ld-2.31.so ./chall
```
```python
from pwn import *
context.binary = elf = ELF('./chall')
```

---

### Step 1: {{本步骤目标，如"定位溢出点/确认注入点/提取密码学参数"}}
<!-- [强制必须] 至少需要一个Step记录"如何定位到漏洞/考点"，此为必须项，不可整体省略。
     本Step需隐含回答：做了什么 → 发现了什么 → （若为关键转折）这说明什么/下一步往哪走。
     不强制使用标题标签，用自然语言融合表达。 -->

```c
void vuln() {
    char buf[64];
    gets(buf);   // {{为什么一眼看出这是问题点，可直接写在注释或下方说明中}}
}
```

{{说明文字：看到这段代码/行为后的第一反应是什么，验证手段是什么}}

```
pwndbg> b *vuln+20
pwndbg> r
pwndbg> cyclic 200
```

{{崩溃/响应的具体结果，必须是可验证的事实，而非模糊描述，
  例如："崩溃发生在偏移72字节处，RIP被覆盖为0x4141414141414141"}}

> {{若本Step是关键转折点（如确认了漏洞类型/排除了某个思路），
  用引用块点出结论，例如："无Canary保护，因此可以直接覆盖返回地址，
  不需要先解决栈保护绕过，下一步考虑ROP链构造"}}

---

### Step 2: {{本步骤目标}}
<!-- [建议] 后续Step数量不限，按实际解题过程增减。
     信息量小的Step可以极致简化为"代码+一句话"，不必强行展开。 -->

```python
payload = b'A' * 72 + p64(pop_rdi) + p64(got_puts) + p64(puts_plt) + p64(main)
```

{{发送payload后观察到的具体结果，例如：
  "成功泄露puts地址：0x7fxxxxxxxxxx"}}

> {{对比本地libc符号表计算出libc base，与预期offset一致，
  确认libc版本判断正确，下一步构造最终payload}}

---

### Step 3: {{若该步骤包含多次试错/多个信息点交织，可自由展开多段，
     不受"一个Step=一小段"的限制，直接删除本注释}}
<!-- [建议] 复杂Step示例，供参考，可删除或替换 -->

{{最初尝试的思路，以及为什么失败/放弃，例如：
  "最初尝试直接爆破PIE基址低字节，但由于程序重启较慢导致爆破成功率不稳定，放弃"}}

{{转向的新思路}}：

```c
printf(user_input);  // {{第二处漏洞点}}
```

{{验证新思路的具体操作与结果}}：

```
pwndbg> b *vuln2+15
payload: %7$p
```

{{结果，例如："输出0x5566778899aa，与/proc/self/maps中程序基址高位一致，
  说明栈上第7个参数位置存放的是该函数返回地址"}}

> {{综合结论：这比方案A更可靠，因此确定最终exploit采用"格式化字符串泄露基址
  + 栈溢出劫持控制流"的组合路线}}

---

### Step {{N}}: {{Final Exploit / Flag Verification}}
<!-- [建议] {{N}} 替换为实际步骤序号（即上一个Step编号+1），不要保留字面意义的"N" -->

{{最终构造完整payload并发送的过程，以及获取flag的结果，
  可以是代码块+一句话，也可按需展开}}

---

### Complete {{Exploit / Script}}
<!-- [建议] 工作流最后汇总的完整可运行脚本/操作序列；
     若题目无统一脚本形态或内容极少，不适合单独成节，则整节删除 -->

```python
#!/usr/bin/env python3
from pwn import *

context.binary = elf = ELF('./chall')
libc = ELF('./libc.so.6')

io = remote('{{chal.example.com}}', {{1337}})
# io = process('./chall')

# === exploit逻辑（完整版，整合以上所有Step） ===

io.interactive()
```

#### Execution Result
<!-- [额外] 附上实际运行输出作为解题证明 -->

```
$ python3 exploit.py
[+] Opening connection to {{chal.example.com}} on port {{1337}}: Done
[+] {{FLAG}}
```



## Reflection
<!-- [建议] -->

{{记录解题过程中的思维盲区、新学到的技术手法，或该漏洞在真实生产环境中的防御建议}}

---

## Links
<!-- [额外] 无相关链接的条目直接删除对应行，不要留空链接 -->

- [{{官方 writeup}}]({{URL}})
- [{{相关技术文章}}]({{URL}})
- [{{工具/项目链接}}]({{URL}})
- [{{CVE/漏洞公告}}]({{URL}})
- [{{类似题目}}]({{URL}})

---

<!-- Priority Marker Legend
本模板仅使用且严格限定以下四级标记，供未来 CI 校验脚本解析 frontmatter / 正文字段的完整性：

| 标记 | 含义 | 字段缺失时 CI 行为 |
|---|---|---|
| `[强制必须]` | 核心硬性字段，缺失视为该 writeup 不完整 | 发出 **warning 并熔断构建**（blocking） |
| `[必须]` | 常规必填字段，适用场景下应尽量填写 | 发出 **warning**，不阻断构建 |
| `[建议]` | 推荐填写，提升文档质量与可检索性 | 发出 **提示（info/notice）**，不阻断构建 |
| `[额外]` | 可选补充字段，有信息时才填 | **不检查、不提示** |

正文中任何位置残留未替换的 {{xxx}} 占位符，CI 均应至少发出 info 级提示，
若残留于[强制必须]字段对应内容中，按[强制必须]等级处理（阻断构建）。
-->