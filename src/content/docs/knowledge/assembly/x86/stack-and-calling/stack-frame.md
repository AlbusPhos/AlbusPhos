---
title: "栈帧与函数生命周期"
description: "CALL/RET、序言与尾声、ENTER/LEAVE、局部变量分配、递归调用与返回地址布局。"
status: seedling
updated: 2026-10-20
pagefind: false
sidebar:
  order: 153
  hidden: true
---

本文为占位页，待补充。

## 计划覆盖

- CALL 压入返回地址、RET 弹出
- push rbp; mov rbp, rsp; sub rsp, N
- leave 与 mov rsp, rbp; pop rbp
- 局部变量与 [rbp-offset]
- 递归函数的栈帧
