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

  /** 上次 scheduleAllNotes 的基准 AudioContext 时间（用于 BPM 变速时的选择性停止） */
  private lastScheduleBaseTime = 0

  /** 上次 scheduleAllNotes 的起始列（用于 BPM 变速时的选择性停止） */
  private lastScheduleStartCol = 0

  /** 正在重新调度中（防止快速连点导致竞争） */
  private _rescheduling = false

  setScore(score: Score): void {
    this.score = score
  }

  setKeySignature(key: KeySignature): void {
    if (this.keySignature === key) return
    this.keySignature = key

    // 播放中实时切换调号
    if (this.state === 'playing' && !this._rescheduling) {
      this._rescheduling = true

      const interval = 60 / this.bpm
      const elapsed = (performance.now() - this.playbackWallStart) / 1000
      const currentCol = Math.min(
        Math.floor(elapsed / interval),
        this.score.length - 1
      )

      // 只停掉未来音符，当前列自然播完
      const nextCol = currentCol + 1
      const cutoffTime = this.lastScheduleBaseTime + (nextCol - this.lastScheduleStartCol) * interval
      getMusicEngine().stopFrom(cutoffTime)

      // 从下一列开始用新调号重新调度（时值不变，无需调 playbackWallStart）
      if (nextCol < this.score.length) {
        this.scheduleAllNotes(nextCol)
        // 重调度后音频从 engine.currentTime + 0.1（≈100ms后）开始播放，
        // 同步调整 playbackWallStart 使指示器也在 100ms 后到达 nextCol
        this.playbackWallStart = performance.now() - (nextCol * interval * 1000) + 100
      }

      this._rescheduling = false
    }
  }

  setBpm(bpm: number): void {
    if (this.bpm === bpm) return
    const prevBpm = this.bpm
    this.bpm = bpm

    // 播放中实时调整 BPM
    if (this.state === 'playing' && !this._rescheduling) {
      this._rescheduling = true

      const oldInterval = 60 / prevBpm
      const elapsed = (performance.now() - this.playbackWallStart) / 1000
      const effectiveLength = this.getEffectiveLength()
      const currentCol = Math.min(
        Math.floor(elapsed / oldInterval),
        effectiveLength - 1
      )

      // 只停掉从下一列开始的未来音符，当前列自然播放完，避免卡顿
      const nextCol = currentCol + 1
      const cutoffTime = this.lastScheduleBaseTime + (nextCol - this.lastScheduleStartCol) * oldInterval
      getMusicEngine().stopFrom(cutoffTime)

      // 从下一列开始用新 BPM 重新调度
      if (nextCol < effectiveLength) {
        const newInterval = 60 / this.bpm
        // 重调度后音频从 engine.currentTime + 0.1（≈100ms后）开始播放，
        // 设置 playbackWallStart 使指示器也在 100ms 后到达 nextCol
        this.playbackWallStart = performance.now() - (nextCol * newInterval * 1000) + 100
        this.scheduleAllNotes(nextCol)
      }

      this._rescheduling = false
    }
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
    this.playbackWallStart = performance.now() - (this.pausedColumn * this.getNoteInterval() * 1000)
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
   * 乐谱固定有 DEFAULT_COLUMNS(150) 列，但大部分可能是空白列。
   * 有效长度确定播放器的实际播放终点，避免在空白列中浪费时间。
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

    // 记录本次调度信息，供 setBpm 中 stopFrom 计算截止时间
    const baseTime = engine.currentTime + 0.1
    this.lastScheduleBaseTime = baseTime
    this.lastScheduleStartCol = startColumn

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
    let lastColumn = -1
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
          this.playbackWallStart = performance.now()
          lastColumn = -1
          this.scheduleAllNotes(0)
          // 立即触发第一列的回调，确保指示器回到开头
          this.onPlayCallback?.(0)
          return
        }
        this.stop()
        this.onCompleteCallback?.()
        return
      }

      // 列号变化时触发 UI 回调（限制在有效范围内）
      const displayCol = Math.min(currentCol, effectiveLength - 1)
      if (displayCol !== lastColumn) {
        lastColumn = displayCol
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
