import { reactive, readonly } from 'vue'
import type { Score, Column, CursorPosition, VoiceIndex } from '../core/types'
import { DEFAULT_COLUMNS } from '../core/types'

/** 创建空白列 */
function createEmptyColumn(): Column {
  return [' ', ' ', ' ']
}

/** 创建空白乐谱 */
function createEmptyScore(columns: number): Score {
  return Array.from({ length: columns }, createEmptyColumn)
}

export function useNotation(columns = DEFAULT_COLUMNS) {
  const score: Score = reactive(createEmptyScore(columns))
  const cursor: CursorPosition = reactive({ col: 0, voice: 0 })

  /** 设置某列某声部的音符（值已在输入层验证） */
  function setNote(col: number, voice: VoiceIndex, char: string) {
    if (col >= 0 && col < score.length) {
      score[col][voice] = char
    }
  }

  /** 清除某列某声部的音符（设为空格） */
  function clearNote(col: number, voice: VoiceIndex) {
    if (col >= 0 && col < score.length) {
      score[col][voice] = ' '
    }
  }

  /**
   * 插入模式：在 col 处插入音符，col 及之后同声部音符右移一位，末位丢弃
   */
  function insertNoteAt(col: number, voice: VoiceIndex, char: string) {
    if (col < 0 || col >= score.length) {
      return
    }

    for (let i = score.length - 1; i > col; i--) {
      score[i][voice] = score[i - 1][voice]
    }
    
    score[col][voice] = char
  }

  /**
   * 插入模式 Backspace：删除 col 前一个位置的音符，之后同声部音符左移填补，末位补空格
   * 返回是否成功执行（col=0 时无法操作）
   */
  function backspaceAt(col: number, voice: VoiceIndex): boolean {
    if (col <= 0 || col >= score.length + 1) {
      return false
    }

    const deleteCol = col - 1

    for (let i = deleteCol; i < score.length - 1; i++) {
      score[i][voice] = score[i + 1][voice]
    }

    score[score.length - 1][voice] = ' '
    return true
  }

  /**
   * 清空当前 cell，不触发位移（用于 Delete 键，两种模式通用）
   */
  function deleteAt(col: number, voice: VoiceIndex) {
    clearNote(col, voice)
  }

  /** 移动光标 */
  function moveCursor(col: number, voice: VoiceIndex) {
    if (col >= 0 && col < score.length) {
      cursor.col = col
    }
    cursor.voice = Math.min(2, Math.max(0, voice)) as VoiceIndex
  }

  /** 重置乐谱 */
  function resetScore() {
    for (let i = 0; i < score.length; i++) {
      score[i] = createEmptyColumn()
    }
    cursor.col = 0
    cursor.voice = 0
  }

  /** 加载乐谱数据 */
  function loadScore(newScore: Score) {
    // 清空现有数据
    score.length = 0

    // 加载新数据（最多加载 DEFAULT_COLUMNS 列）
    const loadLength = Math.min(newScore.length, DEFAULT_COLUMNS)
    
    for (let i = 0; i < loadLength; i++) {
      score.push([...newScore[i]] as Column)
    }

    // 如果导入数据不足 DEFAULT_COLUMNS 列，用空白列填充
    while (score.length < DEFAULT_COLUMNS) {
      score.push(createEmptyColumn())
    }

    // 重置光标
    cursor.col = 0
    cursor.voice = 0
  }

  /**
   * 确保乐谱数据至少有 minCols 列，不足时用空白列填充
   * 用于网格可见列数增加时自动扩展数据
   */
  function ensureColumns(minCols: number) {
    while (score.length < minCols) {
      score.push(createEmptyColumn())
    }
  }

  return {
    score: readonly(score),
    cursor: readonly(cursor),
    columns: score.length,
    setNote,
    clearNote,
    insertNoteAt,
    backspaceAt,
    deleteAt,
    moveCursor,
    resetScore,
    loadScore,
    ensureColumns,
  }
}