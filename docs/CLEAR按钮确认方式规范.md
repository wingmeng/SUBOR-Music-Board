---
title: "CLEAR按钮确认方式规范"
usage_scenario: []
keywords:
    - "CLEAR按钮"
    - "自定义dialog"
    - "交互一致性"
    - "防呆设计"
---

CLEAR按钮的二次确认必须使用自定义dialog组件（如ExportDialog风格），禁止使用浏览器原生window.confirm，确保与IMPORT等同类操作的交互体验和视觉样式统一。
