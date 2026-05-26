<script setup lang="ts">
import type { QuillAnimation } from '../composables/useQuill'

const props = defineProps<{
  x: number
  y: number
  animation: QuillAnimation
}>()

const emit = defineEmits<{
  animationEnd: []
}>()
</script>

<template>
  <span
    class="quill"
    :class="{
      writing: props.animation === 'writing',
      'dip-ink': props.animation === 'dipInk',
    }"
    :style="{ left: props.x + 'px', top: props.y + 'px' }"
    @animationend="emit('animationEnd')"
  ></span>
</template>

<style scoped>
.quill {
  position: fixed;
  width: 26px;
  aspect-ratio: 42 / 80;
  transform: rotate(120deg);
  background: url(../assets/pen.png) no-repeat;
  background-size: contain;
  pointer-events: none;
  z-index: 10;
  transition: left 0.2s ease-in-out, top 0.2s ease-in-out;
  will-change: left, top;
}

/* 书写动画：笔尖微微晃动 */
.quill.writing {
  animation: write 0.5s linear;
}

@keyframes write {
  15% { transform: rotate(120deg) translate(1px, 8px); }
  30% { transform: rotate(120deg) translate(2px, 10px); }
  45% { transform: rotate(120deg) translate(3px, 6px); }
  60% { transform: rotate(120deg) translate(3px, 3px); }
  80% { transform: rotate(120deg) translate(2px, 6px); }
}

/* 蘸墨动画：笔身转正，上下蘸取 */
.quill.dip-ink {
  animation: dipInk 0.6s;
  transform: rotate(0deg);
}

@keyframes dipInk {
  20%, 80% { transform: rotate(0deg) translateY(3px); }
  50% { transform: rotate(0deg) translateY(0); }
}
</style>