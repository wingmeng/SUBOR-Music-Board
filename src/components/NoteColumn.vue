<script setup lang="ts">
import { ref } from 'vue'
import NoteCell from './NoteCell.vue'
import type { VoiceIndex } from '../core/types'

const props = defineProps<{
  data: readonly [string, string, string]
  colIndex: number
  isCurrent: boolean
  isPlaying?: boolean
}>()

const emit = defineEmits<{
  noteInput: [voice: VoiceIndex, char: string]
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
      v-for="(note, voice) in props.data"
      :key="voice"
      ref="cellRefs"
      :value="note"
      :voice="voice as VoiceIndex"
      @input="emit('noteInput', voice as VoiceIndex, $event)"
      @delete="emit('noteDelete', voice as VoiceIndex)"
      @focus="emit('cellFocus', voice as VoiceIndex, colIndex)"
    />
  </li>
</template>

<style scoped>
li {
  display: flex;
  flex-direction: column;
  padding-bottom: 2px;
  border-bottom: 2px solid #699;
}

/* 每4列交替颜色区分小节 */
li:nth-child(4n + 3),
li:nth-child(4n + 4) {
  border-color: #c99;
}

.current :deep(input) {
  box-shadow: inset 0 0 0 1px #9c3;
}
</style>