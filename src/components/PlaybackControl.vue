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
      class="nes-btn is-small"
      :class="state === 'playing' ? 'is-warning' : 'is-primary'"
      @click="handlePlayPause"
    >
      {{ state === 'playing' ? 'PAUSE' : 'PLAY' }}
    </button>
    <button
      class="nes-btn is-small is-error"
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
        @change="handleToggleLoop" />
      <span>LOOP</span>
    </label>
  </div>
</template>

<style scoped>
.playback-control {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
