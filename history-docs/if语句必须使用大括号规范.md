---
title: "if语句必须使用大括号规范"
usage_scenario:
    - "编写任何条件语句时"
    - "代码审查时检查if语句格式"
    - "重构代码时确保符合规范"
keywords:
    - "if语句"
    - "大括号"
    - "代码规范"
    - "条件语句"
    - "换行"
---

**绝对规范**：if 代码块即使只有1行代码，也必须使用大括号 `{}` 包裹，并且代码要换行书写。

**正确示例**：
```ts
if (condition) {
  doSomething()
}
```

**错误示例**：
```ts
if (condition) doSomething()  // 禁止！
if (condition) { doSomething() }  // 禁止！必须换行
```

此规范适用于所有条件语句（if/else if/else），确保代码可读性和一致性。
