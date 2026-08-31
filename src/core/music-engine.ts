/**
 * 音乐引擎
 *
 * 使用原生 Web Audio API
 * 每个音符创建独立的 OscillatorNode + GainNode，
 * 增益调度:
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
    if (this.initialized) {
      return
    }

    const Ctx = (window as any).webkitAudioContext || window.AudioContext
    const ctx = new Ctx()
    this.audioContext = ctx

    // 有些浏览器创建后是 suspended 状态，需要用户手势唤醒
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }

    // 创建主压缩器
    const compressor = ctx.createDynamicsCompressor()
    compressor.connect(ctx.destination)
    this.compressor = compressor

    this.initialized = true
  }

  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * 等待 AudioContext 渲染时钟真正启动。
   *
   * AudioContext 首次创建（或从 suspended 恢复）后，currentTime 可能
   * 冻结数百毫秒才开始推进（渲染管线冷启动）。若直接以冻结的 currentTime
   * 作为调度基准，预调度的音符会比预期晚发声，造成声音滞后于进度指示器。
   *
   * @param timeoutMs 最长等待毫秒数（兜底，避免时钟永不启动时挂死）
   * @returns 时钟是否已启动（false 表示超时仍未推进）
   */
  async waitForClockRunning(timeoutMs = 2000): Promise<boolean> {
    if (!this.audioContext) {
      return false
    }
    const start = performance.now()
    while (this.audioContext.currentTime <= 0 && performance.now() - start < timeoutMs) {
      await new Promise<void>((resolve) => setTimeout(resolve, 10))
    }
    return this.audioContext.currentTime > 0
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
   * 预调度一个音符
   *
   * oscillator.start(startTime)
   * oscillator.stop(startTime + duration)
   * gainNode.gain.value = 1.0
   * gainNode.gain.linearRampToValueAtTime(1.0, startTime)
   * gainNode.gain.linearRampToValueAtTime(0.0, startTime + duration)
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
    if (midiNote === null || !this.audioContext || !this.compressor) {
      return
    }

    const ctx = this.audioContext

    // 八度缩放因子：
    //   voice 0 (主旋律/方波): ×2   → 高八度
    //   voice 1 (和弦律/方波): ×1   → 原始音高
    //   voice 2 (低频/三角波): ×0.5 → 低八度
    // 三声部分布在高、中、低三个音域，形成层次分明的三声部效果
    const OCTAVE_MULTIPLIERS = [2, 1, 0.5]
    const freq = 27.5 * Math.pow(2, (midiNote - 21) / 12) * OCTAVE_MULTIPLIERS[voiceIndex]
    const stopTime = startTime + duration
    const isTriangle = voiceIndex === 2

    // 创建振荡器
    const osc = ctx.createOscillator()
    osc.type = isTriangle ? 'triangle' : 'square'

    // 用 setValueAtTime 在精确时刻设定频率（与 osc.start(startTime) 配合）
    osc.frequency.setValueAtTime(freq, startTime)

    if (isTriangle) {
      // 三角波：增益补偿 + 微量 gain 包络消除起止 Click
      //
      // 增益补偿原因：
      //   1. 八度因子 ×0.5 使频率降一个八度（如 C4→C3），普通喇叭低音重现效率低
      //   2. 人耳等响曲线在低频段灵敏度显著下降（Fletcher-Munson 效应）
      //   3. 方波主旋律全程线性衰减（平均增益≈0.5），三角波需要提升音量保持平衡
      // 提升 2.5 倍（≈+8dB）以补偿上述因素，使低频声部可清晰听见
      const gainNode = ctx.createGain()
      const TRIANGLE_BOOST = 2.5
      const fadeMs = 0.003 // 3ms 淡出消除 Click

      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(TRIANGLE_BOOST, startTime + 0.001) // 1ms attack
      gainNode.gain.setValueAtTime(TRIANGLE_BOOST, stopTime - fadeMs)
      gainNode.gain.linearRampToValueAtTime(0.0, stopTime)
      osc.connect(gainNode)
      gainNode.connect(this.compressor)
    } else {
      // 方波
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
    if (!this.audioContext) {
      return
    }

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
    if (!this.audioContext) {
      return
    }

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
