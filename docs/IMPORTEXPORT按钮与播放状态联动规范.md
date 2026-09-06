---
title: "IMPORT/EXPORT按钮与播放状态联动规范"
usage_scenario: []
keywords:
    - "IMPORT按钮"
    - "EXPORT按钮"
    - "播放停止"
    - "stop"
    - "交互规范"
---

项目交互规范：
- 点击IMPORT按钮时，自动执行stop()操作（停止播放并重置位置至第0列）
- 点击EXPORT按钮时，自动执行stop()操作（停止播放并重置位置至第0列）
- 原因：导出后若仅pause()，状态为'paused'而非'stopped'，会导致CLEAR等依赖stopped状态的按钮被禁用
