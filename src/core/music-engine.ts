/**
 * 音乐引擎
 *
 * 使用原生 Web Audio API，完全独立于 Tone.js。
 * 每个音符创建独立的 OscillatorNode + GainNode，
 * 精确匹配 jinglebell.html 的增益调度模式:
 *   gain = 1.0 → linearRampToValueAtTime(1.0, startTime)
 *              → linearRampToValueAtTime(0.0, startTime + duration)
 *
 * 三个声部共享 DynamicsCompressorNode 作为主输出。
 * 参考: https://github.com/BenzLeung/web-audio-api-demo (jinglebell.html)
 */

/** 单例：音乐引擎实例 */
let engineInstance: MusicEngine | null = null

export class MusicEngine {
  private audioContext: AudioContext | null = null
  private compressor: DynamicsCompressorNode | null = null
  private initialized = false

  /** 追踪活跃振荡器及其开始时间，用于选择性停止 */
  private activeOscillators: Map<OscillatorNode, number> = new Map()

  private constructor() {}

  static getInstance(): MusicEngine {
    if (!engineInstance) {
      engineInstance = new MusicEngine()
    }
    return engineInstance
  }

  get currentTime(): number {
    return this.audioContext?.currentTime ?? 0
  }

  /**
   * 初始化音频上下文（需要用户交互后调用）
   */
  async init(): Promise<void> {
    if (this.initialized) return

    // 创建自己的 AudioContext，不依赖 Tone.js
    const Ctx = (window as any).webkitAudioContext || window.AudioContext
    const ctx = new Ctx()
    this.audioContext = ctx

    // 有些浏览器创建后是 suspended 状态，需要用户手势唤醒
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }

    // 创建主压缩器（与 jinglebell 一致：使用默认参数）
    const compressor = ctx.createDynamicsCompressor()
    compressor.connect(ctx.destination)
    this.compressor = compressor

    this.initialized = true
  }

  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * 立即播放音符（兼容旧 API：用于 NotationGrid 输入预览）
   */
  playNote(
    voiceIndex: number,
    midiNote: number | null,
    duration: number
  ): void {
    this.scheduleNote(voiceIndex, midiNote, this.currentTime, duration)
  }

  /**
   * 预调度一个音符（精确匹配 jinglebell.html 的 playNote 逻辑）
   *
   * jinglebell 模式:
   *   oscillator.start(startTime)
   *   oscillator.stop(startTime + duration)
   *   gainNode.gain.value = 1.0
   *   gainNode.gain.linearRampToValueAtTime(1.0, startTime)
   *   gainNode.gain.linearRampToValueAtTime(0.0, startTime + duration)
   *
   * @param startTime AudioContext 绝对时间（秒），必须 >= ctx.currentTime
   * @param duration  音符持续时长（秒）
   */
  scheduleNote(
    voiceIndex: number,
    midiNote: number | null,
    startTime: number,
    duration: number
  ): void {
    if (midiNote === null || !this.audioContext || !this.compressor) return

    const ctx = this.audioContext
    const freq = 27.5 * Math.pow(2, (midiNote - 21) / 12) // MIDI → Hz
    const stopTime = startTime + duration
    const isTriangle = voiceIndex === 2

    // 创建振荡器
    const osc = ctx.createOscillator()
    osc.type = isTriangle ? 'triangle' : 'square'

    // 用 setValueAtTime 在精确时刻设定频率（与 osc.start(startTime) 配合）
    osc.frequency.setValueAtTime(freq, startTime)

    if (isTriangle) {
      // 三角波：直接连接压缩器（波形柔和，无需 gain 包络）
      osc.connect(this.compressor)
    } else {
      // 方波：精确匹配 jinglebell 的增益调度
      const gainNode = ctx.createGain()
      gainNode.gain.value = 1.0
      // 在 startTime 确认 gain = 1.0（创建 schedule 锚点）
      gainNode.gain.linearRampToValueAtTime(1.0, startTime)
      // 从 startTime 到 stopTime，线性淡出到 0
      gainNode.gain.linearRampToValueAtTime(0.0, stopTime)
      osc.connect(gainNode)
      gainNode.connect(this.compressor)
    }

    // 追踪活跃振荡器（记录开始时间用于选择性停止）
    this.activeOscillators.set(osc, startTime)
    osc.onended = () => {
      this.activeOscillators.delete(osc)
    }

    // 精确调度起止
    osc.start(startTime)
    osc.stop(stopTime)
  }

  /**
   * 立即停止所有声音
   */
  stopAll(): void {
    if (!this.audioContext) return

    const now = this.audioContext.currentTime
    const oscillators = Array.from(this.activeOscillators.keys())
    this.activeOscillators.clear()

    oscillators.forEach((osc) => {
      try {
        osc.stop(now + 0.005)
      } catch {
        // 忽略已停止或尚未启动的振荡器
      }
    })
  }

  /**
   * 选择性停止开始时间 >= fromTime 的所有音符
   *
   * 用于播放中调整 BPM：只杀掉已排程的未来音符，
   * 当前列正在发音的音符保留不动，避免卡顿。
   */
  stopFrom(fromTime: number): void {
    if (!this.audioContext) return

    const now = this.audioContext.currentTime
    const toStop: OscillatorNode[] = []

    for (const [osc, startTime] of this.activeOscillators) {
      if (startTime >= fromTime) {
        toStop.push(osc)
      }
    }

    for (const osc of toStop) {
      this.activeOscillators.delete(osc)
      try {
        osc.stop(now + 0.005)
      } catch {
        // 忽略已停止或尚未启动的振荡器
      }
    }
  }

  /**
   * 销毁引擎，释放资源
   */
  dispose(): void {
    this.stopAll()
    if (this.compressor) {
      this.compressor.disconnect()
      this.compressor = null
    }
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.initialized = false
    engineInstance = null
  }
}

/** 获取音乐引擎实例的便捷函数 */
export function getMusicEngine(): MusicEngine {
  return MusicEngine.getInstance()
}
