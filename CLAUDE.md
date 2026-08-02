# SUBOR Music Board - Claude 项目指令

## 项目概述

FC 风格的三声部音乐板应用，使用简谱记谱，支持实时播放和导出。

---

## 核心数据结构

```typescript
type Column = [string, string, string]  // [主旋律, 和弦律, 低频]
type Score = Column[]
```

---

## 技术栈

- Vue 3 + TypeScript
- Vite
