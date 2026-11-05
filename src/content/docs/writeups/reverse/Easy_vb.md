---
# ============ Basic Info ============
title: "Bugku CTF - Easy_vb"   #[强制必须] 非空字符串，页面标题
description: "简单vb逆向"  #[强制必须] 非空字符串

# ============ Time Info ============
date: 2026-10-16                         #[建议] 格式 YYYY-MM-DD

# ============ Author Info ============
author: "AlbusPhos"                  #[强制必须] 用于归属与建库索引

# ============ Category Info ============
# 字段定位说明（避免打标混乱，四个字段职责不重叠）：
#   subcategory : 单值，题目所属宏观子领域，用于目录/归档分组
#   vuln_type   : 数组，漏洞"根因"分类（what's broken），如 heap-overflow / sql-injection / race-condition
#   technique   : 数组，针对该根因的"具体利用手法"（how it's abused），如 house-of-force / jwt-forgery / tcache-poisoning
#   tags        : 数组，自由检索关键词，可与上述字段重复，面向全文检索而非严格分类，不做强制去重校验
category: "Reverse"                        #[强制必须] 枚举值：Pwn/Reverse/Web/Crypto/Misc/Mobile/Blockchain/AI/Forensics/OSINT/Hardware
subcategory: "Visual Basic"       #[建议] 自由文本单值子分类，如 Heap/ROP/SQLi/RSA/APK逆向
tags: ["visual-basic"] #[建议] 检索关键词数组，统一英文短语

# ============ Difficulty Info ============
difficulty: "Easy"                   #[建议] 官方标注难度，枚举：Easy/Medium/Hard/Insane
my_difficulty: "Easy"                  #[额外] 个人主观体感难度，枚举与 difficulty 一致，可与官方不同

# ============ Event Info ============
event: "Bugku CTF"           #[强制必须] 赛事/平台名（按情况调整），用于分组归档

# ============ Vulnerability/Technique Info (for indexing) ============
cve: []                #[额外] 如涉及已知CVE，无则留空数组 []
vuln_type: []   #[建议] 漏洞根因类型数组，无则留空 []
technique: ["VB Decompiler"]     #[建议] 利用技术数组，无则留空 []
---



## Meta Info


[Bugku CTF - Easy_vb](https://ctf.bugku.com/challenges/detail/id/100.html)   <!-- [建议] 题目来源，有来源时添加；无来源时整行删除-->

### Challenge Statement
<!-- [建议] 粘贴原始题目描述/题面文字 -->

> 描述: flag{xxxx}

### Attachments
<!-- [建议] 
     有附件：填写下方表格，每行一个文件；
     无附件则整节删除 -->

| Filename      | Size       | Type            | SHA256            | Notes                |
| ------------- | ---------- | --------------- | ------------------ | -------------------- |
| file.zip     | 4.7K   | ZIP  | `e4af0634944d93a05852ea457968b1934459507deafc811eca752370cb34bf88`  | |
| file/easy_vb.exe | 24K  | PE32  | `5529c1fc1c4bb30fbe1d8f4afc8ed06dbe7f02b6f1dc3761a4d76e943d615746`  |                       |


### Environment
<!-- [建议] 工具/版本信息可能影响exploit可复现性 -->

| Tool/Component      | Version                    |
| -------------------- | --------------------------- |
| VB Decompiler    | v10.0-Registered to AXiS -FFF  |



### Flag
<!-- [强制必须] writeup的核心证明物，必须存在（可脱敏处理），完全缺失视为writeup不完整。
     脱敏时请保留可辨识特征（如长度范围/已知前后缀），避免整串替换为无意义占位符导致无法作为"解出证明" -->

```
flag{_N3t_Rev_1s_E4ay_}
#或 MCTF{_N3t_Rev_1s_E4ay_}
```

---

## Summary
<!-- [强制必须] 本章节标题必须保留。工作流是叙事性结构，不便速读，此处必须给出"结论先行"的速览 -->

简单的vb逆向，若有VB Decompiler工具则可快速解出。


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


首先使用die检查：
```bash
diec ./easy_vb.exe
# PE32
#    Linker: Microsoft Linker(6.0)
#    Compiler: Visual Basic(6.00.8783)[Native]
```


### Decision Reasoning
<!-- [必须] 这是本章节的灵魂，不能只罗列信息不给判断。必须明确说明：
     1. 基于已知信息，倾向于哪个攻击方向
     2. 为什么选这个方向（排除了哪些可能性，依据是什么）
     缺失此部分视为该章节不完整 -->

发现没有加壳并且使用vb编写，所以优先使用VB Decompiler观察。

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



### Step 1: VB Decompiler打开
<!-- [强制必须] 至少需要一个Step记录"如何定位到漏洞/考点"，此为必须项，不可整体省略。
     本Step需隐含回答：做了什么 → 发现了什么 → （若为关键转折）这说明什么/下一步往哪走。
     不强制使用标题标签，用自然语言融合表达。 -->


![Pasted image 20261016152351](../../../../assets/attachments/Pasted%20image%2020261016152351.png)



---

### Step 2: 寻找核心逻辑
<!-- [建议] 后续Step数量不限，按实际解题过程增减。
     信息量小的Step可以极致简化为"代码+一句话"，不必强行展开。 -->

点击Code->QCTF展开

![Pasted image 20261016152528](../../../../assets/attachments/Pasted%20image%2020261016152528.png)

#### 查看Command1_Click_402310

![Pasted image 20261016152834](../../../../assets/attachments/Pasted%20image%2020261016152834.png)
首先看到两个`MCTF{_N3t_Rev_1s_E4ay_}`，我们怀疑它可能是flag。
然后分析逻辑，它获取一个文本存到var_18里面，如果(var_18 == "MCTF{_N3t_Rev_1s_E4ay_}") + 1 为True则将其MsgBox展示，否则提示`Try again!`。

根据题目描述，更换前缀为flag提交，验证通过。

---

## Links
<!-- [额外] 无相关链接的条目直接删除对应行，不要留空链接 -->

- [Bugku CTF - Easy_vb](https://ctf.bugku.com/challenges/detail/id/100.html)
- [VB_Decompiler_Pro_v_10.0_FFF.zip](https://down.52pojie.cn/Tools/Disassemblers/VB_Decompiler_Pro_v_10.0_FFF.zip)
