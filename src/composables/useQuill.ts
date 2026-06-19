import { ref, reactive, type Ref } from 'vue'

export type QuillAnimation = 'idle' | 'writing' | 'dipInk'

export interface QuillAPI {
  position: { x: number; y: number }
  animation: Ref<QuillAnimation>
  moveTo: (el: HTMLElement) => void
  startWriting: () => void
  onAnimationEnd: () => void
  startDipInk: () => void
}

export function useQuill(): QuillAPI {
  const position = reactive({ x: 0, y: 0 })
  const animation = ref<QuillAnimation>('idle')

  /**
   * 水平偏移量：羽毛笔经 rotate(120deg) 旋转后，
   * 笔尖视觉位置距元素左边缘的偏移。
   * 将元素的 left 左移此偏移量，即可让笔尖对齐目标位置。
   */
  const TIP_OFFSET_X = 0

  /** 更新羽毛笔位置（基于 .board-body 的 absolute 坐标系） */
  function moveTo(el: HTMLElement) {
    const elRect = el.getBoundingClientRect()
    const container = document.querySelector('.board-body') as HTMLElement | null
    
    if (container) {
      const containerRect = container.getBoundingClientRect()
      position.x = elRect.left + elRect.width / 2 - containerRect.left - TIP_OFFSET_X
      position.y = elRect.top + elRect.height / 2 - 5 - containerRect.top
    } else {
      // 降级：使用 viewport 坐标系
      position.x = elRect.left + elRect.width / 2 - TIP_OFFSET_X
      position.y = elRect.top + elRect.height / 2 - 5
    }
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