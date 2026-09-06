---
title: "NotationGrid自适应行数与动态列扩展规范"
usage_scenario: []
keywords:
    - "NotationGrid"
    - "自适应行数"
    - "动态列数"
    - "ResizeObserver"
    - "containerWidth"
    - "fontSize"
---

NotationGrid组件采用容器自适应布局：每行列数由容器宽度动态计算（公式：cols = floor((containerWidth + COLUMN_GAP_PX) / (colWidthPx + COLUMN_GAP_PX))），行数由容器高度动态计算，无固定MIN_ROWS约束。通过ResizeObserver监听容器尺寸变化，配合150ms防抖避免过度计算。乐谱数据通过App.vue的watch监听NotationGrid暴露的visibleColumns，自动调用useNotation的ensureColumns方法扩展以填满可见区域。关键修复：fontSize必须从gridRef元素获取（而非documentElement），因为列宽基于em单位，受.board的font-size:17px影响。.board-scroll设为overflow:hidden避免滚动条产生。
