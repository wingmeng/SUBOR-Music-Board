<script setup lang="ts">
import { reactive, toRef, ref, computed, provide } from 'vue'
import Board from './components/Board.vue'
import NotationGrid from './components/NotationGrid.vue'
import ControlBar from './components/ControlBar.vue'
import ExportDialog from './components/ExportDialog.vue'
import ClearDialog from './components/ClearDialog.vue'
import Quill from './components/Quill.vue'
import InkBottle from './components/InkBottle.vue'
import { useNotation } from './composables/useNotation'
import { usePlayback } from './composables/usePlayback'
import { useImportExport } from './composables/useImportExport'
import { useQuill } from './composables/useQuill'
import type { QuillAPI } from './composables/useQuill'
import { DEFAULT_BPM, DEFAULT_KEY_SIGNATURE } from './core/types'
import type { VoiceIndex, Score, InputMode } from './core/types'

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
  resetScore,
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
const showClearDialog = ref(false)
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
  stop()
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

function handleClear() {
  showClearDialog.value = true
}

function handleClearConfirm() {
  stop()
  resetScore()
  showClearDialog.value = false
}

function showHelp() {
  // TODO: 实现帮助内容
  console.log('Help clicked')
}
</script>

<template>
  <div class="board-wrapper">
    <!-- 左侧文件操作栏 -->
    <aside class="side-panel side-left">
      <div class="side-col">
        <button
          type="button"
          class="nes-btn is-small"
          :disabled="playbackState !== 'stopped'"
          @click="handleImport"
        >
          OPEN
        </button>
        <button
          type="button"
          class="nes-btn is-small is-primary"
          :disabled="playbackState !== 'stopped'"
          @click="handleExport"
        >
          SAVE
        </button>
        <button
          type="button"
          class="nes-btn is-small is-error"
          :disabled="playbackState !== 'stopped'"
          @click="handleClear"
        >
          CLEAR
        </button>
      </div>
    </aside>

    <!-- 中央 Board 主体 -->
    <Board>
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
      </template>
      <template #footer>
        <ControlBar
          v-model:speed="config.speed"
          v-model:key-signature="config.keySignature"
          :playback-state="playbackState"
          :loop="loop"
          @play="play"
          @pause="pause"
          @stop="stop"
          @toggle-loop="toggleLoop"
        />
        <ExportDialog
          :visible="showExportDialog"
          @close="showExportDialog = false"
          @confirm="handleExportConfirm"
        />
        <ClearDialog
          :visible="showClearDialog"
          @close="showClearDialog = false"
          @confirm="handleClearConfirm"
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

    <!-- 右侧辅助栏 -->
    <aside class="side-panel side-right">
      <div class="side-col">
        <button
          type="button"
          class="nes-btn is-small is-default"
          title="帮助"
          @click="showHelp"
        >
          <i class="nes-icon heart is-small"></i>
        </button>
        <button
          v-show="playbackState === 'stopped'"
          type="button"
          class="mode-badge"
          :class="{ overwrite: inputMode === 'overwrite' }"
          title="按 Insert 键切换"
          @click="toggleInputMode"
        >
          {{ inputMode === 'insert' ? 'INS' : 'OVR' }}
        </button>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.board-wrapper {
  display: flex;
  gap: 48px;
  min-height: 100vh;
}

.side-panel {
  flex: 1;
  display: flex;
}

.side-left {
  justify-content: flex-end;
  padding-right: 12px;
}

.side-right {
  justify-content: flex-start;
  padding-left: 12px;
}

.side-col {
  display: flex;
  flex-direction: column;
  align-self: flex-start;
  gap: 6px;
  padding-top: 4px;
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