---
title: "破坏性操作统一使用自定义dialog组件"
usage_scenario: []
keywords:
    - "dialog组件"
    - "window.confirm"
    - "UI一致性"
    - "破坏性操作"
---

## 决策场景
替换原生 window.confirm 为自定义 dialog 组件

## 决策内容
所有破坏性操作（如 CLEAR、IMPORT）必须统一使用 <dialog> 元素实现的 Vue 组件，禁用浏览器原生 confirm()

## 适用范围
SUBOR-Music-Board 项目中所有需用户二次确认的交互点（如清空、导入、导出、重置、删除）
