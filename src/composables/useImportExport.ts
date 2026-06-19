import type { Score, KeySignature, ExportData, Column } from '../core/types'
import { DEFAULT_COLUMNS, EXPORT_MIME_TYPE, KEY_SIGNATURES, BPM_LIST } from '../core/types'

export interface UseImportExportOptions {
  /** 当前速度 */
  bpm: number
  /** 当前调号 */
  keySignature: KeySignature
  /** 当前乐谱 */
  score: Score
  /** 导入回调 */
  onImport: (data: { bpm: number; keySignature: KeySignature; score: Score }) => void
}

/**
 * 导入导出功能
 */
export function useImportExport(options: UseImportExportOptions) {
  const { onImport } = options

  /**
   * 导出乐谱为 JSON 文件
   */
  function exportScore(title: string, description: string): void {
    const data: ExportData = {
      version: '1.0',
      title,
      description: description || undefined,
      bpm: options.bpm,
      keySignature: options.keySignature,
      score: options.score,
    }

    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: EXPORT_MIME_TYPE })
    const url = URL.createObjectURL(blob)

    // 清理文件名：移除非法字符
    const safeTitle = title.replace(/[<>:"/\\|?*]/g, '_')

    const a = document.createElement('a')
    a.href = url
    a.download = `${safeTitle}.subor.json`
    a.click()

    URL.revokeObjectURL(url)
  }

  /**
   * 导入乐谱文件
   */
  function importScore(): void {
    const input = document.createElement('input')

    input.type = 'file'
    input.accept = '.json,.subor.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]

      if (!file) {
        return
      }

      try {
        const text = await file.text()
        const data = JSON.parse(text) as ExportData
        // 验证数据格式
        const validated = validateData(data)

        if (validated) {
          onImport(validated)
        }
      } catch (err) {
        console.error('导入失败:', err)
        alert('导入失败：文件格式错误')
      }
    }

    input.click()
  }

  /**
   * 验证导入数据
   */
  function validateData(data: unknown): { bpm: number; keySignature: KeySignature; score: Score } | null {
    if (!data || typeof data !== 'object') {
      return null
    }

    const obj = data as Record<string, unknown>

    // 验证版本
    if (obj.version !== '1.0') {
      console.warn('不支持的版本:', obj.version)
      return null
    }

    // 验证 BPM
    let bpm = 120
    if (typeof obj.bpm === 'number') {
      bpm = BPM_LIST.includes(obj.bpm as any) ? obj.bpm : 120
    }

    // 验证调号
    let keySignature: KeySignature = 'C'
    if (typeof obj.keySignature === 'string' && KEY_SIGNATURES.includes(obj.keySignature as KeySignature)) {
      keySignature = obj.keySignature as KeySignature
    }

    // 验证乐谱
    let score: Score = []
    if (Array.isArray(obj.score)) {
      score = obj.score.map((col: unknown) => {
        if (Array.isArray(col) && col.length === 3) {
          return col.map((note) => {
            if (typeof note === 'string') {
              return note
            }
            return ' '
          }) as Column
        }
        return [' ', ' ', ' ']
      })
    }

    // 如果乐谱为空，创建空白乐谱
    if (score.length === 0) {
      score = Array.from({ length: DEFAULT_COLUMNS }, () => [' ', ' ', ' '] as Column)
    }

    return { bpm, keySignature, score }
  }

  return {
    exportScore,
    importScore,
  }
}
