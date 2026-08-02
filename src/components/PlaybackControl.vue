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

function handlePlay() {
  emit('play')
}

function handlePause() {
  emit('pause')
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
      v-show="state !== 'playing'"
      type="button"
      class="nes-btn is-small is-primary play-btn"
      @click="handlePlay"
    >
      PLAY
    </button>
    <button
      v-show="state === 'playing'"
      type="button"
      class="nes-btn is-small is-warning pause-btn"
      @click="handlePause"
    >
      PAUSE
    </button>
    <button
      type="button"
      class="nes-btn is-small is-error stop-btn"
      :disabled="state === 'stopped'"
      @click="handleStop"
    >
      STOP
    </button>
    <label>
      <input
        :checked="loop"
        type="checkbox"
        class="nes-checkbox is-dark"
        @change="handleToggleLoop"
      />
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

.play-btn,
.pause-btn,
.stop-btn {
  min-width: 52px;
}
</style>
