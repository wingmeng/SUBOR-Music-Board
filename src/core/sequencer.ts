import type { Score, KeySignature, PlaybackState } from './types'
import { noteToMidi, isTie } from './note-map'
import { getMusicEngine } from './music-engine'

/** 播放回调：当播放到某一列时触发 */
export type PlayCallback = (columnIndex: number) => void

/** 播放完成回调 */
export type CompleteCallback = () => void

/** 循环回调 */
export type LoopToggleCallback = (enabled: boolean) => void

/**
 * 序列器
 *
 * 采用 jinglebell.html 的预调度模式：
 * 播放启动时一次性计算所有音符的 AudioContext 绝对时间，
 * 创建并调度所有 OscillatorNode，UI 通过独立的定时器更新。
 */
export class Sequencer {
  private score: Score = []
  private keySignature: KeySignature = 'C'
  private bpm: number = 120
  private state: PlaybackState = 'stopped'

  /** 暂停/恢复时记录当前位置 */
  private pausedColumn = 0

  private onPlayCallback: PlayCallback | null = null
  private onCompleteCallback: CompleteCallback | null = null

  /** 循环播放开关 */
  private loop: boolean = false

  /** UI 更新定时器 */
  private timerId: ReturnType<typeof setInterval> | null = null

  /** 播放起始的 wall-clock 时间（ms），用于 UI 回调定位 */
  private playbackWallStart = 0

  /** 播放中实时调号/变速后，重启播放的防抖定时器 */
  private restartTimer: ReturnType<typeof setTimeout> | null = null

  /** 防抖延迟（ms）：等待“调整完成”后再从当前位置重启，避免连点/拖动时反复调度 */
  private readonly restartDelay = 120

  /**
   * 音频预调度提前量（秒）。
   *
   * scheduleAllNotes 以 baseTime = engine.currentTime + 该值 作为第一个音符的绝对时间，
   * 因此 UI 侧的 playbackWallStart 也必须同步 +该值（毫秒）对齐，
   * 否则播放开始时指示器会先于声音约 100ms 走动，造成音画不同步。
   */
  private readonly scheduleLookaheadSec = 0.1

  /** UI 定时器当前已回调的列号（实例级，便于重启时重置） */
  private lastUiColumn = -1

  setScore(score: Score): void {
    this.score = score
  }

  setKeySignature(key: KeySignature): void {
    if (this.keySignature === key) return
    this.keySignature = key

    // 播放中实时切换调号：立即丢弃当前音，调整完成后从当前位置重启
    if (this.state === 'playing') {
      this.requestPlaybackRestart()
    }
  }

  setBpm(bpm: number): void {
    if (this.bpm === bpm) return

    const wasPlaying = this.state === 'playing'
    const prevInterval = this.getNoteInterval()

    if (wasPlaying) {
      // 先按旧间隔定位当前指示器列，再按新间隔重映射 playbackWallStart，
      // 使指示器在防抖/重启期间保持在原列（否则 SLOW 会后退、FAST 会快进：
      // 墙钟已播秒数 / 新间隔 ≠ 指示器当前列）。
      const elapsed = (performance.now() - this.playbackWallStart) / 1000
      const currentCol = Math.max(
        0,
        Math.min(Math.floor(elapsed / prevInterval), this.getEffectiveLength() - 1)
      )
      this.bpm = bpm
      this.playbackWallStart = performance.now() - currentCol * this.getNoteInterval() * 1000
    } else {
      this.bpm = bpm
    }

    // 播放中实时调整速度：立即丢弃当前音，调整完成后从当前位置重启
    if (wasPlaying) {
      this.requestPlaybackRestart()
    }
  }

  /**
   * 请求在播放中重启播放（用于实时调号/变速）。
   *
   * - 立即 stopAll 丢弃当前所有声音，杜绝多版本叠加产生混响；
   * - 用防抖等待“调整完成”（连续点击/拖动不再触发额外调度），
   *   最终从指示器当前所在列用新调号/速度重新调度，保证音画重新同步。
   */
  private requestPlaybackRestart(): void {
    // 立即丢弃当前正在播放/已调度的所有音
    getMusicEngine().stopAll()

    if (this.restartTimer !== null) {
      clearTimeout(this.restartTimer)
    }
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null
      this.restartFromCurrentPosition()
    }, this.restartDelay)
  }

  /**
   * 从当前指示器所在列用当前调号/速度重新调度剩余音符。
   *
   * 取代旧的「保留当前列、stopFrom 截断未来音符」方案：旧方案在快速连点
   * 时 cutoff 计算漂移，会留下相互重叠的振荡器（混响）并造成指示器与音频
   * 的永久错位。现在每次都干净丢弃 + 从当前列整体重排，自纠正、无残留。
   */
  private restartFromCurrentPosition(): void {
    if (this.state !== 'playing') return

    const interval = this.getNoteInterval()
    const effectiveLength = this.getEffectiveLength()
    if (effectiveLength === 0) return

    // 依据虚拟时间计算“当前播放列”（与 UI 定时器同一基准）
    const elapsed = (performance.now() - this.playbackWallStart) / 1000
    const currentCol = Math.max(
      0,
      Math.min(Math.floor(elapsed / interval), effectiveLength - 1)
    )

    // 再次确保干净（防抖期间可能已有新的调度进入）
    getMusicEngine().stopAll()

    // 用新调号/速度从当前列重新调度剩余音符
    this.scheduleAllNotes(currentCol)

    // 与 scheduleAllNotes（baseTime = engine.currentTime + 0.1）对齐：
    // 指示器在约 100ms 后到达 currentCol，与该列音频同时发声，恢复音画同步
    this.playbackWallStart = performance.now() + this.scheduleLookaheadSec * 1000 - currentCol * interval * 1000
    this.lastUiColumn = Math.max(0, currentCol - 1)
  }

  onPlay(callback: PlayCallback): void {
    this.onPlayCallback = callback
  }

  onComplete(callback: CompleteCallback): void {
    this.onCompleteCallback = callback
  }

  setLoop(loop: boolean): void {
    this.loop = loop
  }

  getState(): PlaybackState {
    return this.state
  }

  getCurrentIndex(): number {
    if (this.state === 'playing') {
      const elapsed = (performance.now() - this.playbackWallStart) / 1000
      return Math.min(Math.floor(elapsed / this.getNoteInterval()), this.getEffectiveLength() - 1)
    }
    return this.pausedColumn
  }

  /**
   * 开始播放（或从暂停处恢复）
   */
  async play(): Promise<void> {
    if (this.state === 'playing') return

    const engine = getMusicEngine()
    if (!engine.isInitialized()) {
      await engine.init()
    }

    // 首次播放：AudioContext 刚创建，currentTime 可能有一段启动冻结期
    // （渲染管线冷启动，数百 ms 不推进）。等待时钟真正启动后再调度，
    // 确保 baseTime 与 wall clock 基准对齐，避免首音滞后于指示器。
    await engine.waitForClockRunning()

    // 从停止状态开始 → 从第 0 列播放
    if (this.state === 'stopped') {
      this.pausedColumn = 0
    }

    this.state = 'playing'

    // 一次性预调度所有剩余音符（匹配 jinglebell 的预调度模式）
    this.scheduleAllNotes(this.pausedColumn)

    // 启动 UI 更新定时器
    // playbackWallStart 设为虚拟时间的 wall-clock 起点，
    // 使得 performance.now() - playbackWallStart = 已播放的秒数
    this.playbackWallStart = performance.now() + this.scheduleLookaheadSec * 1000 - (this.pausedColumn * this.getNoteInterval() * 1000)
    this.startUiTimer()
  }

  /**
   * 暂停播放
   */
  pause(): void {
    if (this.state !== 'playing') {
      return
    }
    this.state = 'paused'

    // 停止 UI 定时器
    this.stopUiTimer()

    // 取消任何待触发的实时重启，避免暂停后误重启
    if (this.restartTimer !== null) {
      clearTimeout(this.restartTimer)
      this.restartTimer = null
    }

    // 记录当前播放位置
    const elapsed = (performance.now() - this.playbackWallStart) / 1000
    this.pausedColumn = Math.min(
      Math.floor(elapsed / this.getNoteInterval()),
      this.getEffectiveLength() - 1
    )

    // 立即停止所有预调度的振荡器
    getMusicEngine().stopAll()
  }

  /**
   * 停止播放
   */
  stop(): void {
    this.state = 'stopped'
    this.pausedColumn = 0
    this.stopUiTimer()

    // 取消任何待触发的实时重启，避免停止后误重启
    if (this.restartTimer !== null) {
      clearTimeout(this.restartTimer)
      this.restartTimer = null
    }
    getMusicEngine().stopAll()
  }

  /**
   * 跳转到指定列（下次播放从此列开始）
   */
  seekTo(columnIndex: number): void {
    if (columnIndex < 0) {
      this.pausedColumn = 0
    } else if (columnIndex >= this.score.length) {
      this.pausedColumn = this.score.length - 1
    } else {
      this.pausedColumn = columnIndex
    }
  }

  // ─── 私有方法 ──────────────────────────────────────

  /**
   * 获取乐谱有效长度：最后一个至少有一个非空格音符的列的索引 + 1
   *
   * 乐谱列数不固定（初始 DEFAULT_COLUMNS 列，随输入/导入动态扩展），
   * 大部分可能是空白列。有效长度确定播放器的实际播放终点，避免在空白列中浪费时间。
   */
  private getEffectiveLength(): number {
    for (let i = this.score.length - 1; i >= 0; i--) {
      const col = this.score[i]

      if ([0, 1, 2].some(index => col[index] !== ' ')) {
        return i + 1
      }
    }
    return 0 // 完全空白的乐谱
  }

  /**
   * 预调度所有音符（支持延音线合并）
   *
   * 逐声部扫描乐谱，将音符与后续延音线(-)合并为单个更长的振荡器：
   * - 音符 "1" 后跟 "-" "-" → 一个持续 3 个格时值的振荡器
   * - 孤立延音线（开头或休止符后）→ 视为休止符，不调度
   * - 休止符 → 不调度
   *
   * 三角波时长仍为间隔 × 0.93（匹配 jinglebell 比例）。
   */
  private scheduleAllNotes(startColumn: number): void {
    const engine = getMusicEngine()
    const noteInterval = this.getNoteInterval()
    const triangleRatio = 0.93 // 三角波略短（匹配 jinglebell 0.28/0.30）

    const effectiveLength = this.getEffectiveLength()

    const baseTime = engine.currentTime + this.scheduleLookaheadSec

    // 逐声部独立扫描，合并延音线组
    for (let voice = 0; voice < 3; voice++) {
      const isTriangle = voice === 2
      let i = startColumn

      while (i < effectiveLength) {
        const cellValue = this.score[i][voice]

        // 休止符：跳过
        if (cellValue === ' ' || cellValue === '') {
          i++
          continue
        }

        // 延音线但无前导音符：视为休止符跳过
        if (isTie(cellValue)) {
          i++
          continue
        }

        // 正常音符：计算 MIDI，向前扫描延音线
        const midiNote = noteToMidi(cellValue, this.keySignature)
        if (midiNote === null) {
          i++
          continue
        }

        const startTime = baseTime + (i - startColumn) * noteInterval

        // 向前扫描连续延音线，计算总时长
        let tieCount = 0
        while (
          i + tieCount + 1 < effectiveLength &&
          isTie(this.score[i + tieCount + 1][voice])
        ) {
          tieCount++
        }

        const totalCells = 1 + tieCount
        const duration = totalCells * noteInterval
        const voiceDuration = isTriangle ? duration * triangleRatio : duration

        engine.scheduleNote(voice, midiNote, startTime, voiceDuration)

        // 跳过音符本身 + 所有延音线格
        i += totalCells
      }
    }
  }

  /**
   * 启动 UI 更新定时器
   *
   * 通过 setInterval 以 ~50ms 间隔轮询播放进度，
   * 仅在列号发生变化时触发回调。
   */
  private startUiTimer(): void {
    this.lastUiColumn = -1
    const effectiveLength = this.getEffectiveLength()

    // 无有效音符 → 立即停止
    if (effectiveLength === 0) {
      this.stop()
      this.onCompleteCallback?.()
      return
    }

    this.timerId = setInterval(() => {
      if (this.state !== 'playing') return

      const elapsed = (performance.now() - this.playbackWallStart) / 1000
      const noteInterval = this.getNoteInterval()
      const currentCol = Math.floor(elapsed / noteInterval)

      // 播放完成
      if (currentCol >= effectiveLength) {
        if (this.loop) {
          // 循环：重置播放位置，重新调度所有音符
          this.pausedColumn = 0
          this.playbackWallStart = performance.now() + this.scheduleLookaheadSec * 1000
          this.lastUiColumn = -1
          this.scheduleAllNotes(0)
          // 立即触发第一列的回调，确保指示器回到开头
          this.onPlayCallback?.(0)
          return
        }
        this.stop()
        this.onCompleteCallback?.()
        return
      }

      // 列号变化时触发 UI 回调（限制在有效范围内，并防止越界到负列）
      const displayCol = Math.max(0, Math.min(currentCol, effectiveLength - 1))
      if (displayCol !== this.lastUiColumn) {
        this.lastUiColumn = displayCol
        this.onPlayCallback?.(displayCol)
      }
    }, 50)
  }

  private stopUiTimer(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId)
      this.timerId = null
    }
  }

  /**
   * 获取每列的时间间隔（秒）
   *
   * 每列 = 八分音符（半拍），故间隔 = 60 / (BPM × 2) = 30 / BPM
   */
  private getNoteInterval(): number {
    return 30 / this.bpm
  }

}

/** 单例序列器实例 */
let sequencerInstance: Sequencer | null = null

/**
 * 获取序列器单例
 */
export function getSequencer(): Sequencer {
  if (!sequencerInstance) {
    sequencerInstance = new Sequencer()
  }
  return sequencerInstance
}
