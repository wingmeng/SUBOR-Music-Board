---
title: "Vue 3 中 <dialog> 应避免 :open 绑定，改用 v-if"
usage_scenario: []
keywords:
    - "Vue 3"
    - "dialog"
    - "v-if"
    - ":open"
---

Vue 3 中对原生 `<dialog>` 元素使用 `:open="visible"` 进行布尔属性绑定，在 visible 从 true → false 切换时，虚拟 DOM diff 可能无法正确同步原生 dialog 的 open 状态，导致 dialog 残留交互层或不可见但阻塞点击。应改用 `v-if="visible"` 控制元素挂载，并在 template 中静态写入 `open` 属性。（来源：Vue DOM 渲染机制）
