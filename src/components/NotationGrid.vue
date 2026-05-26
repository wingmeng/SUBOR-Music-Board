<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import NoteColumn from './NoteColumn.vue'
import Quill from './Quill.vue'
import { useQuill } from '../composables/useQuill'
import { getMusicEngine } from '../core/music-engine'
import { noteToMidi } from '../core/note-map'
import type { CursorPosition, VoiceIndex, KeySignature } from '../core/types'

const props = defineProps<{
  score: readonly (readonly [string, string, string])[]
  cursor: CursorPosition
  currentPlayColumn?: number
  keySignature: KeySignature
}>()

const emit = defineEmits<{
  'update:cursor': [col: number, voice: VoiceIndex]
  'set-note': [col: number, voice: VoiceIndex, char: string]
  'clear-note': [col: number, voice: VoiceIndex]
  'play-note': [col: number, voice: VoiceIndex, char: string]
}>()

function setNote(col: number, voice: VoiceIndex, char: string) {
  emit('set-note', col, voice, char)
}

function clearNote(col: number, voice: VoiceIndex) {
  emit('clear-note', col, voice)
}

function moveCursor(col: number, voice: VoiceIndex) {
  emit('update:cursor', col, voice)
}

const quill = useQuill()
const engine = getMusicEngine()

const columnRefs = ref<InstanceType<typeof NoteColumn>[]>([])

/** 聚焦到指定列的指定声部 */
function focusCell(col: number, voice: VoiceIndex) {
  if (col >= 0 && col < columnRefs.value.length) {
    columnRefs.value[col]?.focusVoice(voice)
  }
}

/** 获取当前焦点 input 元素，用于羽毛笔定位 */
function getActiveInput(): HTMLElement | null {
  return document.activeElement as HTMLElement
}

/** 更新羽毛笔位置到当前焦点元素 */
function updateQuillPosition() {
  const el = getActiveInput()
  if (el && el.tagName === 'INPUT') {
    quill.moveTo(el)
  }
}

/** 前进到下一格（向右，同声部） */
function advanceToNext() {
  const nextCol = props.cursor.col + 1
  if (nextCol < props.score.length) {
    moveCursor(nextCol, props.cursor.voice)
    focusCell(nextCol, props.cursor.voice)
  }
}

/** 后退到上一格（向左，同声部） */
function retreatToPrev() {
  const prevCol = props.cursor.col - 1
  if (prevCol >= 0) {
    moveCursor(prevCol, props.cursor.voice)
    focusCell(prevCol, props.cursor.voice)
  }
}

/** 播放单个音符 */
async function playNote(voice: VoiceIndex, char: string) {
  if (!engine.isInitialized()) {
    await engine.init()
  }
  const midi = noteToMidi(char, props.keySignature)
  if (midi !== null) {
    engine.playNote(voice, midi, 0.2)
  }
}

/** 记谱输入 → 更新数据 + 播放声音 + 书写动画 + 前进 */
async function onNoteInput(voice: VoiceIndex, char: string) {
  setNote(props.cursor.col, voice, char)
  await playNote(voice, char)
  quill.startWriting()
}

/** 羽毛笔书写动画结束 → 前进到下一格 */
function onQuillAnimationEnd() {
  quill.onAnimationEnd()
  advanceToNext()
}

/** 删除 → 清除当前格 + 后退 */
function onNoteDelete(voice: VoiceIndex) {
  clearNote(props.cursor.col, voice)
  retreatToPrev()
}

/** 某格获得焦点 → 同步光标 + 更新羽毛笔位置 */
function onCellFocus(voice: VoiceIndex, colIndex: number) {
  moveCursor(colIndex, voice)
  nextTick(() => updateQuillPosition())
}

/** 键盘导航（方向键） */
function onKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLInputElement
  if (target.tagName !== 'INPUT') return

  let col = props.cursor.col
  let voice = props.cursor.voice
  let handled = false

  switch (e.key) {
    case 'ArrowUp':
      if (voice > 0) {
        voice = (voice - 1) as VoiceIndex
      }
      handled = true
      break
    case 'ArrowDown':
      if (voice < 2) {
        voice = (voice + 1) as VoiceIndex
      }
      handled = true
      break
    case 'ArrowLeft':
      if (col > 0) {
        col--
      }
      handled = true
      break
    case 'ArrowRight':
      if (col < props.score.length - 1) {
        col++
      }
      handled = true
      break
  }

  if (handled) {
    e.preventDefault()
    moveCursor(col, voice)
    focusCell(col, voice)
  }
}

onMounted(() => {
  focusCell(0, 0)
  nextTick(() => updateQuillPosition())
})
</script>

<template>
  <div class="notation-wrapper">
    <ul class="notation" @keydown="onKeydown">
      <NoteColumn
        v-for="(col, index) in score"
        :key="index"
        ref="columnRefs"
        :data="col"
        :col-index="index"
        :is-current="index === currentPlayColumn"
        :is-playing="index === currentPlayColumn"
        @note-input="onNoteInput"
        @note-delete="onNoteDelete"
        @cell-focus="onCellFocus"
      />
    </ul>
    <Quill
      :x="quill.position.x"
      :y="quill.position.y"
      :animation="quill.animation.value"
      @animation-end="onQuillAnimationEnd"
    />
  </div>
</template>

<style scoped>
.notation-wrapper {
  position: relative;
}

.notation {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 5px;
  padding: 0 0 8px;
  margin: 0;
  list-style: none;
}
</style>