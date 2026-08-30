<script setup lang="ts">
import { reactive, toRef, ref, computed, provide, watch, onMounted, onBeforeUnmount } from 'vue'
import Board from './components/Board.vue'
import NotationGrid from './components/NotationGrid.vue'
import ControlBar from './components/ControlBar.vue'
import ExportDialog from './components/ExportDialog.vue'
import ClearDialog from './components/ClearDialog.vue'
import HelpDialog from './components/HelpDialog.vue'
import Quill from './components/Quill.vue'
import InkBottle from './components/InkBottle.vue'
import { useNotation } from './composables/useNotation'
import { usePlayback } from './composables/usePlayback'
import { useImportExport } from './composables/useImportExport'
import { useQuill } from './composables/useQuill'
import type { QuillAPI } from './composables/useQuill'
import { DEFAULT_BPM, DEFAULT_KEY_SIGNATURE } from './core/types'
import type { VoiceIndex, Score } from './core/types'

const {
  score,
  cursor,
  setNote,
  insertNoteAt,
  backspaceAt,
  deleteAt,
  moveCursor,
  loadScore,
  resetScore,
  ensureColumns,
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
  togglePlayPause,
  seek,
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
const showHelpDialog = ref(false)

const quill = useQuill()
provide<QuillAPI>('quill', quill)

const notationGridRef = ref<InstanceType<typeof NotationGrid>>()

const isPlaying = computed(() => playbackState.value === 'playing')

/** 当网格可见列数增加时，自动扩展乐谱数据以填充更多行 */
watch(
  () => notationGridRef.value?.visibleColumns,
  (cols) => {
    if (cols != null && cols > score.length) {
      ensureColumns(cols)
    }
  },
)

function onQuillAnimationEnd() {
  quill.onAnimationEnd()
  notationGridRef.value?.handleQuillAnimationEnd()
}

function handleCursorUpdate(col: number, voice: VoiceIndex) {
  moveCursor(col, voice)
}

function handleSetNote(col: number, voice: VoiceIndex, char: string) {
  setNote(col, voice, char)
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

function openHelp() {
  showHelpDialog.value = true
}

/** 任意弹框打开时，挂起全局快捷键，避免弹框叠加 */
const anyDialogOpen = computed(
  () => showExportDialog.value || showClearDialog.value || showHelpDialog.value,
)

/** 全局快捷键：P 播放/暂停切换，Ctrl/Cmd+S 保存（导出乐谱），Ctrl/Cmd+I 打开（导入乐谱） */
function onGlobalKeydown(e: KeyboardEvent) {
  if (anyDialogOpen.value) return

  // P 键：播放中暂停 / 暂停中恢复 / 停止时开始播放（等同 PLAY）
  // 用 e.code 判断物理键位，不受中文输入法影响；带修饰键时不拦截（保留 Ctrl+P 打印）
  if (e.code === 'KeyP' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    if (e.repeat || e.isComposing) return
    e.preventDefault()
    void togglePlayPause()
    return
  }

  if (!(e.ctrlKey || e.metaKey)) return
  const key = e.key.toLowerCase()
  if (key === 's') {
    e.preventDefault()
    handleExport()
  } else if (key === 'i') {
    e.preventDefault()
    handleImport()
  }
}

onMounted(() => document.addEventListener('keydown', onGlobalKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onGlobalKeydown))
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
          <div class="shortcut">Ctl + I</div>
        </button>
        <button
          type="button"
          class="nes-btn is-small is-primary"
          :disabled="playbackState !== 'stopped'"
          @click="handleExport"
        >
          SAVE
          <div class="shortcut">Ctl + S</div>
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
          :playback-state="playbackState"
          @update:cursor="handleCursorUpdate"
          @set-note="handleSetNote"
          @insert-note="handleInsertNote"
          @backspace-at="handleBackspaceAt"
          @delete-at="handleDeleteAt"
          @seek="seek"
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
        <HelpDialog
          :visible="showHelpDialog"
          @close="showHelpDialog = false"
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
          class="help-btn"
          title="使用帮助"
          aria-label="使用帮助"
          @click="openHelp"
        >
          ?
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

.help-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  font-family: inherit;
  font-size: 17px;
  font-weight: bold;
  line-height: 1;
  color: #9fc;
  background: transparent;
  border: 2px solid #9fc;
  border-radius: 50%;
  cursor: pointer;
  user-select: none;
  transition: color 0.15s, background 0.15s, box-shadow 0.15s;
}

.help-btn:hover {
  color: #141414;
  background: #9fc;
  box-shadow: 0 0 0 2px rgba(153, 255, 204, 0.4);
}

.help-btn:active {
  transform: translateY(1px);
}
</style>