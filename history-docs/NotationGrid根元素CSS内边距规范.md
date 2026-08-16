---
title: "NotationGrid根元素CSS内边距规范"
usage_scenario:
    - "编写或修改NotationGrid.vue的CSS样式时确定padding和box-sizing取值"
    - "审查样式是否符合视觉间距与布局稳定性要求"
    - "新成员理解组件样式约束时快速掌握关键CSS规则"
keywords:
    - "padding"
    - "box-sizing"
    - "CSS规范"
    - "内边距"
---

NotationGrid组件根元素必须使用padding: 1em实现四向均匀内边距，并显式声明box-sizing: border-box，确保padding不增加元素总尺寸，维持原有布局约束。
