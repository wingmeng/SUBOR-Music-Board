---
title: "羽毛笔docked动画实现规范"
usage_scenario: []
keywords:
    - "dipInk动画"
    - "羽毛笔docked"
    - "CSS animation"
---

羽毛笔在docked状态（播放模式）下必须执行蘸墨动画，严格参照`./demos/笔动画.html`中的`dipInk`动画效果：使用CSS animation（非transition），包含rotate(0deg)垂直插入、animation-fill-mode: forwards保持最终状态，并禁用transition干扰。
