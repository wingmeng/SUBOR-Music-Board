---
title: "SUBOR音乐预制文件score格式与时长对齐规范"
usage_scenario: []
keywords:
    - "SUBOR"
    - "score"
    - "时长对齐"
    - "playBandString"
    - "多遍播放"
---

SUBOR Music Board 项目中所有 .subor.json 预制音乐文件的 score 数组必须同时满足格式规范与时长对齐要求：
- 格式规范：三个声部（band1/band2/band3）字符串严格等长，每个字符位置代表一个时间步；空格表示休止符；字母音符（c-g）映射为简谱数字（1-7），支持升降号与高低八度标记（如 #1, b3, 1., 1）；
- 时长对齐规范：score 行数必须完整覆盖 HTML 中 playBandString 的全部播放时长；若 HTML 中多次调用同一乐曲（如 jinglebell.html 中重复播放两遍），则 score 行数须为单遍标准长度的整数倍（例如单遍96行，则两遍需192行），否则将导致乐曲提前中断。
