---
title: "Bugku CTF - 树木的小秘密"
description: "PyInstaller 打包的 Windows 逆向题，解包提取 pyc 反编译后得 base64，解码即 flag。"
date: 2026-10-16
author: "AlbusPhos"
category: "Reverse"
subcategory: "PyInstaller Unpacking"
tags: ["pyinstaller", "pyc", "base64"]
difficulty: "Easy"
my_difficulty: "Easy"
event: "Bugku CTF"
points: 15
solves: 2000
first_blood: false
cve: []
vuln_type: []
technique: ["pyinstaller-unpacking", "pyc-decompilation"]
---

## Meta Info

[Bugku CTF - 树木的小秘密](https://ctf.bugku.com/challenges/detail/id/355.html)

### Challenge Statement

> 题目名称：树木的小秘密。题面描述仅为 `flag{}`。

### Attachments

| Filename | Size | Type | SHA256 | Notes |
| ------------- | ---------- | --------------- | ------------------ | -------------------- |
| easy_reverse.zip | 4973912 B | Zip archive (deflate, uncompressed 5120989) | `a1285b4b0f003aad02ede273e033c046fa62a4e893cce73aa1641c76143e4884` | 解压得到 `easy_reverse.exe` |
| easy_reverse.exe | 5120989 B | PE32+ x86-64 console, 7 sections | `e9e6af2fdb4a27fa6d680c8529ca5144c1b3d04924b0ede92d36ee25489cf546` | DiE 识别 Linker Microsoft Linker 14.29.30138 / VS 2019 16.11 / PyInstaller |

### Environment

| Tool/Component | Version |
| -------------------- | --------------------------- |
| OS | Kali GNU/Linux Rolling x86_64 |
| 7-Zip | 26.03 (x64, 2026-09-03) |
| DiE (`diec`) | 3.21 |
| Python | 3.14.7 |
| strings2 | 个人自建工具 |

解包与反编译用到的 `pyinstxtractor.py`、`uncompyle6` 在工作流正文中以命令形式记录，版本号未知故不在此表编造（见 `.Environment.md` 约定）。

### Flag

```
flag{my_name_is_shumu}
```

---

## Summary

PyInstaller 打包的 64 位 Windows 程序，逻辑只做一件事：读入用户输入并与常量 `705778` 比较，相等则 base64 解码内置字符串输出 flag。用 `pyinstxtractor` 解包拿到 `123.pyc`，`uncompyle6` 反编译得源码与 base64 常量，解码即得 flag。

---

## Initial Recon

### Observed Information

```bash
7z x ./easy_reverse.zip
# Size: 5120989, Compressed: 4973912, Everything is Ok

diec ./easy_reverse.exe
# PE64
# Linker: Microsoft Linker(14.29.30138)
# Compiler: Microsoft Visual C/C++(19.29.30138)[C]
# Tool: Microsoft Visual Studio(2019, 16.11)
# Packer: PyInstaller

strings2 ./easy_reverse.exe | tail -n 100
# Py_Initialize / Failed to get address for Py_Initialize（PyInstaller 打包特征）
# 未见明文 flag，仅见 manifest、UUID、运行时字符串等噪声
```

### Decision Reasoning

基于以上信息的方向判断：

- `diec` 已明确报 `Packer: PyInstaller`，且字符串中出现 `Py_Initialize` 特征 → 排除直接对 PE 做静态 patch / 汇编跟逻辑的路线，优先走 Python 解包路线。

---

## Workflow

### Step 1: 用 pyinstxtractor 解包，定位入口 pyc

直接对 exe 跑解包脚本，输出明确提示入口点为 `123.pyc`：

```bash
py /home/zz/Application/_py_/pyinstxtractor.py ./easy_reverse.exe
# [+] Processing ./easy_reverse.exe
# [+] Pyinstaller version: 2.1+
# [+] Python version: 3.7
# [+] Length of package: 4871133 bytes
# [+] Found 24 files in CArchive
# [+] Possible entry point: 123.pyc
# [+] Successfully extracted pyinstaller archive: ./easy_reverse.exe
```

解包产物确认：

```bash
tree
# .
# ├── easy_reverse.exe
# ├── easy_reverse.exe_extracted
# │   ├── 123.pyc
# │   ├── base_library.zip
# │   ├── python37.dll
# │   ├── PYZ-00.pyz (+ PYZ-00.pyz_extracted)
# │   └── ...
# └── easy_reverse.zip
```

> 打包版本为 Pyinstaller 2.1+、目标 Python 3.7，入口脚本就是 `123.pyc`，后续只反编译这一个文件即可。

---

### Step 2: 反编译 123.pyc，还原比对逻辑

```bash
uncompyle6 easy_reverse.exe_extracted/123.pyc
```

得到完整源码（仅整理缩进，原语义不变）：

```python
# uncompyle6 version 3.9.3
# Python bytecode version base 3.7.0 (3394)
# Embedded file name: 123.py
import base64, time, sys
a = 705778
b = input("Please input your flag:")
c = "ZmxhZ3tteV9uYW1lX2lzX3NodW11fQ=="
if str(a) == b:
    m = base64.b64decode(c)
    print("this is your flag:" + str(m))
    time.sleep(1)
    sys.exit()
else:
    print("error")
    time.sleep(1)
    sys.exit()
```

逻辑一目了然：程序把输入与 `str(705778)` 做字符串比较，相等才解码输出；真正的 flag 藏在 base64 常量 `c` 里，根本不需要满足输入条件去跑程序。

---

### Step 3: base64 解码拿 flag

```bash
base64 -d <<< "ZmxhZ3tteV9uYW1lX2lzX3NodW11fQ=="
# flag{my_name_is_shumu}
```

输出与题面 `flag{}` 格式吻合，提交通过。



---

## Links

- [Bugku CTF — 树木的小秘密](https://ctf.bugku.com/challenges/detail/id/355.html)
