---
title: "Bugku CTF - mobile2"
description: "APK 内 AndroidManifest 二进制 XML 隐写，strings -e l 直接提取 flag 片段。"
date: 2026-10-15
author: "AlbusPhos"
category: "Mobile"
subcategory: "APK逆向"
tags: ["android", "manifest-stego", "strings"]
difficulty: "Easy"
my_difficulty: "Easy"
event: "Bugku CTF"
cve: []
vuln_type: []
technique: ["manifest-analysis", "strings-utf16le"]
---


## Meta Info

[Bugku CTF - mobile2](https://ctf.bugku.com/challenges/detail/id/138.html)

### Challenge Statement

题面仅提供附件下载，无额外文字描述。

### Attachments

| Filename | Size | Type | SHA256 | Notes |
| ------------- | ---------- | --------------- | ------------------ | -------------------- |
| file.zip | 1.1MB  | Android package (APK) | `dca6319f0dc9bae8dc3a221207ff4674bc06f06c47b70d847fe4b6791dc85ecd` | 外层压缩包，解压得 `file/` 目录 |
| file/AndroidManifest.xml | 3.1KB  | Android binary XML | `fb23f8d252eb07fb6b39c15bda91c17e8c5ce67aa1dd696bb30da306b982f484` | 二进制 XML，非明文 |

解压结构（`tree file`）：

```text
file/
├── AndroidManifest.xml   # 二进制 XML，本题隐写点
├── classes.dex
├── META-INF/
├── res/
└── assets/
```

### Environment

| Tool/Component | Version |
| -------------------- | --------------------------- |
| OS | Kali / Ubuntu 22.04 |
| file | 5.45 |
| binutils strings | 2.40+，需支持 `-e l` |
| Text editor | 任意支持 `utf-16le` 打开的编辑器 |

### Flag

```
flag{8d6efd232c63b7d2}
```

---

## Summary

APK 的 `AndroidManifest.xml` 为二进制 XML，flag 片段藏在 `intent-filter/action` 节点值中。用 `strings -e l` 按 `utf-16le` 解码即见 `android.intent.action.fl4g` 与 `8d6efd232c63b7d2`，拼接提交即可，无需反编译 `classes.dex`。

---

## Initial Recon

### Observed Information

```bash
file file.zip file/AndroidManifest.xml
# file.zip:                 Android package (APK), with MANIFEST.MF and drawables Java archive data (JAR)
# file/AndroidManifest.xml: Android binary XML

ls -lh file.zip file/AndroidManifest.xml
# file.zip: 1.1M, file/AndroidManifest.xml: 3.1K
```

- 包结构含 `classes.dex` / `res/` / `META-INF/` / `assets/`，标准未加固 APK，无 `so` 加固迹象。
- `AndroidManifest.xml` 不是明文 XML，`cat` 直接打开为乱码；默认编码下 `strings` 几乎无输出。

### Decision Reasoning

基于以上信息的方向判断：

- `AndroidManifest.xml` 被 `file` 判定为二进制 XML 而非明文，且 `cat` 可见乱码 → 优先按二进制 XML / UTF-16LE 编码处理，而不是当作普通文本或直接反编译。
- 包结构标准、无加固迹象，隐写点更可能在资源清单而非代码逻辑 → 先对 manifest 做低成本的字符串提取，暂缓对 `classes.dex` 的反编译，只有 manifest 无收获时才回头看 dex。

---

## Workflow

### Step 1: 确认 manifest 编码并提取可疑串

先列出压缩包内容确认结构，再分别用默认编码和 `utf-16le` 对 manifest 跑 `strings`，对比验证编码假设：

```bash
unzip -l file.zip
strings ./file/AndroidManifest.xml | head -20
strings ./file/AndroidManifest.xml -e l
```

默认编码下几乎得不到可读串，而 `-e l` 立刻输出完整的 manifest 字符串表，末尾出现关键两行：

```text
versionCode
versionName
minSdkVersion
targetSdkVersion
name
allowBackup
icon
label
theme
screenOrientation
android
*http://schemas.android.com/apk/res/android
package
manifest
com.example.mmsheniq
uses-sdk
uses-permission
android.permission.SEND_SMS
'android.permission.ACCESS_NETWORK_STATE
 android.permission.READ_CONTACTS
!android.permission.WRITE_CONTACTS
application
activity
!com.example.mmsheniq.MainActivity
%com.example.mmsheniq.RegisterActivity
.WelcomeActivity
intent-filter
action
android.intent.action.fl4g
8d6efd232c63b7d2
```

> 最后两行即隐写点：`action = android.intent.action.fl4g`，下一串为 flag 片段。这说明 manifest 藏串假设成立，`classes.dex` 无需再看，下一步用 `grep -A1 fl4g` 精确定位并拼接验证。

---

### Step 2: 拼接并验证 flag

将上一步得到的片段按 `flag{...}` 格式拼接后提交：

```
flag{8d6efd232c63b7d2}
```

平台提交判定通过。


---

## Links

- [Bugku CTF — mobile2(gctf)](https://ctf.bugku.com/challenges/detail/id/138.html)
