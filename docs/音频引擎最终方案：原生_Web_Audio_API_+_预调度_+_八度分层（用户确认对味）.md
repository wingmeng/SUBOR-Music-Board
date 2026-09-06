---
title: "音频引擎最终方案：原生 Web Audio API + 预调度 + 八度分层（用户确认对味）"
usage_scenario:
    - "需要了解音频播放实现方案时"
    - "排查音频相关问题时"
    - "查看项目技术架构变更记录时"
keywords:
    - "音频引擎"
    - "Web Audio API"
    - "OscillatorNode"
    - "GainNode"
    - "DynamicsCompressor"
    - "方波"
    - "三角波"
    - "jinglebell"
    - "预调度"
    - "八度缩放"
    - "音域分层"
    - "Tone.js移除"
---

阶段性节点：音频引擎从 Tone.js 完全重写为原生 Web Audio API，经多次迭代后音色获得用户确认"对味了"。

最终方案（完全匹配 jinglebell.html）：
1. 创建自己的 AudioContext，完全独立于 Tone.js
2. 每个音符创建独立的 OscillatorNode + GainNode
3. 方波：gain = 1.0 → linearRampToValueAtTime(1.0, startTime) → linearRampToValueAtTime(0.0, stopTime)
4. 三角波：通过 GainNode 做 1ms attack + 3ms fade-out 消除边界 Click
5. 三个声部共享 DynamicsCompressorNode 作为主输出（默认参数）
6. 三声部八度缩放因子：voice 0 (主旋律/方波)=×2, voice 1 (和弦律/方波)=×1, voice 2 (低频/三角波)=×0.5
7. 预调度模式：一次性计算所有音符的 AudioContext 绝对时间并调度所有 OscillatorNode
8. 独立 setInterval 定时器驱动 UI 回调（不受音频调度影响）
9. 暂停时记录位置 + stopAll()，恢复时重调度剩余音符
10. 支持播放中动态切换 BPM（stopFrom 选择性停止未来音符）

涉及文件：
- src/core/music-engine.ts：完全重写
- src/core/sequencer.ts：完全重写
- src/core/note-map.ts：未改动

效果：
- Tone.js 完全移除，JS 包体积从 311 kB 降至 82 kB（-74%）
- 音色与 jinglebell.html 一致
- 三声部分布在高、中、低三个音域，层次分明
- 无音符重叠，gain 线性淡出避免 click/pop
