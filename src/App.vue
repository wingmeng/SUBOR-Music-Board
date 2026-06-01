<script setup lang="ts">
import { reactive, toRef, ref, computed, provide } from 'vue'
import Board from './components/Board.vue'
import NotationGrid from './components/NotationGrid.vue'
import ControlBar from './components/ControlBar.vue'
import ExportDialog from './components/ExportDialog.vue'
import Quill from './components/Quill.vue'
import { useNotation } from './composables/useNotation'
import { usePlayback } from './composables/usePlayback'
import { useImportExport } from './composables/useImportExport'
import { useQuill } from './composables/useQuill'
import type { QuillAPI } from './composables/useQuill'
import { DEFAULT_BPM, DEFAULT_KEY_SIGNATURE } from './core/types'
import type { VoiceIndex, Score, InputMode } from './core/types'
import InkBottle from './components/InkBottle.vue'

const {
  score,
  cursor,
  setNote,
  clearNote,
  insertNoteAt,
  backspaceAt,
  deleteAt,
  moveCursor,
  loadScore,
} = useNotation()

const config = reactive({
  speed: DEFAULT_BPM,
  keySignature: DEFAULT_KEY_SIGNATURE,
})

const {
  state: playbackState,
  currentColumn: playColumn,
  loop,
  play,
  pause,
  stop,
  toggleLoop,
} = usePlayback({
  score,
  bpm: toRef(config, 'speed'),
  keySignature: toRef(config, 'keySignature'),
})

const { exportScore, importScore } = useImportExport({
  bpm: config.speed,
  keySignature: config.keySignature,
  score: score as Score,
  onImport: (data) => {
    config.speed = data.bpm
    config.keySignature = data.keySignature
    loadScore(data.score)
  },
})

const showExportDialog = ref(false)
const inputMode = ref<InputMode>('insert')

const quill = useQuill()
provide<QuillAPI>('quill', quill)

const notationGridRef = ref<InstanceType<typeof NotationGrid>>()

const isPlaying = computed(() => playbackState.value === 'playing')

function onQuillAnimationEnd() {
  quill.onAnimationEnd()
  notationGridRef.value?.handleQuillAnimationEnd()
}

function toggleInputMode() {
  inputMode.value = inputMode.value === 'insert' ? 'overwrite' : 'insert'
}

function handleCursorUpdate(col: number, voice: VoiceIndex) {
  moveCursor(col, voice)
}

function handleSetNote(col: number, voice: VoiceIndex, char: string) {
  setNote(col, voice, char)
}

function handleClearNote(col: number, voice: VoiceIndex) {
  clearNote(col, voice)
}

function handleInsertNote(col: number, voice: VoiceIndex, char: string) {
  insertNoteAt(col, voice, char)
}

function handleBackspaceAt(col: number, voice: VoiceIndex) {
  backspaceAt(col, voice)
}

function handleDeleteAt(col: number, voice: VoiceIndex) {
  deleteAt(col, voice)
}

function handleExport() {
  pause()
  showExportDialog.value = true
}

function handleExportConfirm(title: string, description: string) {
  exportScore(title, description)
  showExportDialog.value = false
}

function handleImport() {
  stop()
  importScore()
}
</script>

<template>
  <Board :show-ink-bottle="playbackState === 'playing'">
    <template #grid>
      <NotationGrid
        ref="notationGridRef"
        :score="score"
        :cursor="cursor"
        :current-play-column="playColumn"
        :key-signature="config.keySignature"
        :input-mode="inputMode"
        :playback-state="playbackState"
        @update:input-mode="inputMode = $event"
        @update:cursor="handleCursorUpdate"
        @set-note="handleSetNote"
        @clear-note="handleClearNote"
        @insert-note="handleInsertNote"
        @backspace-at="handleBackspaceAt"
        @delete-at="handleDeleteAt"
      />
      <ControlBar
        v-model:speed="config.speed"
        v-model:key-signature="config.keySignature"
        :playback-state="playbackState"
        :loop="loop"
        :input-mode="inputMode"
        @play="play"
        @pause="pause"
        @stop="stop"
        @toggle-loop="toggleLoop"
        @toggle-input-mode="toggleInputMode"
        @export="handleExport"
        @import="handleImport"
      />
      <ExportDialog
        :visible="showExportDialog"
        @close="showExportDialog = false"
        @confirm="handleExportConfirm"
      />
    </template>
    <template #overlay>
      <Quill
        :x="quill.position.x"
        :y="quill.position.y"
        :animation="quill.animation.value"
        :docked="isPlaying"
        @animation-end="onQuillAnimationEnd"
      />
      <InkBottle />
    </template>
  </Board>
</template>