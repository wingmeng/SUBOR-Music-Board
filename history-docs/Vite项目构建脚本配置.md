---
title: "Vite项目构建脚本配置"
usage_scenario: []
keywords:
    - "npm run dev"
    - "npm run build"
    - "npm run preview"
    - "vue-tsc"
    - "vite build"
---

npm scripts构建命令：
- `npm run dev`: 启动Vite开发服务器
- `npm run build`: 先执行`vue-tsc -b`进行TS类型检查，再执行`vite build`构建生产包
- `npm run preview`: 启动本地预览服务
