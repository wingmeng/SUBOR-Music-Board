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
    if (col < 0) {
      return
    }
    // 列超出当前长度时自动扩展乐谱（输入越过末尾会生成新列/新行，由滚动条承接）
    while (score.length <= col) {
      score.push(createEmptyColumn())
    }
    score[col][voice] = char
  }

  /** 清除某列某声部的音符（设为空格） */
  function clearNote(col: number, voice: VoiceIndex) {
    if (col >= 0 && col < score.length) {
      score[col][voice] = ' '
    }
  }

  /**
   * 插入模式：在 col 处插入音符，col 及之后同声部音符右移一位，末位丢弃
   * 若 col 超出当前长度，先扩展乐谱再写入（相当于在末尾追加）
   */
  function insertNoteAt(col: number, voice: VoiceIndex, char: string) {
    if (col < 0) {
      return
    }

    while (score.length <= col) {
      score.push(createEmptyColumn())
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
    if (col >= 0) {
      // 光标移到现有数据之外时自动扩展乐谱（输入推进越过末尾即生成新列/新行）
      while (score.length <= col) {
        score.push(createEmptyColumn())
      }
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

    // 完整加载新数据：不截断，保留超出默认列数的部分（由网格滚动承接）
    for (let i = 0; i < newScore.length; i++) {
      score.push([...newScore[i]] as Column)
    }

    // 如果导入数据不足 DEFAULT_COLUMNS 列，用空白列填充（保持面板初始铺满）
    while (score.length < DEFAULT_COLUMNS) {
      score.push(createEmptyColumn())
    }

    // 重置光标
    cursor.col = 0
    cursor.voice = 0
  }

  /**
   * 将乐谱列数与可视容量对齐（初始化 / 导入 / 清空 / 窗口变化时调用）：
   * - score 不足容量 → 用空白列补齐，铺满可视区域（不产生滚动条）
   * - score 超出容量且超出部分全为空白 → 裁掉空白尾部（不删除任何音符，
   *   并保留光标所在列防止光标越界）
   * - score 超出容量且含真实音符 → 保留全部列，由滚动条承接
   */
  function syncColumns(capacity: number) {
    if (capacity < 1) {
      return
    }

    // 不足容量：补齐空白列
    while (score.length < capacity) {
      score.push(createEmptyColumn())
    }
    if (score.length <= capacity) {
      return
    }

    // 超出容量：仅当尾部全部为空白时才可裁剪（避免误删音符）
    for (let i = capacity; i < score.length; i++) {
      const col = score[i]
      if (col[0] !== ' ' || col[1] !== ' ' || col[2] !== ' ') {
        return // 存在真实内容，保留全部
      }
    }

    // 尾部全空：裁到容量，但至少保留光标所在列
    const newLength = Math.min(score.length, Math.max(capacity, cursor.col + 1))
    score.length = newLength
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
    syncColumns,
  }
}