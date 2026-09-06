---
title: "ControlBar精简与三栏布局重构"
usage_scenario: []
keywords:
    - "ControlBar"
    - "三栏布局"
    - "App.vue"
---

## 任务描述
重构 ControlBar 组件及全局布局，解决工具栏臃肿问题，实现左-中-右三栏分离式设计。

## 执行过程
```mermaid
graph TD
    A[需求:精简ControlBar+三栏布局] --> B[读取ControlBar.vue/Board.vue/App.vue]
    B --> C[分析现有结构与事件流]
    C --> D[精简ControlBar：移除OPEN/SAVE/CLEAR按钮及emit]
    D --> E[清理Board.vue：移除mode-badge及相关props/emit]
    E --> F[重构App.vue：新增.board-wrapper flex容器]
    F --> G[左侧栏：纵向排列OPEN/SAVE/CLEAR，播放时禁用]
    G --> H[右侧栏：帮助图标+INS/OVR徽章，播放时隐藏徽章]
    H --> I[中央栏：纯净Board + 精简ControlBar]
    I --> J[添加showHelp函数占位]
    J --> K[TypeScript编译验证+Vite启动+截图确认布局]
```

## 任务总结
成功实现三栏分离布局：ControlBar仅保留KeySignature/SpeedControl/PlaybackControl/LOOP；Board成为无状态容器；App.vue通过flex布局将OPEN/SAVE/CLEAR置于左侧、help+INS/OVR置于右侧，所有事件emit机制和响应式状态保持不变。
