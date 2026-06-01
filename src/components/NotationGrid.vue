<script setup lang="ts">
import { ref, computed, onMounted, nextTick, inject } from 'vue'
import NoteColumn from './NoteColumn.vue'
import type { QuillAPI } from '../composables/useQuill'
import { getMusicEngine } from '../core/music-engine'
import { noteToMidi } from '../core/note-map'
import type { CursorPosition, VoiceIndex, KeySignature, InputMode, PlaybackState } from '../core/types'

const props = defineProps<{
  score: readonly (readonly [string, string, string])[]
  cursor: CursorPosition
  currentPlayColumn?: number
  keySignature: KeySignature
  inputMode: InputMode
  playbackState: PlaybackState
}>()

const isPlaying = computed(() => props.playbackState === 'playing')

const emit = defineEmits<{
  'update:cursor': [col: number, voice: VoiceIndex]
  'update:inputMode': [mode: InputMode]
  'set-note': [col: number, voice: VoiceIndex, char: string]
  'clear-note': [col: number, voice: VoiceIndex]
  'insert-note': [col: number, voice: VoiceIndex, char: string]
  'backspace-at': [col: number, voice: VoiceIndex]
  'delete-at': [col: number, voice: VoiceIndex]
  'play-note': [col: number, voice: VoiceIndex, char: string]
}>()

function setNote(col: number, voice: VoiceIndex, char: string) {
  emit('set-note', col, voice, char)
}

function clearNote(col: number, voice: VoiceIndex) {
  emit('clear-note', col, voice)
}

function insertNoteAt(col: number, voice: VoiceIndex, char: string) {
  emit('insert-note', col, voice, char)
}

function backspaceAtEmit(col: number, voice: VoiceIndex) {
  emit('backspace-at', col, voice)
}

function deleteAtEmit(col: number, voice: VoiceIndex) {
  emit('delete-at', col, voice)
}

function moveCursor(col: number, voice: VoiceIndex) {
  emit('update:cursor', col, voice)
}

const quill = inject<QuillAPI>('quill')!
const engine = getMusicEngine()

const columnRefs = ref<InstanceType<typeof NoteColumn>[]>([])

/** 输入队列：动画进行期间缓存后续输入，保证每格依次处理 */
const inputQueue: { voice: VoiceIndex; char: string }[] = []
/** 书写动画是否正在进行 */
let writingAnimationActive = false
/** 动画期间是否发生了外部导航（方向键移动光标） */
let cursorMovedDuringAnimation = false

/** 方向键节流：长按时限制移动频率，避免焦点切换过快 */
const ARROW_REPEAT_INTERVAL = 120
let lastArrowMoveTime = 0

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

/** 记谱输入 → 更新数据 + 播放声音 + 书写动画 + 前进（支持队列缓冲） */
async function onNoteInput(voice: VoiceIndex, char: string) {
  if (isPlaying.value) return
  if (writingAnimationActive) {
    inputQueue.push({ voice, char })
    return
  }
  await processInput(voice, char)
}

/** 
 * 处理单条用户触发输入：写入数据、播放声音、启动动画（若需要）
 */
async function processInput(voice: VoiceIndex, char: string) {
  // 在异步播放之前标记动画进行中，防止并发输入绕过队列
  if (char.trim() !== '') {
    writingAnimationActive = true
  }

  if (props.inputMode === 'insert') {
    insertNoteAt(props.cursor.col, voice, char)
  } else {
    setNote(props.cursor.col, voice, char)
  }
  await playNote(voice, char)

  // 空格（休止符）无需书写动画，直接前进
  if (char.trim() === '') {
    writingAnimationActive = false
    advanceToNext()
    return
  }

  quill.startWriting()
}

/** 
 * 羽毛笔书写动画结束回调
 * 
 * 在移动光标之前先写入所有队列数据，然后一次性推进光标到最终位置。
 * 这确保数据总在光标到达时已就绪，避免看到空单元格（"空格字符"现象）。
 */
function handleQuillAnimationEnd() {
  writingAnimationActive = false

  if (cursorMovedDuringAnimation) {
    // 动画期间用户手动导航了 → 丢弃队列，不推进光标
    cursorMovedDuringAnimation = false
    inputQueue.length = 0
    return
  }

  const queued = [...inputQueue]
  inputQueue.length = 0
  const baseCol = props.cursor.col

  // 第一步：同步写入所有队列数据到目标列（数据先行）
  for (let i = 0; i < queued.length; i++) {
    const col = baseCol + 1 + i
    const { voice, char } = queued[i]
    if (props.inputMode === 'insert') {
      insertNoteAt(col, voice, char)
    } else {
      setNote(col, voice, char)
    }
  }

  // 第二步：异步播放所有队列音符的声音
  queued.forEach(({ voice, char }) => playNote(voice, char))

  // 第三步：一次性推进光标（原始音符 1 格 + 队列 N 格）
  const steps = 1 + queued.length
  const finalCol = baseCol + steps
  if (finalCol < props.score.length) {
    moveCursor(finalCol, props.cursor.voice)
    focusCell(finalCol, props.cursor.voice)
  }
}

defineExpose({ handleQuillAnimationEnd })

/**
 * Backspace 键处理：
 * - 插入模式：删除前一个 cell，后续左移填补，光标后退
 * - 覆盖模式：清空前一个 cell，光标后退（不移位）
 */
function onNoteBackspace(voice: VoiceIndex) {
  if (isPlaying.value) return
  if (props.inputMode === 'insert') {
    backspaceAtEmit(props.cursor.col, voice)
  } else {
    clearNote(props.cursor.col - 1, voice)
  }
  retreatToPrev()
}

/**
 * Delete 键处理：清空当前 cell 内容，不移位，光标不动（两种模式通用）
 */
function onNoteDelete(voice: VoiceIndex) {
  if (isPlaying.value) return
  deleteAtEmit(props.cursor.col, voice)
}

/** 某格获得焦点 → 同步光标 + 更新羽毛笔位置 */
function onCellFocus(voice: VoiceIndex, colIndex: number) {
  if (isPlaying.value) return
  moveCursor(colIndex, voice)
  nextTick(() => updateQuillPosition())
}

/** 键盘导航（方向键 + Insert 切换模式），节流长按重复事件以确保定位准确 */
function onKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLInputElement
  if (target.tagName !== 'INPUT') return

  // 播放时阻止所有编辑相关按键
  if (isPlaying.value) {
    e.preventDefault()
    return
  }

  // Insert 键：切换插入/覆盖模式
  if (e.key === 'Insert') {
    e.preventDefault()
    emit('update:inputMode', props.inputMode === 'insert' ? 'overwrite' : 'insert')
    return
  }

  const isArrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
  if (!isArrow) return

  // 长按方向键时节流 repeat 事件，避免焦点切换过快导致光标混乱
  if (e.repeat) {
    const now = Date.now()
    if (now - lastArrowMoveTime < ARROW_REPEAT_INTERVAL) {
      e.preventDefault()
      return
    }
    lastArrowMoveTime = now
  } else {
    lastArrowMoveTime = Date.now()
  }

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
    // 导航时清空未处理的输入队列，防止旧输入写入新位置
    inputQueue.length = 0
    // 标记动画期间发生了外部导航，防止动画结束时再推进光标
    if (writingAnimationActive) {
      cursorMovedDuringAnimation = true
    }
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
  <ul class="notation" :class="{ disabled: isPlaying }" @keydown="onKeydown">
    <NoteColumn
      v-for="(col, index) in score"
      :key="index"
      ref="columnRefs"
      :data="col"
      :col-index="index"
      :is-current="index === currentPlayColumn"
      :is-playing="index === currentPlayColumn"
      :disabled="isPlaying"
      @note-input="onNoteInput"
      @note-backspace="onNoteBackspace"
      @note-delete="onNoteDelete"
      @cell-focus="onCellFocus"
    />
  </ul>
</template>

<style scoped>
.notation {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 5px;
  padding: 0 0 8px;
  margin: 0;
  list-style: none;
}

/* 播放时禁用网格交互 */
.notation.disabled {
  pointer-events: none;
}
</style>
