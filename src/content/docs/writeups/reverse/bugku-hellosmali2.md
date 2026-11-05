---
title: "Bugku CTF - HelloSmali2"
description: "Smali 手写 Base64 变表题，从 challenge.smali 提取魔改字母表，转码解出 flag。"
date: 2026-10-16
author: "AlbusPhos"
category: "Reverse"
subcategory: "Android Smali"
tags: ["smali", "base64", "android"]
difficulty: "Easy"
my_difficulty: "Easy"
event: "Bugku CTF"
points: 30
solves: 924
first_blood: false
cve: []
vuln_type: []
technique: ["smali-analysis", "custom-base64-decoding"]
---

## Meta Info

[Bugku CTF - HelloSmali2](https://ctf.bugku.com/challenges/detail/id/140.html)

### Challenge Statement

> 你知道 smali 吗？分析 Smali 文件，可以得知这是一个修改过的 Base64 算法，Base64 编码的字符串被修改过。通过编写算法或使用解码工具可以得出 Flag。提示：`XMAN{}`（实际提交为 `flag{...}` 形态，见 Flag 节）。

### Attachments

| Filename | Size | Type | SHA256 | Notes |
| ------------- | ---------- | --------------- | ------------------ | -------------------- |
| HelloSmali2.zip | 1458 B | Zip archive (deflate, uncompressed 6266) | `50e6134f1f0a5793ff695b2fb130b10bee0a2e28f31aced617accfb576fcae0f` | 解压得到 `challenge.smali` |
| challenge.smali | 6266 B | smali（Android DEX 反汇编文本） | `0af1faff9664b7e662df514ea22ca58a5b02c479c56e096f7897172cb84eecb7` | 类 `Lcom/example/hellosmali/hellosmali/Digest;`，含魔改 Base64 字母表与目标密文 |

### Environment

| Tool/Component | Version |
| -------------------- | --------------------------- |
| OS | Kali GNU/Linux Rolling x86_64 |
| 7-Zip | 26.03 (x64, 2026-09-03) |
| Python | 3.14.7 |
| strings2 | 个人自建工具 |
| jadx | 1.5.6 |
| SRK Toolbox | 10.21.0 |

### Flag

```
flag{eM_5m4Li_i4_Ea5y}
```

---

## Summary

单个 `challenge.smali` 文件题：`Digest.check()` 把输入按 8bit 二进制流重切 6bit，用魔改字母表做 Base64 式编码，再按 `len % 3` 补 `!` / `!?` 代替标准 `=` 填充，最后与硬编码密文 `xsZDluYYreJDyrpDpucZCo!?` 比对。用 `strings2` 一眼提取字母表与密文，把魔改表映射回标准表转码并补回 `=` 填充，解码即得 flag。

---

## Initial Recon

### Observed Information

```bash
7z x ./HelloSmali2.zip
# Size: 6266, Compressed: 1458, Everything is Ok

7z l ./HelloSmali2.zip
# challenge.smali (6266 -> 1294)

strings2 ./challenge.smali
# .class public Lcom/example/hellosmali/hellosmali/Digest;
# const-string v6, "+/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
# const-string v12, "xsZDluYYreJDyrpDpucZCo!?"
```

- 附件只有一个 6KB 的 smali 文本，无 APK、无 dex，`strings2` 直接可读。
- 两个关键字符串一次扫出：疑似 Base64 字母表（顺序明显被打乱：`+/` 开头，大小写倒置），以及疑似目标密文（尾部 `!?` 不是标准 Base64 字符）。
- 全文件 284 行、`check(String)Z` 单方法，无混淆、无反调试，静态可读。


---

## Workflow

### Step 1: 精读 check()，确认魔改 Base64 语义

![Pasted image 20261016180831](<../../../../assets/attachments/Pasted%20image%2020261016180831.png>)

smali 核心逻辑（`challenge.smali:17-240`）分四段，与标准 Base64 一一对应：

1. 输入转 `char[]`，逐字符 `Integer.toBinaryString` 并左补 `0` 到 8bit，拼成二进制长串（`:goto_0` / `:goto_1`）。
2. 二进制串按 6bit 切分，`parseInt(bin, 2)` 得索引，用魔改字母表 `v6` 取字（`:goto_3`）。
3. 按输入长度 `len % 3` 补位：余 1 补 `!?`（`:cond_5`），余 2 补 `!`，整除不补——对应标准 Base64 的 `==` / `=` / 无填充。
4. 与硬编码 `xsZDluYYreJDyrpDpucZCo!?` 比较，相等返回 true（`:cond_4`）。

字母表对照：

```text
标准：ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/
魔改：+/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789
```

> 编码流程除字母表换位、填充符换成 `!`/`?` 外与标准 Base64 完全一致，解码只需做逆映射，无需模拟 Dalvik 字节码。


---

### Step 2: 字母表转码 + 标准解码

解码规则：魔改表第 i 个字符 ↔ 标准表第 i 个字符；尾部 `!`/`?` 按个数补回 `=`：

```python
import base64
STD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
CUS = '+/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
ct = 'xsZDluYYreJDyrpDpucZCo!?'
body = ct.rstrip('!?')
std = body.translate(str.maketrans(CUS, STD)) + '=' * (len(ct) - len(body))
print(base64.b64decode(std).decode())
# eM_5m4Li_i4_Ea5y
```

```
$ python3 decode.py
eM_5m4Li_i4_Ea5y
```

解出内层为 `eM_5m4Li_i4_Ea5y`，套上题目要求的 `flag{}` 外壳即 `flag{eM_5m4Li_i4_Ea5y}`，提交通过。

用 SRK_Toolbox 自定义字符表功能做二次验证，结果一致：

![SRK_Toolbox 自定义字符表解码](<../../../../assets/attachments/HelloSmali2-srk-toolbox.png>)

> 两条独立路径（手写转码脚本、工具自定义字符表）解出同一明文，形成交叉验证，解题结束。

---

### Complete Script

```python
#!/usr/bin/env python3
import base64

STD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
CUS = '+/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

def decode_custom(ct: str) -> str:
    body = ct.rstrip('!?')
    std = body.translate(str.maketrans(CUS, STD)) + '=' * (len(ct) - len(body))
    return base64.b64decode(std).decode()

if __name__ == '__main__':
    inner = decode_custom('xsZDluYYreJDyrpDpucZCo!?')
    print('flag{' + inner + '}')
```

#### Execution Result

```
$ python3 decode.py
flag{eM_5m4Li_i4_Ea5y}
```

---

## Links

- [Bugku CTF — HelloSmali2](https://ctf.bugku.com/challenges/detail/id/140.html)
