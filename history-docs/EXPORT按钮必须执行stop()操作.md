---
title: "EXPORT按钮必须执行stop()操作"
usage_scenario: []
keywords:
    - "EXPORT按钮"
    - "stop"
    - "播放状态"
    - "CLEAR按钮"
---

EXPORT按钮点击时应执行stop()操作（停止播放并重置位置至第0列），而非pause()，以确保导出后播放状态为'stopped'，保障CLEAR等依赖该状态的按钮正常可用。
