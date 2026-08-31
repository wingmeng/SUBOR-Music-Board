# AGENTS.md

本文件为 **AI 代理**（以及人类协作者）提供在本仓库工作的约定与上下文。面向用户的项目文档请参阅 [README.md](./README.md)（中文）与 [README_EN.md](./README_EN.md)（英文）。

## 项目简介

SUBOR Music Board（小霸王音乐板）是基于 **Vue 3 + TypeScript + Vite** 的 FC / 8-bit 风格**三声部简谱**音乐创作工具。浏览器端借助 **Web Audio API** 实时合成方波与三角波音色，所有声音由代码生成，不依赖任何外部音频文件。

- 三声部：主旋律（方波）/ 和弦律（方波）/ 低频（三角波），每列对应一个节拍。
- 记谱方式：简谱（numbered notation），一个音对应一个字符（格子），时值变化靠延音线 `-` 延长（简化模型，非严格乐理网格）。
- 导出格式：`.subor.json`。

## 环境与常用命令

- **Node.js 20+**
- 安装与运行：

  ```bash
  pnpm install
  pnpm dev       # 开发服务器，默认 http://localhost:5173
  pnpm build     # vue-tsc 类型检查 + 生产构建，输出 dist/
  pnpm preview   # 预览生产构建
  ```

- **无自动化测试框架**（无 vitest / jest）。建议为 `core/` 补单元测试，并在 CI 中接入 `pnpm build` 作为类型与构建门禁。

## 代码约定

- Vue 3 `<script setup>` 组合式 API + TypeScript（严格模式）。
- 架构分层（见下）：`components` → `composables` → `core`，通过 `types.ts` 保持契约稳定，音频后端可替换 / 扩展。
- 提交信息采用 Conventional Commits（`feat:` / `fix:` / `docs:` 等）。
- 涉及记谱语法、声部、速度 / 调号等**核心契约**的修改，必须同步更新 `src/core/types.ts` 与相关映射，并在 `wiki/`、`history-docs/` 补充记录。
- 严格保留原始字符顺序，禁止自动添加空格、下划线、填充或对齐。

## 重要不变量与陷阱

- **速度与调号仅支持预定义集合**：新增速度档位或调号时，必须同时修改 `types.ts`（常量）与 `note-map.ts`（MIDI 映射表），否则音符无法正确发声。
- **简化记谱模型**：一个音 = 一个字符，时值靠延音线 `-` 延长，无"四分音符=2格"式乐理换算；BPM 为**每格**的速度档位，调 BPM 匹配整曲速度。每列三声部共享同一节拍。
- **播放过程中禁用网格编辑**。
- 修饰符 `#` `b` `,` `.` 须先输入、再输入数字才生效；可重复输入，后者覆盖前者。
- 调号仅 `C / D / F / G / ♭B` 五个大调：`types.ts` 的 `KEY_SIGNATURES` 与 `note-map.ts` 的 `KEY_NOTE_MAP` 必须保持一致。修改调号相关代码或文案前请先核对 `types.ts`。
- 实时变速 / 变调在播放中可用，由 `sequencer` 的 `requestPlaybackRestart()` 实现：立即 `stopAll()` 丢弃所有声，120ms 防抖后从当前指示器列整体重排（详见 `history-docs/播放中实时调号变速改为丢弃重排.md`）。`music-engine.ts` 的 `stopFrom` 已无调用方，仅作保留工具。
- **撤销 / 重做（2026-08-31 新增）**：所有内容修改入口（`setNote` / `clearNote` / `insertNoteAt` / `backspaceAt` / `resetScore` / `loadScore`）在修改前记录快照（深拷贝 score + 光标，栈深 100）；`moveCursor` 纯列扩展与 `syncColumns` 列对齐**不进历史**。快捷键 `Ctrl/Cmd+Z`（撤销）、`Ctrl/Cmd+Shift+Z` / `Ctrl/Cmd+Y`（重做）在 `App.vue` 的 `onGlobalKeydown` 处理，播放中与对话框打开时禁用。改动撤销相关代码请核对 `useNotation.ts` 与 `NotationGrid.vue` 的 `cancelPendingInput`（详见 `history-docs/撤销重做功能实现规范.md`）。

## 项目目录结构

```
SUBOR-Music-Board/
├── src/
│   ├── assets/              # 静态资源（svg / png）
│   ├── components/          # Vue 视图组件
│   │   ├── Board.vue            # 主面板容器
│   │   ├── NotationGrid.vue     # 记谱网格（响应式布局）
│   │   ├── NoteColumn.vue / NoteCell.vue   # 单列 / 单元格
│   │   ├── ControlBar.vue       # 底部控制栏
│   │   ├── KeySignature.vue / SpeedControl.vue / PlaybackControl.vue
│   │   ├── ExportDialog.vue / ClearDialog.vue / HelpDialog.vue
│   │   └── Quill.vue / InkBottle.vue        # 装饰动效（羽毛笔 / 墨瓶）
│   ├── composables/         # 组合式业务逻辑
│   │   ├── useNotation.ts       # 记谱编辑
│   │   ├── usePlayback.ts       # 播放控制
│   │   ├── useImportExport.ts   # 导入 / 导出
│   │   └── useQuill.ts          # 羽毛笔动效状态
│   ├── core/                # 核心引擎与类型
│   │   ├── types.ts            # 类型与常量定义
│   │   ├── note-map.ts         # 简谱 → MIDI 映射
│   │   ├── music-engine.ts     # Web Audio 合成引擎（单例）
│   │   └── sequencer.ts        # 播放调度（预调度模式）
│   ├── App.vue / main.ts / style.css / env.d.ts   # 根组件与入口
├── presets/                 # 预设乐谱（.subor.json）
├── public/                  # 公共静态资源（favicon 等）
├── demos/                   # 示例 / 演示页面
├── wiki/                    # 自动生成的架构与参考文档
├── history-docs/            # 开发历史与决策记录
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig*.json
├── LICENSE                  # MIT 许可证
└── pnpm-lock.yaml
```

**架构分层**：视图层（`components`）→ 组合式逻辑（`composables`）→ 核心引擎（`core`），通过类型定义（`types.ts`）保持契约稳定，便于替换或扩展音频后端。

## 文档导航

- 用户文档：[README.md](./README.md)（中文）/ [README_EN.md](./README_EN.md)（英文）
- 架构与参考：`wiki/`
- 开发历史与决策：`history-docs/`
- 本文件：`AGENTS.md`（代理与协作者约定）
