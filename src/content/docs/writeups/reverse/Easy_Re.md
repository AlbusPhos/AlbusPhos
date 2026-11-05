---
title: "DUTCTF - Easy_Re"
description: "Windows 控制台逆向入门题，解压附件后用 strings 静态扫描直接提取明文 flag。"
date: 2026-10-16
author: "AlbusPhos"
category: "Reverse"
subcategory: "Static Analysis"
tags: ["strings"]
difficulty: "Easy"
my_difficulty: "Easy"
event: "DUTCTF"
cve: []
vuln_type: []
technique: ["strings-analysis"]
---

## Meta Info

### Challenge Statement

>描述: flag格式：DUTCTF{xxxx}

### Attachments

| Filename | Size | Type | SHA256 | Notes |
| ------------- | ---------- | --------------- | ------------------ | -------------------- |
| re1.zip | 49292 B | ZIP | `8b9215ff30632df6fc0f5586e7c580d1c03a60503ed8d1c7ea3e0f10f4a03710` | 内含 `re1.exe` |
| re1.exe | 90624 B | PE32 | `f8098f04d2eba80a0dc4a4dfe67b43268d92db3928bfe6d3958277766620d318` | VS 构建，PDB `E:\c\ConsoleApplication2\Release\ConsoleApplication2.pdb` |

### Environment

| Tool/Component | Version |
| -------------------- | --------------------------- |
| OS | Kali GNU/Linux Rolling x86_64 |
| 7-Zip | 26.03 |
| GNU strings (Binutils) | 2.47 |
| strings2 | 个人自建工具 |

### Flag

```
DUTCTF{We1c0met0DUTCTF}
```

---

## Summary

Windows 控制台 EXE 纯静态题，`strings` 直接扫出明文 flag，无需动态调试或反混淆。

![Pasted image 20261016155550](../../../../assets/attachments/Pasted%20image%2020261016155550.png)

---

## Initial Recon

### Observed Information

```bash
7z x ./re1.zip
# Extracting archive: ./re1.zip — Everything is Ok
# Size: 90624, Compressed: 49292

file ./re1.exe
# PE32 executable for MS Windows 6.00 (console), Intel i386, 5 sections

strings ./re1.exe | grep -i -E "DUTCTF|flag" | head -20
# DUTCTF{We1c0met0DUTCTF}
# DUTCTF
# flag
# flag get
```


### Decision Reasoning

strings已经直接发现flag，直接提交验证。

---
