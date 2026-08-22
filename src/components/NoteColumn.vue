<script setup lang="ts">
import { ref } from 'vue'
import NoteCell from './NoteCell.vue'
import { VOICES, type VoiceIndex } from '../core/types'

const props = defineProps<{
  data: readonly [string, string, string]
  colIndex: number
  isCurrent: boolean
  isPlaying?: boolean
  disabled?: boolean
  pendingAccidental?: string
  pendingOctave?: string
  pendingVoice?: VoiceIndex
}>()

const emit = defineEmits<{
  noteInput: [voice: VoiceIndex, char: string]
  noteBackspace: [voice: VoiceIndex]
  noteDelete: [voice: VoiceIndex]
  cellFocus: [voice: VoiceIndex, colIndex: number]
}>()

/** 暴露子组件 focus 方法，供父组件按 voice 索引调用 */
const cellRefs = ref<InstanceType<typeof NoteCell>[]>([])

function focusVoice(voice: VoiceIndex) {
  cellRefs.value[voice]?.focus()
}

defineExpose({ focusVoice })
</script>

<template>
  <li :class="{ current: isCurrent, playing: isPlaying }">
    <NoteCell
      v-for="v in VOICES"
      ref="cellRefs"
      :key="v.index"
      :value="props.data[v.index]"
      :voice="v.index"
      :disabled="disabled"
      :pending-accidental="v.index === props.pendingVoice ? (props.pendingAccidental || '') : ''"
      :pending-octave="v.index === props.pendingVoice ? (props.pendingOctave || '') : ''"
      @input="emit('noteInput', v.index, $event)"
      @backspace="emit('noteBackspace', v.index)"
      @delete="emit('noteDelete', v.index)"
      @focus="emit('cellFocus', v.index, colIndex)"
    />
  </li>
</template>

<style scoped>
li {
  display: flex;
  flex-direction: column;
  padding-bottom: 5px;
  border-bottom: 2px solid #699;
}

/* 每4列交替颜色区分小节 */
li:nth-child(4n + 3),
li:nth-child(4n + 4) {
  border-color: #c99;
}

.current :deep(.tone) {
  box-shadow: inset 0 0 0 1px #9c3;
}
</style>