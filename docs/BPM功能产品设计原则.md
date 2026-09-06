---
title: "BPM功能产品设计原则"
usage_scenario: []
keywords:
    - "BPM设计"
    - "用户体验"
    - "简谱工具"
    - "认知负担"
---

SUBOR Music Board项目定位为面向大众的FC/8-bit简谱音乐创作工具，强调低门槛和趣味性。BPM功能应保持单一滑块设计，不引入拍号或音符时值等专业概念以避免增加用户认知负担；内部实现需修正为每列对应八分音符（即getNoteInterval() = 30 / BPM），使播放速度符合真实音乐BPM感知。
