import { ref, reactive } from 'vue'

export type QuillAnimation = 'idle' | 'writing' | 'dipInk'

export function useQuill() {
  const position = reactive({ x: 0, y: 0 })
  const animation = ref<QuillAnimation>('idle')

  /** 更新羽毛笔位置（基于 input 元素的 getBoundingClientRect） */
  function moveTo(el: HTMLElement) {
    const rect = el.getBoundingClientRect()
    position.x = rect.left + rect.width / 2
    position.y = rect.top + rect.height / 2 - 5
  }

  /** 触发书写动画 */
  function startWriting() {
    animation.value = 'writing'
  }

  /** 触发蘸墨动画 */
  function startDipInk() {
    animation.value = 'dipInk'
  }

  /** 动画结束回调 */
  function onAnimationEnd() {
    animation.value = 'idle'
  }

  return {
    position,
    animation,
    moveTo,
    startWriting,
    startDipInk,
    onAnimationEnd,
  }
}