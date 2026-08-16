---
title: "音频引擎重写：Tone.js → 原生 Web Audio API"
usage_scenario:
    - "需要了解音频播放实现方案时"
    - "排查音频相关问题（重叠、杂音、音质）时"
    - "查看项目技术架构变更记录时"
keywords:
    - "音频引擎"
    - "Web Audio API"
    - "OscillatorNode"
    - "GainNode"
    - "DynamicsCompressor"
    - "方波"
    - "三角波"
    - "音乐播放"
---

2026-05-26 重大更新：音频引擎从 Tone.js Synth/ADSR 包络系统重写为原生 Web Audio API（OscillatorNode + GainNode + DynamicsCompressor）。

核心改动：
- 移除 Tone.PolySynth / Tone.Synth，每个音符创建独立的 OscillatorNode
- 方波通过 GainNode 做 linearRampToValueAtTime(0) 平滑淡出，三角波直连
- 三个声部共享 DynamicsCompressorNode（threshold=-24dB, ratio=12:1）作为主输出
- 每个音符精确 start()/stop() 控制，从根源上消除音符重叠

涉及文件：
- src/core/music-engine.ts：完全重写
- src/core/sequencer.ts：微调类型适配

参考来源：https://github.com/BenzLeung/web-audio-api-demo jinglebell.html

用户对重写后的音色表示满意。
