<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'

const clickCount = ref(0)
const bouncing = ref(false)
let clickTimer: ReturnType<typeof setTimeout> | null = null

function handleClick() {
  clickCount.value++
  if (clickCount.value >= 10) {
    bouncing.value = true
  }
  // 每次点击重置计时器，停止点击后恢复
  if (clickTimer) {
    clearTimeout(clickTimer)
  }
  clickTimer = setTimeout(() => {
    clickCount.value = 0
    bouncing.value = false
    clickTimer = null
  }, 600)
}

onBeforeUnmount(() => {
  if (clickTimer) {
    clearTimeout(clickTimer)
  }
})
</script>

<template>
  <div class="ink-bottle" :class="{ bouncing }" @click="handleClick">
    <b>INK</b>
  </div>
</template>

<style scoped>
.ink-bottle {
  position: absolute;
  right: 20px;
  bottom: 8px;
  width: fit-content;
  padding: 3px 2px 2px;
  text-align: right;
  font-family: Arial;
  color: #3cc;
  background: linear-gradient(to bottom, transparent 57%, currentColor 0);
  z-index: 10;
  pointer-events: auto;
  user-select: none;
}

.ink-bottle.bouncing {
  animation: ink-bounce 0.3s ease-in-out infinite alternate;
}

@keyframes ink-bounce {
  from { transform: translateY(0); }
  to   { transform: translateY(-8px); }
}

.ink-bottle::before {
  content: '';
  display: block;
  border: 6px solid transparent;
  border-bottom-color: currentColor;
  box-shadow: 0 6px;
}

.ink-bottle::after {
  content: '';
  position: absolute;
  inset: 3px 10px auto;
  height: 1px;
  border-style: solid;
  border-width: 2px 0;
}

.ink-bottle > b {
  display: inline-block;
  padding: 0 2px;
  line-height: 1.15;
  font-size: 14px;
  background: #fff;
  box-shadow: 0 1px 3px;
}
</style>