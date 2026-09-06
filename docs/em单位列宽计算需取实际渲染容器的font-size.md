---
title: "em单位列宽计算需取实际渲染容器的font-size"
usage_scenario:
    - "动态计算列数时出现1px级布局偏差"
    - "使用em单位进行响应式布局计算结果与实际渲染不符"
    - "因字体大小来源错误导致容器溢出或滚动条异常"
keywords:
    - "em单位"
    - "font-size"
    - "布局计算"
    - "getComputedStyle"
---

计算基于em单位的列宽时，必须使用实际渲染容器（如gridRef.value）的getComputedStyle(fontSize)，而非document.documentElement.fontSize，因为后者可能与组件内实际生效的font-size不一致。（来源：NotationGrid.vue）
