import { ref, watch, type DeepReadonly, type Ref } from 'vue'
import type { Score, KeySignature, PlaybackState } from '../core/types'
import { getSequencer } from '../core/sequencer'

export interface UsePlaybackOptions {
  /** 乐谱数据（只读） */
  score: DeepReadonly<Score>
  /** 当前 BPM */
  bpm: Ref<number>
  /** 当前调号 */
  keySignature: Ref<KeySignature>
}

export function usePlayback(options: UsePlaybackOptions) {
  const { score, bpm, keySignature } = options

  const state: Ref<PlaybackState> = ref('stopped')
  const currentColumn: Ref<number> = ref(0)
  const loop: Ref<boolean> = ref(false)
  const sequencer = getSequencer()

  // 初始化序列器
  sequencer.setScore(score as Score)
  sequencer.onPlay((col) => {
    currentColumn.value = col
  })
  sequencer.onComplete(() => {
    state.value = 'stopped'
    currentColumn.value = 0
  })

  // 监听 BPM 变化
  watch(bpm, (newBpm) => {
    sequencer.setBpm(newBpm)
  }, { immediate: true })

  // 监听调号变化
  watch(keySignature, (newKey) => {
    sequencer.setKeySignature(newKey)
  }, { immediate: true })

  /**
   * 播放
   */
  async function play() {
    await sequencer.play()
    state.value = 'playing'
  }

  /**
   * 暂停
   */
  function pause() {
    sequencer.pause()
    state.value = 'paused'
  }

  /**
   * 停止
   */
  function stop() {
    sequencer.stop()
    state.value = 'stopped'
    currentColumn.value = 0
  }

  /**
   * 切换播放/暂停
   */
  async function togglePlayPause() {
    if (state.value === 'playing') {
      pause()
    } else {
      await play()
    }
  }

  function toggleLoop() {
    loop.value = !loop.value
    sequencer.setLoop(loop.value)
  }

  return {
    state,
    currentColumn,
    loop,
    play,
    pause,
    stop,
    togglePlayPause,
    toggleLoop,
  }
}
