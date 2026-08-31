# 导出 BPM 与调号固定为默认值缺陷修复

## 缺陷现象

点击 SAVE 导出的 `.subor.json` 文件中，`bpm` 字段始终为默认值 90，未反映用户在控制栏实际选择的 BPM。

## 根因

`App.vue` 中调用 `useImportExport()` 时传入的是**原始值**：

```ts
useImportExport({
  bpm: config.speed,        // number 值传递，创建时求值一次 = 90
  keySignature: config.keySignature, // 同理，固定为 'C'
  score: score as Score,
})
```

`config` 虽是 `reactive`，但 `config.speed` 在 composable 创建时被立即求值拷贝进 `options` 闭包，
此后 `exportScore()` 内 `options.bpm` 永远指向初始值 90，与用户后续修改不同步。
调号 `keySignature` 存在完全相同的隐患（切到 D/G/♭B 保存仍写 'C'）。

对照 `usePlayback()` 传的是 `toRef(config, 'speed')`（响应式引用），故播放引擎能拿到最新值。

## 修复方案

与 `usePlayback` 保持一致，改用响应式引用（Ref）模式：

1. `useImportExport.ts`：`UseImportExportOptions.bpm` / `keySignature` 类型改为 `Ref<number>` / `Ref<KeySignature>`，
   `exportScore()` 内读取 `options.bpm.value` / `options.keySignature.value`。
2. `App.vue`：传参改为 `toRef(config, 'speed')` / `toRef(config, 'keySignature')`。

`score` 保持值传递不变——它是 reactive 数组（引用类型），同一 Proxy 对象会被 JSON 正确序列化，
且 `useNotation` 内部就地修改，无需响应式包装。

## 验证

- `vue-tsc -b` 类型检查通过
- `vite build` 生产构建通过

## 备注

- 预设文件（`presets/*.json`）中的 BPM 值各不相同（90/105/120 等），并非全部经由此缺陷路径生成，无需回改。
- `presets/生日快乐歌.subor.json` 缺少 `bpm` 字段，属旧格式，导入时由 `validateData` 兜底为默认值，不在本次修复范围。
