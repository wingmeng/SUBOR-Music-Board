<script setup lang="ts">
import { reactive, toRef, ref } from 'vue'
import Board from './components/Board.vue'
import NotationGrid from './components/NotationGrid.vue'
import ControlBar from './components/ControlBar.vue'
import ExportDialog from './components/ExportDialog.vue'
import { useNotation } from './composables/useNotation'
import { usePlayback } from './composables/usePlayback'
import { useImportExport } from './composables/useImportExport'
import { DEFAULT_BPM, DEFAULT_KEY_SIGNATURE } from './core/types'
import type { KeySignature, VoiceIndex, Score } from './core/types'

const {
  score,
  cursor,
  setNote,
  clearNote,
  moveCursor,
  loadScore,
} = useNotation()

const config = reactive({
  speed: DEFAULT_BPM,
  keySignature: DEFAULT_KEY_SIGNATURE as KeySignature,
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

function handleCursorUpdate(col: number, voice: VoiceIndex) {
  moveCursor(col, voice)
}

function handleSetNote(col: number, voice: VoiceIndex, char: string) {
  setNote(col, voice, char)
}

function handleClearNote(col: number, voice: VoiceIndex) {
  clearNote(col, voice)
}

function handleExport() {
  showExportDialog.value = true
}

function handleExportConfirm(title: string, description: string) {
  exportScore(title, description)
  showExportDialog.value = false
}

function handleImport() {
  importScore()
}
</script>

<template>
  <Board>
    <NotationGrid
      :score="score"
      :cursor="cursor"
      :current-play-column="playColumn"
      :key-signature="config.keySignature"
      @update:cursor="handleCursorUpdate"
      @set-note="handleSetNote"
      @clear-note="handleClearNote"
    />
    <ControlBar
      v-model:speed="config.speed"
      v-model:key-signature="config.keySignature"
      :playback-state="playbackState"
      :loop="loop"
      @play="play"
      @pause="pause"
      @stop="stop"
      @toggle-loop="toggleLoop"
      @export="handleExport"
      @import="handleImport"
    />
    <ExportDialog
      :visible="showExportDialog"
      @close="showExportDialog = false"
      @confirm="handleExportConfirm"
    />
  </Board>
</template>