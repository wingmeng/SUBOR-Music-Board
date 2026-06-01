<script setup lang="ts">
import type { PlaybackState } from '../core/types'

const props = defineProps<{
  state: PlaybackState
  loop: boolean
}>()

const emit = defineEmits<{
  play: []
  pause: []
  stop: []
  'toggle-loop': []
}>()

function handlePlayPause() {
  if (props.state === 'playing') {
    emit('pause')
  } else {
    emit('play')
  }
}

function handleStop() {
  emit('stop')
}

function handleToggleLoop() {
  emit('toggle-loop')
}
</script>

<template>
  <div class="playback-control">
    <button
      class="nes-btn is-small pp-btn"
      :class="state === 'playing' ? 'is-warning is-pause' : 'is-primary is-play'"
      :aria-label="state === 'playing' ? '暂停' : '播放'"
      @click="handlePlayPause"
    />
    <button
      class="nes-btn is-small is-error stop-btn"
      :class="{'is-disabled': state === 'stopped'}"
      :disabled="state === 'stopped'"
      aria-label="停止"
      @click="handleStop"
    />
    <label>
      <input 
        :checked="loop"
        type="checkbox" 
        class="nes-checkbox is-dark"
        @change="handleToggleLoop" />
      <span>LOOP</span>
    </label>
  </div>
</template>

<style scoped>
.playback-control {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pp-btn,
.stop-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 38px;
}

/* ---- 播放 / 暂停图标 ---- */
.pp-btn::before {
  content: '';
  display: block;
}

/* 播放：用 border 画三角形 */
.pp-btn.is-play::before {
  width: 0;
  height: 0;
  margin-left: 3px;
  border: solid transparent;
  border-left-color: currentColor;
  border-width: 6px 2px 6px 10px;
}

/* 暂停：用 box-shadow 画两条竖线 */
.pp-btn.is-pause::before {
  width: 4px;
  height: 11px;
  margin-right: 6px;
  background: currentColor;
  border-radius: 1px;
  box-shadow: 6px 0 0 currentColor;
}

/* ---- 停止：实心方块 ---- */
.stop-btn::before {
  content: '';
  display: block;
  width: 11px;
  height: 11px;
  margin-right: 2px;
  background: currentColor;
  border-radius: 1px;
}
</style>
