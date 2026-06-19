<script setup lang="ts">
import KeySignature from './KeySignature.vue'
import SpeedControl from './SpeedControl.vue'
import PlaybackControl from './PlaybackControl.vue'
import type { KeySignature as KeySig, PlaybackState } from '../core/types'

const speed = defineModel<number>('speed')
const keySignature = defineModel<KeySig>('keySignature')

defineProps<{
  playbackState: PlaybackState
  loop: boolean
}>()

const emit = defineEmits<{
  play: []
  pause: []
  stop: []
  'toggle-loop': []
}>()
</script>

<template>
  <div class="control-bar">
    <div class="control-bar-group">
      <KeySignature v-model="keySignature!" />
      <SpeedControl v-model="speed!" />
    </div>
    <div class="control-bar-group">
      <PlaybackControl
        :state="playbackState"
        :loop="loop"
        @play="emit('play')"
        @pause="emit('pause')"
        @stop="emit('stop')"
        @toggle-loop="emit('toggle-loop')"
      />
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
</style>
