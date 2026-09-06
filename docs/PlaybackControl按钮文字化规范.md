---
title: "PlaybackControl按钮文字化规范"
usage_scenario:
    - "重构或新增播放控制组件时确定按钮文案和样式"
    - "审查UI一致性时核对按钮是否符合文字化规范"
    - "维护PlaybackControl.vue时保持按钮行为与状态逻辑匹配"
keywords:
    - "PlaybackControl"
    - "PLAY"
    - "PAUSE"
    - "STOP"
    - "文字按钮"
---

PlaybackControl组件中的播放、暂停、停止按钮统一使用大写英文文字标识：PLAY（蓝色）、PAUSE（黄色）、STOP（红色），禁用状态根据当前播放状态动态控制。
