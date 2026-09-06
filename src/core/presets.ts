import type { ExportData, KeySignature, Score } from './types'
import { DEFAULT_BPM, BPM_LIST, KEY_SIGNATURES } from './types'

/** 内置乐谱（曲库条目） */
export interface PresetSong {
  /** 唯一标识（文件名去掉 .subor.json），如 twinkle-star */
  id: string
  /** 曲名，取自 JSON 的 title 字段 */
  title: string
  /** 简介，取自 JSON 的 description 字段 */
  description: string
  /** 速度档位，取自 JSON 的 bpm 字段 */
  bpm: number
  /** 调号，取自 JSON 的 keySignature 字段 */
  keySignature: KeySignature
  /** 乐谱数据（三声部列数组） */
  score: Score
}

/**
 * 构建期静态收集 presets/ 目录下所有乐谱。
 *
 * 用 eager 模式直接内联进 bundle（7 首约 23KB，gzip 后数 KB），
 * 好处是线上用户无需下载仓库即可使用，且不依赖任何网络请求。
 * 新增乐谱只需把 .subor.json 丢进 presets/，无需改任何清单。
 */
const modules = import.meta.glob<ExportData>('../../presets/*.subor.json', {
  eager: true,
  import: 'default',
})

/** 从 Vite glob 的虚拟路径中取出文件名（不含目录与扩展名）作为 id */
function toId(path: string): string {
  const file = path.slice(path.lastIndexOf('/') + 1)
  return file.replace(/\.subor\.json$/, '')
}

/** 内置曲库列表，按文件名升序排列（稳定、可复现） */
export const PRESET_LIST: PresetSong[] = Object.entries(modules)
  .map(([path, data]) => ({
    id: toId(path),
    title: data.title ?? toId(path),
    description: data.description ?? '',
    // 兜底：JSON 缺字段时回落到默认值，与 useImportExport.validateData 行为一致
    bpm: BPM_LIST.includes(data.bpm as (typeof BPM_LIST)[number]) ? data.bpm : DEFAULT_BPM,
    keySignature: KEY_SIGNATURES.includes(data.keySignature as KeySignature)
      ? (data.keySignature as KeySignature)
      : KEY_SIGNATURES[0],
    score: (data.score ?? []) as Score,
  }))
  .sort((a, b) => a.id.localeCompare(b.id))
