---
title: "音频引擎最终方案：原生 Web Audio API + 预调度（用户确认满意）"
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
    - "Tone.js移除"
---

2026-05-26 重大更新：音频引擎从 Tone.js 完全重写为原生 Web Audio API。用户对最终音色表示满意，音色与 jinglebell.html 一致。

最终方案（精确匹配 jinglebell.html）：
- 创建自己的 AudioContext，完全独立于 Tone.js
- 每个音符创建独立的 OscillatorNode + GainNode
- 方波：gain = 1.0 → linearRampToValueAtTime(1.0, startTime) → linearRampToValueAtTime(0.0, stopTime)
- 三角波：直连 DynamicsCompressor（无 gain 包络，波形自然柔和）
- 三个声部共享 DynamicsCompressorNode 作为主输出（默认参数）
- 预调度模式：一次性计算所有音符的 AudioContext 绝对时间并调度所有 OscillatorNode
- 独立 setInterval 定时器驱动 UI 回调（不受音频调度影响）
- 暂停时记录位置 + stopAll()，恢复时重调度剩余音符

涉及文件：
- src/core/music-engine.ts：完全重写（移除 Tone.js Synth/PolySynth）
- src/core/sequencer.ts：完全重写（移除 Tone.Transport，改用预调度+setInterval）

效果：
- Tone.js 完全移除，JS 包体积从 311 kB 降至 82 kB（-74%）
- 音色与 jinglebell.html 一致，gain 线性淡出避免 click/pop
- 无音符重叠，每个音符独立 OscillatorNode 精确 start()/stop()
