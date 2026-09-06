---
title: "NotationGrid.vue 实现响应式动态列数"
usage_scenario:
    - "其他网格类组件（如钢琴卷帘、MIDI轨道）需根据容器宽度动态计算列数时"
    - "排查因固定列数导致的响应式失效或溢出问题"
    - "参考 em+px 混合单位下容器宽度到列数的数学转换公式"
keywords:
    - "响应式列数"
    - "动态计算"
    - "NotationGrid"
---

## 任务描述
将 NotationGrid.vue 中固定列数 COLUMNS_PER_ROW=25 改为基于容器宽度动态计算的响应式列数。

## 执行过程
```mermaid
graph TD
    A[需求:动态列数] --> B[分析布局结构：.board width=36em, .tone width=1em, gap=14px 5px]
    B --> C[移除COLUMNS_PER_ROW常量，新增columnsPerRow ref]
    C --> D[重构calculateRows→calculateLayout，集成宽度计算逻辑]
    D --> E[推导公式：cols = floor((containerWidth + COLUMN_GAP_PX) / (colWidthPx + COLUMN_GAP_PX))]
    E --> F[更新dataRows、visibleColumns等所有引用处]
    F --> G[将ResizeObserver绑定从calculateRows升级为calculateLayout]
    G --> H[验证编译通过、逻辑正确、响应式生效]
```

## 任务总结
成功实现响应式列数：删除固定常量，引入 columnsPerRow ref，新增 COLUMN_GAP_PX 和 COLUMN_WIDTH_EM 常量，重构 layout 计算函数，公式精准适配 border-box 容器与 em 单位列宽，支持 .board 宽度变化时自动增减列数。
