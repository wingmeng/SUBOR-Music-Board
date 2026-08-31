<script setup lang="ts">
import { computed } from 'vue'
import type { QuillAnimation } from '../composables/useQuill'

const props = defineProps<{
  x: number
  y: number
  animation: QuillAnimation
  docked?: boolean
  /** 动态模式下是否可见（焦点文本框滚出滚动视口时隐藏） */
  visible?: boolean
}>()

const emit = defineEmits<{
  animationEnd: []
}>()

/** 非 docked 模式下使用动态坐标；不可见时隐藏（随焦点文本框滚出视口） */
const dynamicStyle = computed(() => {
  if (props.docked) return {}
  if (props.visible === false) return { display: 'none' }
  return { left: `${props.x}px`, top: `${props.y}px` }
})
</script>

<template>
  <span
    class="quill"
    :class="{
      writing: props.animation === 'writing' && !props.docked,
      'dip-ink': props.animation === 'dipInk' && !props.docked,
      docked: props.docked,
    }"
    :style="dynamicStyle"
    @animationend.stop="!props.docked && emit('animationEnd')"
  ></span>
</template>

<style scoped>
.quill {
  position: absolute;
  width: 26px;
  aspect-ratio: 42 / 80;
  transform: rotate(120deg);
  background: url(../assets/pen.png) no-repeat;
  background-size: contain;
  pointer-events: none;
  filter: drop-shadow(2px 0 4px #000);
  transition: left 0.2s ease-in-out, top 0.2s ease-in-out, transform 0.4s ease-in-out;
  will-change: left, top, transform;
}

/* 书写动画：笔尖微微晃动 */
.quill.writing {
  animation: write 0.2s;
  animation-composition: add;
}

@keyframes write {
  10% {transform: translate(1px, -3px);}
  35% {transform: translate(4px, 1px);}
  65% {transform: translate(2px, 3px);}
  80% {transform: translate(1px, 4px);}
  85% {transform: translate(1px, 6px);}
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

/* Docked 状态：羽毛笔蘸入墨水瓶（参考 demos/笔动画.html dipInk） */
.quill.docked {
  right: 10px;
  bottom: 30px;
  left: auto;
  top: auto;
  transform: rotate(0deg);
  animation: dipInk 0.6s;
  animation-fill-mode: forwards;
  transition: none;
}
</style>