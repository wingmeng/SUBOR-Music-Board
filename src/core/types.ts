/** 基本音符字符 */
export type NoteChar = string

/** 八度后缀：.表示高音（上加点），,表示低音（下加点），仅支持1级 */
export type OctaveSuffix = '' | '.' | ','
/** 解析后的显示信息 */
export interface NoteDisplay {
  /** input中显示的内容（如 "1", "#1"） */
  display: string
  /** CSS类名，如 "s1"（一个上点）、"s-1"（一个下点），空字符串表示无标记 */
  octaveClass: string
}

/**
 * 解析记谱值，返回显示信息和八度CSS类
 *
 * 存储格式: [升降号?][音符][八度后缀?]
 * 例如: "1" → 中音do, "1." → 高音do, "1," → 低音do
 *       "#1." → 高音升do, "b3," → 低音降mi
 */
export function parseNoteValue(value: string): NoteDisplay {
  if (value === ' ' || value === '') {
    return { display: '', octaveClass: '' }
  }

  let display = value
  let octaveClass = ''

  // 从末尾解析八度后缀（仅支持1级）
  if (display.endsWith('.')) {
    octaveClass = 's1'
    display = display.slice(0, -1)
  } else if (display.endsWith(',')) {
    octaveClass = 's-1'
    display = display.slice(0, -1)
  }

  return { display, octaveClass }
}

/**
 * 声部索引（三个声部从上到下）
 * 0 = 方波·主旋律（Square Lead）
 * 1 = 方波·和弦律（Square Chord）
 * 2 = 三角波·低频  （Triangle Bass）
 */
export type VoiceIndex = 0 | 1 | 2

/** 声部元信息 */
export const VOICES: { index: VoiceIndex; label: string; wave: 'square' | 'triangle' }[] = [
  { index: 0, label: '主旋律', wave: 'square' },
  { index: 1, label: '和弦律', wave: 'square' },
  { index: 2, label: '低频',   wave: 'triangle' },
]

/** 单列数据：3个声部的记谱字符串，顺序对应 VoiceIndex */
export type Column = [string, string, string]

/** 乐谱数据：N列 */
export type Score = Column[]

/** 光标位置 */
export interface CursorPosition {
  col: number
  voice: VoiceIndex
}

/** 输入模式：insert（插入，输入时右推后续音符）/ overwrite（覆盖，直接替换） */
export type InputMode = 'insert' | 'overwrite'

/** 播放状态 */
export type PlaybackState = 'stopped' | 'playing' | 'paused'

/** 重复模式 */
export type RepeatMode = false

/** 合法的记谱输入字符正则（单次按键字符验证：数字、升降号、八度修饰符、空格） */
export const NOTE_CHAR_REGEX = /^[1-7#b., ]$/

/**
 * 判断单字符是否为合法记谱输入。
 * 注意：完整记谱值是多个字符的组合（如 "1."、"#4"），此函数只验证单个按键字符。
 */
export function isValidNoteChar(char: string): boolean {
  return NOTE_CHAR_REGEX.test(char)
}

/**
 * 判断完整字符串是否为合法记谱值。
 * 格式: [升降号?][1-7][八度后缀?] | 空格 | 空串
 * 例如: "1"、"1."、"1,"、"#1."、"b3,"
 */
export function isValidNoteValue(value: string): boolean {
  if (value.trim() === '') {
    return true
  }
  return /^[#b]?[1-7][\.,]?$/.test(value)
}

/** 默认列数 */
export const DEFAULT_COLUMNS = 125

/**
 * 速度档位（BPM），八分音符
 *
 * | 档位 | BPM | 说明     |
 * |------|-----|----------|
 * | 0    |  90 | 最慢     |
 * | 1    | 100 |          |
 * | 2    | 120 |          |
 * | 3    | 130 |          |
 * | 4    | 140 |          |
 * | 5    | 160 | 最快     |
 */
export const BPM_LIST = [90, 100, 120, 130, 140, 160] as const

/** 默认 BPM */
export const DEFAULT_BPM = 120

/**
 * 调号定义
 *
 * | key  | 调名 | 1=对应音高 |
 * |------|------|-----------|
 * | C    | C大调 | C         |
 * | D    | D大调 | D         |
 * | E    | E大调 | E         |
 * | F    | F大调 | F         |
 * | G    | G大调 | G         |
 * | A    | A大调 | A         |
 * | Bb   | 降B调 | B♭        |
 * | Eb   | 降E调 | E♭        |
 */
export type KeySignature = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'Bb' | 'Eb'

/** 可选调号列表 */
export const KEY_SIGNATURES: KeySignature[] = ['C', 'D', 'E', 'F', 'G', 'A', 'Bb', 'Eb']

/** 默认调号 */
export const DEFAULT_KEY_SIGNATURE: KeySignature = 'C'

/**
 * 导出数据格式
 *
 * 用于保存/加载乐谱，包含所有必要信息。
 */
export interface ExportData {
  /** 格式版本号 */
  version: '1.0'
  /** 标题 */
  title: string
  /** 简介（可选） */
  description?: string
  /** 速度（BPM） */
  bpm: number
  /** 调号 */
  keySignature: KeySignature
  /** 乐谱数据 */
  score: Score
}

/** 导出文件扩展名 */
export const EXPORT_FILE_EXT = '.subor.json'

/** 导出文件 MIME 类型 */
export const EXPORT_MIME_TYPE = 'application/json'