---
title: "PlaybackControl按钮状态驱动显示规范"
usage_scenario:
    - "重构或新增播放控制组件时确定按钮显示逻辑"
    - "排查播放状态切换时按钮异常显示问题"
    - "编写类似状态驱动UI组件（如编辑/预览模式切换）时参考实现模式"
keywords:
    - "PlaybackControl"
    - "按钮显示"
    - "播放状态"
    - "state驱动"
---

PlaybackControl组件中PLAY、PAUSE、STOP按钮根据props.state动态显示：state为'stopped'时仅显示PLAY按钮和禁用的STOP按钮；state不为'stopped'时显示PAUSE按钮和可用的STOP按钮。
