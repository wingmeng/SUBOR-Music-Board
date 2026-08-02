import type { KeySignature } from './types'

/**
 * 各调号下简谱 1-7 对应的 MIDI 音符编号（基准八度 C4=60）
 *
 * MIDI 编号: C4=60, D4=62, E4=64, F4=65, G4=67, A4=69, B4=71
 *
 * 大调音阶: 全-全-半-全-全-全-半 (2-2-1-2-2-2-1 半音)
 */
const KEY_NOTE_MAP: Record<KeySignature, number[]> = {
  // C 大调: C D E F G A B
  C:  [60, 62, 64, 65, 67, 69, 71],
  // D 大调: D E F# G A B C#
  D:  [62, 64, 66, 67, 69, 71, 73],
  // E 大调: E F# G# A B C# D#
  E:  [64, 66, 68, 69, 71, 73, 75],
  // F 大调: F G A Bb C D E
  F:  [65, 67, 69, 70, 72, 74, 76],
  // G 大调: G A B C D E F#
  G:  [67, 69, 71, 72, 74, 76, 78],
  // A 大调: A B C# D E F# G#
  A:  [69, 71, 73, 74, 76, 78, 80],
  // Bb 大调: Bb C D Eb F G A
  Bb: [70, 72, 74, 75, 77, 79, 81],
  // Eb 大调: Eb F G Ab Bb C D
  Eb: [75, 77, 79, 80, 82, 84, 86],
}

/**
 * 解析记谱字符串，提取音符编号和修饰符
 *
 * @param note 记谱字符串 (如 "1", "#.1", "b,3" )
 * @returns 解析结果，或 null 表示无效/休止符/延音线
 */
function parseNote(note: string): {
  accidental: number      // 升降号: 0=无, 1=升(#), -1=降(b)
  noteNumber: number      // 简谱数字 1-7
  octaveShift: number     // 八度偏移: +1=高八度(.), -1=低八度(,)
} | null {
  // 空格或空串表示休止符
  if (note === ' ' || note === '') {
    return null
  }

  // 延音线：延续前一个音符的时值，不产生新音高
  if (note === '-') {
    return null
  }

  // 匹配格式: [升降号?][八度修饰符?][1-7]
  const match = note.match(/^(#|b)?(\.|,)?([1-7])$/)
  if (!match) {
    return null
  }

  const [, accidentalChar, octaveSuffix, noteStr] = match

  // 解析升降号
  let accidental = 0
  if (accidentalChar === '#') {
    accidental = 1
  } else if (accidentalChar === 'b') {
    accidental = -1
  }

  // 解析八度后缀（仅支持1级）
  let octaveShift = 0
  if (octaveSuffix === '.') {
    octaveShift = 1
  } else if (octaveSuffix === ',') {
    octaveShift = -1
  }

  return {
    accidental,
    noteNumber: parseInt(noteStr, 10),
    octaveShift,
  }
}

/**
 * 将简谱记谱字符串转换为 MIDI 音符编号
 *
 * @param note 记谱字符串 (如 "1", "#.1", "b,3" )
 * @param keySignature 当前调号
 * @returns MIDI 音符编号，或 null 表示休止符
 */
export function noteToMidi(
  note: string,
  keySignature: KeySignature
): number | null {
  const parsed = parseNote(note)
  if (!parsed) {
    return null
  }

  const { accidental, noteNumber, octaveShift } = parsed
  const baseNotes = KEY_NOTE_MAP[keySignature]

  // 获取基准音符 (1-7 对应索引 0-6)
  const baseMidi = baseNotes[noteNumber - 1]

  // 应用八度偏移和升降号
  return baseMidi + (octaveShift * 12) + accidental
}

/**
 * 批量转换一列中的三个声部
 *
 * @param column 单列数据 [主旋律, 和弦律, 低频]
 * @param keySignature 当前调号
 * @returns MIDI 编号数组 [number | null, number | null, number | null]
 */
export function columnToMidi(
  column: readonly [string, string, string],
  keySignature: KeySignature
): [number | null, number | null, number | null] {
  return [
    noteToMidi(column[0], keySignature),
    noteToMidi(column[1], keySignature),
    noteToMidi(column[2], keySignature),
  ]
}

/**
 * 判断记谱值是否为延音线 (-)
 *
 * 延音线延续前一个音符的时值，不产生新的音高。
 * 在序列器调度时，延音线应与前一个音符合并为一个更长的振荡器。
 */
export function isTie(cell: string): boolean {
  return cell === '-'
}
