---
title: "pnpm依赖配置与版本锁定"
usage_scenario: []
keywords:
    - "pnpm-lock.yaml"
    - "vue-tsc"
    - "@vitejs/plugin-vue"
    - "typescript 6.0.2"
    - "vite 8.0.12"
---

依赖管理：
- 生产依赖：`vue@^3.5.34`、`nes.css@^2.3.0`、`@fontsource/press-start-2p@^5.2.7`
- 开发依赖：`typescript@~6.0.2`、`vite@^8.0.12`、`@vitejs/plugin-vue@^6.0.6`、`vue-tsc@^3.2.8`
- 锁定版本：pnpm-lock.yaml精确锁定各依赖及子依赖版本与平台适配二进制包
