<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, inject, watch } from 'vue'
import NoteColumn from './NoteColumn.vue'
import type { QuillAPI } from '../composables/useQuill'
import { getMusicEngine } from '../core/music-engine'
import { noteToMidi } from '../core/note-map'
import type { CursorPosition, VoiceIndex, KeySignature, PlaybackState } from '../core/types'
import { isValidNoteChar } from '../core/types'

const props = defineProps<{
  score: readonly (readonly [string, string, string])[]
  cursor: CursorPosition
  currentPlayColumn?: number
  keySignature: KeySignature
  playbackState: PlaybackState
}>()

const isPlaying = computed(() => props.playbackState === 'playing')

const emit = defineEmits<{
  'update:cursor': [col: number, voice: VoiceIndex]
  'set-note': [col: number, voice: VoiceIndex, char: string]
  'insert-note': [col: number, voice: VoiceIndex, char: string]
  'backspace-at': [col: number, voice: VoiceIndex]
  'delete-at': [col: number, voice: VoiceIndex]
  'play-note': [col: number, voice: VoiceIndex, char: string]
  'seek': [col: number]
}>()

/** 程序性聚焦（方向键导航 / 输入推进）时抑制 seek，只有用户点击才移动恢复点 */
let suppressSeekOnFocus = false

function setNote(col: number, voice: VoiceIndex, char: string) {
  emit('set-note', col, voice, char)
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

/** 待决升降号（# / b），最多 1 个，输入数字后拼合提交 */
const pendingAccidental = ref('')

/** 待决八度修饰符（. / ,），最多 1 个，输入数字后拼合提交 */
const pendingOctave = ref('')

/** 清空待决修饰符（光标移动 / 播放 / 对话框 等） */
function clearPending() {
  pendingAccidental.value = ''
  pendingOctave.value = ''
}

/** 输入队列：动画进行期间缓存后续输入，保证每格依次处理 */
const inputQueue: { voice: VoiceIndex; char: string }[] = []
/** 书写动画是否正在进行 */
let writingAnimationActive = false
/** 动画期间是否发生了外部导航（方向键移动光标） */
let cursorMovedDuringAnimation = false
/** 输入是否已被取消（撤销/重做触发）：动画结束后不再落盘队列数据、不再推进光标 */
let inputCancelled = false

/** 方向键节流：长按时限制移动频率，避免焦点切换过快 */
const ARROW_REPEAT_INTERVAL = 120
let lastArrowMoveTime = 0

/** 音符键长按重复：首次输入后的初始延迟（ms），略短于系统默认以更快响应长按意图 */
const NOTE_REPEAT_INITIAL_DELAY = 350
/** 音符键长按重复：每次重复输入的间隔（ms），约每秒 9 次，节奏清晰可控 */
const NOTE_REPEAT_INTERVAL = 110
/** 当前按住待重复的音符字符；为 null 表示没有活跃的长按重复 */
let repeatChar: string | null = null
/** 长按重复定时器句柄 */
let repeatTimer: ReturnType<typeof setTimeout> | null = null

/** 行高估算值（em 单位，3个 NoteCell × 2em + padding-bottom 5px + border 2px） */
const ROW_HEIGHT_ESTIMATE_EM = 6.5
/** 行间距（px，对应 gap: 5px 中的行 gap） */
const ROW_GAP_PX = 5
/** 列间距（px，对应 gap: 5px 中的列 gap） */
const COLUMN_GAP_PX = 5
/** 网格上下内边距（px，对应 padding: 8px 0） */
const GRID_PADDING_Y = 16
/** 单列宽度（em，对应 NoteCell .tone width: 1.2em） */
const COLUMN_WIDTH_EM = 1.2
/** 播放跟随滚动的提前量（行）：播放头行贴底时额外露出 N 行，避免总在最底边阅读 */
const PLAY_SCROLL_LOOKAHEAD_ROWS = 1

const gridRef = ref<HTMLElement | null>(null)
/** 每行实际列数（根据容器宽度动态计算） */
const columnsPerRow = ref(25)
/** 当前可见行数 */
const visibleRows = ref(5)

let resizeObserver: ResizeObserver | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 根据容器尺寸计算每行列数和可显示行数
 * 考虑：容器可用宽度、单列宽度、列间距、容器可用高度、单行高度、行间距、网格内边距
 */
function calculateLayout() {
  const container = gridRef.value?.parentElement
  if (!container) {
    return
  }

  // 从网格容器获取实际 font-size，因为列宽基于 em 单位，必须用渲染时的实际值
  const fontSize = parseFloat(getComputedStyle(gridRef.value!).fontSize) || 16

  // ── 计算每行列数 ──
  const containerWidth = container.clientWidth
  const colWidthPx = COLUMN_WIDTH_EM * fontSize
  // 第一列无左间距，后续每列增加一个 gap
  const colsFromWidth = Math.floor(
    (containerWidth + COLUMN_GAP_PX) / (colWidthPx + COLUMN_GAP_PX)
  )
  columnsPerRow.value = Math.max(1, colsFromWidth)

  // ── 计算可见行数 ──
  const containerHeight = container.clientHeight

  // 动态测量单行高度，若尚未渲染则使用估算值
  const firstColumn = gridRef.value?.querySelector(':scope > li') as HTMLElement | null
  let rowHeight: number
  if (firstColumn) {
    rowHeight = firstColumn.offsetHeight
  } else {
    rowHeight = ROW_HEIGHT_ESTIMATE_EM * fontSize
  }

  const availableHeight = containerHeight - GRID_PADDING_Y
  const rowsFromHeight = Math.floor(
    (availableHeight + ROW_GAP_PX) / (rowHeight + ROW_GAP_PX)
  )

  // 计算单屏可容纳的行数：仅用于乐谱数据补齐（不再限制渲染行数——
  // 超出部分由 flex-wrap 自动换行生成新行，超出容器高度时由滚动条承接）
  visibleRows.value = Math.max(1, rowsFromHeight)
}

/** 防抖版布局计算，避免 ResizeObserver 高频触发导致过度计算 */
function debouncedCalculateLayout() {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    calculateLayout()
    debounceTimer = null
  }, 150)
}

/** 可视容量（列）：单屏可容纳的列数 = 行数 × 每行列数，仅用于乐谱数据补齐（不再限制渲染） */
const visibleColumns = computed(() => visibleRows.value * columnsPerRow.value)

/** 聚焦到指定列的指定声部（程序性聚焦，不触发 seek） */
function focusCell(col: number, voice: VoiceIndex) {
  if (col < 0) {
    return
  }

  suppressSeekOnFocus = true
  const doFocus = () => {
    // HTMLElement.focus() 同步派发 focus 事件，标记在调用前后包裹即可
    columnRefs.value[col]?.focusVoice(voice)
    suppressSeekOnFocus = false
  }

  if (col < columnRefs.value.length) {
    doFocus()
  } else {
    // 乐谱数据刚扩展、目标列尚未渲染：等渲染完成后再聚焦（浏览器会自动滚动到可见区域）
    nextTick(doFocus)
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
    quill.setVisible(true)
    quill.moveTo(el)
  } else {
    quill.setVisible(false)
  }
}

/** 滚动同步的 rAF 句柄（0 = 空闲） */
let quillScrollRaf = 0
/** 滚动容器元素（.board-scroll），供 scroll 监听绑定/解绑 */
let scrollBoxEl: HTMLElement | null = null

/**
 * 滚动时把羽毛笔重新吸附到当前焦点文本框：
 * - 文本框仍在滚动视口内 → 更新位置（跟随文本框）
 * - 文本框滚出视口 / 焦点不在网格 → 隐藏羽毛笔
 * 播放中（docked）不处理，羽毛笔固定于墨水瓶。
 */
function syncQuillWithScroll() {
  const el = getActiveInput()
  if (!scrollBoxEl) {
    return
  }
  if (!el || el.tagName !== 'INPUT') {
    quill.setVisible(false)
    return
  }

  const elRect = el.getBoundingClientRect()
  const boxRect = scrollBoxEl.getBoundingClientRect()
  const inView =
    elRect.bottom > boxRect.top &&
    elRect.top < boxRect.bottom &&
    elRect.right > boxRect.left &&
    elRect.left < boxRect.right

  quill.setVisible(inView)
  if (inView) {
    quill.moveTo(el)
  }
}

/** scroll 事件入口：rAF 节流，避免高频滚动导致过度重算 */
function onScrollSyncQuill() {
  if (isPlaying.value) {
    return
  }
  if (quillScrollRaf !== 0) {
    return
  }
  quillScrollRaf = requestAnimationFrame(() => {
    quillScrollRaf = 0
    syncQuillWithScroll()
  })
}

/**
 * 播放跟随滚动：把播放头所在列滚入可视区域（仅在乐谱超出一屏、出现滚动条时生效）
 *
 * - 播放头行在可视区上方（长乐谱循环回卷 / 跳转回开头）→ 该行顶部对齐到容器顶部
 * - 播放头行贴到或超出底部 → 向下翻行，并额外露出 LOOKAHEAD 行，避免总在底边阅读
 * - 整份乐谱一屏放得下（无滚动条）→ 不改动滚动位置
 * - 向下翻行用平滑滚动；向上/回卷即时跳转，避免长距离平滑动画拖尾
 */
function scrollPlayheadIntoView(col: number) {
  const box = scrollBoxEl
  const grid = gridRef.value

  if (!box || !grid || col < 0) {
    return
  }
  // 内容未超出容器：没有滚动条，无需定位
  if (box.scrollHeight <= box.clientHeight + 1) {
    return
  }

  const el = grid.children[col] as HTMLElement | undefined
  if (!el) {
    return
  }

  // 用 rect 差值换算位置，避免依赖 offsetParent（.board-scroll 为 static 定位）
  const boxRect = box.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()
  const rowTop = elRect.top - boxRect.top + box.scrollTop
  const rowBottom = elRect.bottom - boxRect.top + box.scrollTop

  const viewBottom = box.scrollTop + box.clientHeight
  const stride = el.offsetHeight + ROW_GAP_PX

  let target: number | null = null
  if (rowTop < box.scrollTop) {
    target = rowTop
  } else if (rowBottom + PLAY_SCROLL_LOOKAHEAD_ROWS * stride > viewBottom) {
    target = rowBottom + PLAY_SCROLL_LOOKAHEAD_ROWS * stride - box.clientHeight
  }
  if (target === null) {
    return
  }

  const clamped = Math.max(0, Math.min(target, box.scrollHeight - box.clientHeight))
  if (Math.abs(clamped - box.scrollTop) < 1) {
    return
  }

  box.scrollTo({ top: clamped, behavior: clamped < box.scrollTop ? 'auto' : 'smooth' })
}

/** 前进到下一格（向右，同声部）；越过数据末尾时由 moveCursor 自动扩展乐谱 */
function advanceToNext() {
  const nextCol = props.cursor.col + 1

  moveCursor(nextCol, props.cursor.voice)
  focusCell(nextCol, props.cursor.voice)
}

/** 后退到上一格（向左，同声部） */
function retreatToPrev() {
  const prevCol = props.cursor.col - 1

  if (prevCol >= 0) {
    moveCursor(prevCol, props.cursor.voice)
    focusCell(prevCol, props.cursor.voice)
  }
}

/** 播放单个音符（延音线不播放声音） */
async function playNote(voice: VoiceIndex, char: string) {
  if (char === '-') {
    return
  }

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
  if (isPlaying.value) {
    return
  }

  // 修饰符（来自 IME input 事件路径）：暂存，不提交
  // keydown 路径的修饰符在 onDocumentKeydown 中直接处理，不走 onNoteInput
  if (char === '#' || char === 'b') {
    if (voice === props.cursor.voice) {
      pendingAccidental.value = char
    }
    return
  }
  if (char === '.' || char === ',') {
    if (voice === props.cursor.voice) {
      pendingOctave.value = char
    }
    return
  }

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
    // 新输入启动动画：重置可能残留的"输入已取消"标志，保证动画结束后正常落盘与推进
    inputCancelled = false
  }

  // 空格（休止符）与延音线 - 插入当前格并右移后续内容；音符直接覆盖当前格
  if (char === ' ' || char === '-') {
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
  // 撤销/重做取消的输入：动画结束后丢弃队列，不落盘、不推进光标
  if (inputCancelled) {
    inputCancelled = false
    writingAnimationActive = false
    inputQueue.length = 0
    return
  }

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

    // 空格与延音线 - 插入并右移后续内容；音符覆盖
    // 注：每个输入光标固定前进 1 格，写入列不受此前插入的影响
    if (char === ' ' || char === '-') {
      insertNoteAt(col, voice, char)
    } else {
      setNote(col, voice, char)
    }
  }

  // 第二步：异步播放所有队列音符的声音
  queued.forEach(({ voice, char }) => playNote(voice, char))

  // 第三步：一次性推进光标（原始音符 1 格 + 队列 N 格）
  // 越过数据末尾时由 moveCursor 自动扩展乐谱
  const steps = 1 + queued.length
  const finalCol = baseCol + steps

  moveCursor(finalCol, props.cursor.voice)
  focusCell(finalCol, props.cursor.voice)
}

/**
 * 归位到左上角第一个格子（初始化 / 导入 / 清空后调用）：
 * 光标与羽毛笔一并回到 (0,0) 并显示，滚动容器同时回到顶部。
 * 显式 moveCursor + nextTick 更新位置，避免"目标格已聚焦导致 focus 事件不触发"的边界。
 */
function focusHome() {
  moveCursor(0, 0)
  // 滚动容器滚回顶部，确保 (0,0) 在视口内、羽毛笔可见
  if (scrollBoxEl) {
    scrollBoxEl.scrollTop = 0
    scrollBoxEl.scrollLeft = 0
  }
  focusCell(0, 0)
  nextTick(updateQuillPosition)
}

/**
 * 撤销/重做前调用：取消一切待处理的输入（长按重复、待决修饰符、动画队列），
 * 防止旧输入在乐谱被恢复后继续落盘或推进光标。
 * 无条件置 inputCancelled：即使此刻无活跃动画，也能拦截"动画结束事件迟到"的
 * 残留推进；残留标志会在下一次输入启动动画时（processInput）自动复位。
 */
function cancelPendingInput() {
  inputCancelled = true
  clearNoteRepeat()
  clearPending()
  inputQueue.length = 0
  writingAnimationActive = false
  cursorMovedDuringAnimation = false
}

defineExpose({
  handleQuillAnimationEnd,
  visibleColumns,
  focusHome,
  focusCell,
  cancelPendingInput,
})

/**
 * Backspace 键处理：删除前一个 cell，后续左移填补（与空格插入对称），光标后退
 */
function onNoteBackspace(voice: VoiceIndex) {
  if (isPlaying.value) {
    return
  }

  backspaceAtEmit(props.cursor.col, voice)
  retreatToPrev()
}

/**
 * Delete 键处理：清空当前 cell 内容，不移位，光标不动（两种模式通用）
 */
function onNoteDelete(voice: VoiceIndex) {
  if (isPlaying.value) {
    return
  }
  deleteAtEmit(props.cursor.col, voice)
}

/** 某格获得焦点 → 清除待决修饰符 + 同步光标 + 更新羽毛笔位置 */
function onCellFocus(voice: VoiceIndex, colIndex: number) {
  if (isPlaying.value) {
    return
  }

  // 暂停态下用户点击网格 → 播放恢复点同步移到该列（编辑光标照常移动）
  // 方向键导航 / 输入推进的程序性聚焦已被 suppressSeekOnFocus 抑制
  if (props.playbackState === 'paused' && !suppressSeekOnFocus) {
    emit('seek', colIndex)
  }

  clearPending()
  moveCursor(colIndex, voice)
  nextTick(() => updateQuillPosition())
}

/** 清除长按重复定时器（松开按键 / 播放开始 / 到达末尾 / 卸载 时调用） */
function clearNoteRepeat() {
  if (repeatTimer !== null) {
    clearTimeout(repeatTimer)
    repeatTimer = null
  }
  repeatChar = null
}

/**
 * 触发一次音符输入（写入数据 + 播放声音 + 羽毛笔书写动画 + 队列缓冲），
 * 供首次按下与长按重复共用。
 *
 * 走标准输入路径 onNoteInput → processInput，确保动画与声音完整触发：
 * - 首次输入启动书写动画，写入当前格
 * - 动画期间到达的重复输入自动进入 inputQueue，
 *   由 handleQuillAnimationEnd 在动画结束时批量写入并推进光标
 * 到达最后一列、对话框打开或开始播放时停止重复，避免越界写入。
 */
function commitNoteChar(char: string) {
  if (document.querySelector('dialog[open]') || isPlaying.value) {
    clearNoteRepeat()
    clearPending()
    return
  }

  // 走标准输入路径（写入 + 声音 + 羽毛笔动画 + 队列缓冲），
  // 而非直接 setNote/insertNoteAt + moveCursor（那条路径绕过了动画
  void onNoteInput(props.cursor.voice, char)
}

/** 处理方向键导航和全局音符输入（供 grid 内和 document 级共用） */
function onDocumentKeydown(e: KeyboardEvent) {
  // 对话框打开时不拦截任何按键，避免干扰对话框内交互
  if (document.querySelector('dialog[open]')) {
    return
  }

  // 播放时阻止所有编辑相关按键
  if (isPlaying.value) {
    e.preventDefault()
    return
  }

  // 处理方向键导航
  const isArrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
  if (isArrow) {
    handleArrowKey(e)
    return
  }

  // 处理 Backspace：有待决修饰符时先清除，否则删除前一格
  if (e.key === 'Backspace') {
    e.preventDefault()
    if (pendingOctave.value) {
      pendingOctave.value = ''
      return
    }
    if (pendingAccidental.value) {
      pendingAccidental.value = ''
      return
    }
    backspaceAtEmit(props.cursor.col, props.cursor.voice)
    retreatToPrev()
    return
  }

  // 处理 Delete：有待决修饰符时清除，否则删除当前格
  if (e.key === 'Delete') {
    e.preventDefault()
    if (pendingAccidental.value || pendingOctave.value) {
      clearPending()
      return
    }
    deleteAtEmit(props.cursor.col, props.cursor.voice)
    return
  }

  // 处理音符字符输入（单字符且非控制键）
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    // 兼容中文输入法：全角逗号 ，/ 句号 。 自动转为半角 ,/.
    const char = e.key === '，' ? ',' : e.key === '。' ? '.' : e.key

    // 验证是否为合法音符字符
    if (!isValidNoteChar(char)) {
      return
    }

    // 浏览器自动 repeat 事件交由自定义定时器统一处理，
    // 保证重复间隔稳定、松开按键立即停止，不依赖系统键盘重复率
    if (e.repeat) {
      e.preventDefault()
      return
    }

    e.preventDefault()

    // ── 修饰符：暂存，不提交，不启动长按重复 ──
    // # / b：升降号，最多 1 个，重复输入后者覆盖前者
    if (char === '#' || char === 'b') {
      pendingAccidental.value = char
      return
    }

    // . / ,：八度修饰符，最多 1 个，重复输入后者覆盖前者
    if (char === '.' || char === ',') {
      pendingOctave.value = char
      return
    }

    // ── 可提交字符（数字 1-7 / 空格 / 延音线 -）──
    // 空格和延音线只能单独输入，有待决修饰符时忽略
    if ((char === ' ' || char === '-') && (pendingAccidental.value || pendingOctave.value)) {
      return
    }

    // 拼合修饰符后提交（首次输入包含修饰符，如 "#.1"）
    const prefix = pendingAccidental.value
    const octave = pendingOctave.value
    clearPending()
    commitNoteChar(prefix + octave + char)

    // 清理可能残留的旧定时器（多键切换场景），并启动长按重复
    // 重复的是原始字符（不含修饰符，修饰符只应用于首次输入）
    if (repeatTimer !== null) {
      clearTimeout(repeatTimer)
    }
    repeatChar = char
    repeatTimer = setTimeout(function tick() {
      if (repeatChar === null) {
        return
      }
      commitNoteChar(repeatChar)
      if (repeatChar !== null) {
        repeatTimer = setTimeout(tick, NOTE_REPEAT_INTERVAL)
      }
    }, NOTE_REPEAT_INITIAL_DELAY)
  }
}

/** 处理方向键导航（供 grid 内和 document 级共用） */
function handleArrowKey(e: KeyboardEvent) {
  // 播放时阻止所有编辑相关按键
  if (isPlaying.value) {
    e.preventDefault()
    return
  }

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
    case 'ArrowUp': {
      if (voice > 0) {
        voice = (voice - 1) as VoiceIndex
      }
      handled = true
      break
    }
    case 'ArrowDown': {
      if (voice < 2) {
        voice = (voice + 1) as VoiceIndex
      }
      handled = true
      break
    }
    case 'ArrowLeft': {
      if (col > 0) {
        col--
      }
      handled = true
      break
    }
    case 'ArrowRight': {
      if (col < props.score.length - 1) {
        col++
      }
      handled = true
      break
    }
  }

  if (handled) {
    e.preventDefault()
    clearPending()
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

/** 松开按键 → 立即停止长按重复输入 */
function onDocumentKeyup(e: KeyboardEvent) {
  if (repeatChar !== null && e.key === repeatChar) {
    clearNoteRepeat()
  }
}

// 开始播放时立即停止长按重复并清除待决修饰符，防止播放期间继续写入
// 同时把播放头滚入视野：从暂停点续播 / 长乐谱 seek 后播放也能立刻看到当前列
watch(isPlaying, (playing) => {
  if (playing) {
    clearNoteRepeat()
    clearPending()
    nextTick(() => scrollPlayheadIntoView(props.currentPlayColumn ?? 0))
  }
})

// 播放头推进时跟随滚动：仅在列真正越出可视区时才改动 scrollTop，行内推进为空操作
watch(
  () => props.currentPlayColumn,
  (col) => {
    if (!isPlaying.value || col == null) {
      return
    }
    scrollPlayheadIntoView(col)
  },
)

onMounted(() => {
  focusCell(0, 0)
  nextTick(() => {
    updateQuillPosition()
    // 首次渲染后计算布局
    calculateLayout()
  })

  // 全局监听方向键，确保输入框失焦时仍可移动光标
  document.addEventListener('keydown', onDocumentKeydown)
  // 全局监听 keyup，松开按键时停止长按重复
  document.addEventListener('keyup', onDocumentKeyup)

  // 监听容器尺寸变化（窗口缩放、字体大小变化等）
  const container = gridRef.value?.parentElement
  if (container) {
    resizeObserver = new ResizeObserver(debouncedCalculateLayout)
    resizeObserver.observe(container)
    // 监听滚动：滚动时让羽毛笔跟随上次编辑的文本框（滚出视口则隐藏）
    scrollBoxEl = container
    container.addEventListener('scroll', onScrollSyncQuill, { passive: true })
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onDocumentKeydown)
  document.removeEventListener('keyup', onDocumentKeyup)
  clearNoteRepeat()
  resizeObserver?.disconnect()
  resizeObserver = null
  scrollBoxEl?.removeEventListener('scroll', onScrollSyncQuill)
  scrollBoxEl = null
  if (quillScrollRaf !== 0) {
    cancelAnimationFrame(quillScrollRaf)
    quillScrollRaf = 0
  }
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
})
</script>

<template>
  <ul ref="gridRef" class="notation" :class="{ disabled: isPlaying }">
    <NoteColumn
      v-for="(col, index) in score"
      :key="index"
      ref="columnRefs"
      :data="col"
      :col-index="index"
      :is-current="index === currentPlayColumn"
      :is-playing="index === currentPlayColumn"
      :disabled="isPlaying"
      :pending-accidental="index === props.cursor.col ? pendingAccidental : ''"
      :pending-octave="index === props.cursor.col ? pendingOctave : ''"
      :pending-voice="props.cursor.voice"
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
  gap: 5px;
  padding: 8px 0;
  margin: 0;
  list-style: none;
}

/* 播放时禁用网格交互 */
.notation.disabled {
  pointer-events: none;
}
</style>
