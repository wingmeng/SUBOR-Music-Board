---
title: "ControlBar精简后结构"
usage_scenario:
    - "修改ControlBar组件"
    - "了解当前工具栏结构"
keywords:
    - "ControlBar"
    - "精简"
    - "PLAY"
    - "PAUSE"
    - "STOP"
    - "文字按钮"
---

ControlBar组件已精简，仅保留核心播放控制：调号(KeySignature)、速度(SpeedControl)、播放控制(PlaybackControl含LOOP)。播放控制已从合并的播放/暂停图标按钮拆分为独立的PLAY(蓝)、PAUSE(黄)、STOP(红)三个文字按钮，各自根据playbackState独立禁用。文件操作按钮(OPEN/SAVE/CLEAR)在App.vue左侧栏，INS/OVR指示器在右侧栏。ControlBar不再区分EditMode/PlayMode，所有控件始终显示。
