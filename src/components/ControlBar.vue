<script setup lang="ts">
import KeySignature from './KeySignature.vue'
import SpeedControl from './SpeedControl.vue'
import PlaybackControl from './PlaybackControl.vue'
import type { KeySignature as KeySig, PlaybackState, InputMode } from '../core/types'

const speed = defineModel<number>('speed')
const keySignature = defineModel<KeySig>('keySignature')

defineProps<{
  playbackState: PlaybackState
  loop: boolean
  inputMode: InputMode
}>()

const emit = defineEmits<{
  play: []
  pause: []
  stop: []
  'toggle-loop': []
  export: []
  import: []
  'toggle-input-mode': []
}>()
</script>

<template>
  <div class="control-bar">
    <div class="control-bar-group">
      <KeySignature v-model="keySignature!" />
      <SpeedControl v-model="speed!" />
    </div>
    <div class="control-bar-group">
      <button
        type="button"
        class="mode-badge"
        :class="{ overwrite: inputMode === 'overwrite' }"
        title="按 Insert 键切换"
        @click="emit('toggle-input-mode')"
      >
        {{ inputMode === 'insert' ? 'INS' : 'OVR' }}
      </button>
      <PlaybackControl
        :state="playbackState"
        :loop="loop"
        @play="emit('play')"
        @pause="emit('pause')"
        @stop="emit('stop')"
        @toggle-loop="emit('toggle-loop')"
      />
      <button
        type="button"
        class="nes-btn"
        @click="emit('import')"
      >
        OPEN
      </button>
      <button
        type="button"
        class="nes-btn is-primary"
        @click="emit('export')"
      >
        SAVE
      </button>
    </div>
  </div>
</template>

<style scoped>
.control-bar {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 0;
  font-size: 16px;
}

.control-bar-group {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.mode-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3px 8px;
  font-family: inherit;
  font-size: 11px;
  font-weight: bold;
  letter-spacing: 0.04em;
  color: #9fc;
  background: transparent;
  border: 1px solid #9fc;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  transition: color 0.15s, border-color 0.15s;
}

.mode-badge:hover {
  background: rgba(153, 255, 204, 0.08);
}

.mode-badge.overwrite {
  color: #fc9;
  border-color: #fc9;
}

.mode-badge.overwrite:hover {
  background: rgba(255, 204, 153, 0.08);
}
</style>
