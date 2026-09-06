---
title: "board-wrapper三栏布局实践"
usage_scenario:
    - "调整页面整体布局"
    - "修改侧栏结构或样式"
keywords:
    - "board-wrapper"
    - "flex布局"
    - "侧栏"
    - "side-left"
    - "side-right"
    - "ControlBar定位"
---

App.vue使用.board-wrapper（flex容器）包裹左侧栏(.side-left)、Board主体、右侧栏(.side-right)。侧栏通过flex:1自适应宽度，justify-content控制按钮靠Board一侧。Board保持原有margin:50px auto居中定位，高度calc(100vh-100px)。ControlBar仍在Board的#footer slot中，通过flex列布局的board-body实现贴底效果。
