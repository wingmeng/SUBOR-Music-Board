---
title: "NotationGrid.vue 动态列数响应式改造"
usage_scenario:
    - "音乐记谱网格组件需要适配不同容器宽度时的列数动态计算"
    - "Vue 组件中将固定尺寸常量升级为响应式 ref 并联动更新计算逻辑"
    - "排查因硬编码列数导致的响应式失效问题"
keywords:
    - "动态列数"
    - "响应式布局"
    - "NotationGrid"
---

## 任务描述
将 NotationGrid.vue 中每行固定列数（COLUMNS_PER_ROW = 25）改为根据容器宽度动态计算，实现响应式布局。

## 执行过程
```mermaid
graph TD
    A[需求:动态列数] --> B[分析布局结构：.board宽度36em、.tone宽1em、gap列向5px]
    B --> C[读取Board.vue/NoteColumn.vue/NoteCell.vue确认尺寸来源]
    C --> D[在NotationGrid.vue中移除COLUMNS_PER_ROW常量]
    D --> E[新增COLUMN_GAP_PX和COLUMN_WIDTH_EM常量]
    E --> F[定义columnsPerRow = ref(25)并实现calculateLayout函数]
    F --> G[在calculateLayout中基于container.clientWidth动态计算列数]
    G --> H[替换所有COLUMNS_PER_ROW引用为columnsPerRow.value]
    H --> I[更新ResizeObserver和首次渲染调用为debouncedCalculateLayout]
    I --> J[验证visibleColumns已暴露且编译通过]
```

## 任务总结
成功实现响应式列数：删除固定常量，引入动态 ref columnsPerRow，重构 layout 计算逻辑，公式为 floor((containerWidth + 5) / (1em×fontSize + 5))，全面替换引用并确保编译零错误。
