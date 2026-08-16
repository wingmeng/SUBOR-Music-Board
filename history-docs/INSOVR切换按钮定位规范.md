---
title: "INS/OVR切换按钮定位规范"
usage_scenario:
    - "修改INS/OVR徽章样式或位置"
    - "调整右侧栏布局"
keywords:
    - "INS/OVR"
    - "mode-badge"
    - "右侧栏"
    - "App.vue"
    - "side-right"
---

INS/OVR切换按钮已从Board组件内部移至App.vue右侧栏（.side-right），作为.side-col的一部分纵向排列。帮助图标在上方，INS/OVR徽章在下方。播放中通过v-show隐藏INS/OVR徽章。样式定义在App.vue的scoped style中（.mode-badge类），保持原有的绿色(#9fc)/橙色(#fc9)配色和交互效果。
