---
title: "subor.json 音乐文件需完整覆盖HTML多遍播放"
usage_scenario: []
keywords:
    - "subor.json"
    - "playBandString"
    - "多遍播放"
    - "score长度"
---

SUBOR Music Board 项目中，.subor.json 文件的 score 数组必须完整对应 HTML 源码中 playBandString 的全部播放时长；若 HTML 中存在多次调用（如 jinglebell.html 中乐曲重复播放两遍），则 score 行数须为单遍长度的整数倍（如 96×2=192 行），否则乐曲将提前中断。
