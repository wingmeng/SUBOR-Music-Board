---
title: "CLEAR按钮功能与防呆设计"
usage_scenario: []
keywords:
    - "CLEAR按钮"
    - "二次确认"
    - "防呆设计"
    - "光标重置"
---

项目ControlBar工具栏新增CLEAR按钮，用于一键清空所有音符内容并将鼠标光标重置到初始位置（col=0, voice=0）；采用三重防呆设计：1) 播放中自动禁用按钮；2) 点击后弹出window.confirm二次确认（提示'确定要清空所有内容吗？此操作不可撤销。'）；3) 使用NES.css is-error红色样式标识危险操作。
