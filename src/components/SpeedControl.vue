<script setup lang="ts">
import { computed } from 'vue'
import { BPM_LIST, DEFAULT_BPM } from '../core/types'

const modelValue = defineModel<number>({ default: DEFAULT_BPM })

const currentIndex = computed(() => {
  const idx = BPM_LIST.indexOf(modelValue.value as any)
  return idx === -1 ? BPM_LIST.indexOf(DEFAULT_BPM as any) : idx
})
const isBeginning = computed(() => currentIndex.value === 0)
const isEnd = computed(() => currentIndex.value === BPM_LIST.length - 1)

function changeSpeed(increment: number) {
  const nextIndex = currentIndex.value + increment
  if (nextIndex < 0 || nextIndex >= BPM_LIST.length) {
    return
  }
  modelValue.value = BPM_LIST[nextIndex]
}
</script>

<template>
  <ul class="speed-control">
    <li>
      <button 
        class="nes-btn is-symbol"
        :class="{'is-disabled': isBeginning}"
        :disabled="isBeginning"
        @click="changeSpeed(-1)">&lt;SLOW</button>
    </li>
    <li
      v-for="(bpm, i) of BPM_LIST"
      :key="bpm"
      class="bpm-point"
      :class="{ current: i === currentIndex }"
    ></li>
    <li>
      <button 
        class="nes-btn is-symbol"
        :class="{'is-disabled': isEnd}"
        :disabled="isEnd"
        @click="changeSpeed(1)">FAST&gt;</button>
    </li>
  </ul>
</template>

<style scoped>
.speed-control {
  display: flex;
  align-items: center;
  gap: 0.25em;
  font-size: 14px;
}

.bpm-point {
  width: 0.9em;
  padding: 6px 0;
  color: #98e800;
  background: linear-gradient(#fff, #fff) center no-repeat;
  background-size: 100% 2px;
}
.bpm-point.current {
  box-shadow: 0 0 0 2px, 
              inset 0 2px, 
              inset 0 -2px;
}
</style>