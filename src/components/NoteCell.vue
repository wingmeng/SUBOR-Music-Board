<script setup lang="ts">
import { ref, computed } from 'vue'
import { isValidNoteChar, parseNoteValue, type VoiceIndex } from '../core/types'

const inputRef = ref<HTMLInputElement | null>(null)

const props = defineProps<{
  value: string
  voice: VoiceIndex
  disabled?: boolean
  pendingAccidental?: string
  pendingOctave?: string
}>()

const emit = defineEmits<{
  input: [char: string]
  backspace: []
  delete: []
  focus: []
}>()

/** 是否聚焦中 */
const isFocused = ref(false)

/** 解析完整记谱值，生成input显示内容 */
const noteDisplay = computed(() => parseNoteValue(props.value))

/** 八度CSS类：待决 > 已存储 */
const octaveClass = computed(() => {
  return pendingToClass(props.pendingOctave || '') || noteDisplay.value.octaveClass
})

/** 将待决后缀转为CSS类名：. → s1（高音），, → s-1（低音） */
function pendingToClass(suffix: string): string {
  if (suffix.endsWith('.')) {
    return 's1'
  }
  if (suffix.endsWith(',')) {
    return 's-1'
  }
  return ''
}

/** 动态 maxlength：有 pending 修饰符时开放到 3 以容纳后续输入 */
const inputMaxlength = computed(() => {
  return props.pendingAccidental || props.pendingOctave ? 3 : 1
})

/** input 显示的文本：待决升降号优先显示，聚焦时显示完整值，未聚焦时只显示数字 */
const displayValue = computed(() => {
  if (props.pendingAccidental) {
    return props.pendingAccidental
  }
  if (isFocused.value) {
    return noteDisplay.value.display
  }
  return noteDisplay.value.display.replace(/^[#b]/, '')
})

/** 升降号字符（未聚焦时在 input 左侧显示） */
const accidentalChar = computed(() => {
  if (isFocused.value) {
    return ''
  }
  if (props.pendingAccidental) {
    return props.pendingAccidental
  }
  const d = noteDisplay.value.display
  if (d.startsWith('#')) {
    return '#'
  }
  if (d.startsWith('b')) {
    return 'b'
  }
  return ''
})

/** 是否正在抖动（非法输入反馈） */
const shaking = ref(false)

/**
 * input 事件安全网：NotationGrid 的全局 keydown 调用 preventDefault 后，
 * 正常键盘输入不会触发此事件。仅处理粘贴/IME 等边缘情况——重置为受控值。
 *
 * 特殊处理：中文输入法下全角逗号 ，/ 句号 。 通过 IME input 事件到达
 *（keydown 被 IME 拦截为 'Process'），需转换为半角后转发给 NotationGrid
 *  的修饰符暂存逻辑。
 */
function onInput(e: Event) {
  const target = e.target as HTMLInputElement

  if (e instanceof InputEvent && ['deleteContentForward', 'deleteContentBackward', 'deleteByCut'].includes(e.inputType)) {
    return
  }

  // 读取用户实际输入的内容
  const input = target.value

  // 全角逗号/句号 → 半角，转发给 NotationGrid 修饰符暂存
  if (input.includes('，') || input.includes('。')) {
    target.value = displayValue.value === '' ? '' : displayValue.value
    emit('input', input.includes('，') ? ',' : '.')
    return
  }

  // 重置为受控值，丢弃任何非法输入
  target.value = displayValue.value === '' ? '' : displayValue.value

  // 非法输入时触发抖动反馈
  if (input && !isValidNoteChar(input)) {
    shaking.value = false
    requestAnimationFrame(() => {
      shaking.value = true
    })
  }
}

function onKeydown(e: KeyboardEvent) {
  // 长按字符键时节流 repeat 事件，防止大量重复输入
  if (e.repeat && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
    e.preventDefault()
    return
  }

  // 选中当前内容，使新输入覆盖旧值（视觉反馈）
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
    const target = e.target as HTMLInputElement
    target.select()
  }
}

function onBlur() {
  isFocused.value = false
}

function onAnimationEnd() {
  shaking.value = false
}

function onFocus() {
  isFocused.value = true
  emit('focus')
}

function focus() {
  inputRef.value?.focus()
}

defineExpose({ focus })
</script>

<template>
  <span class="tone" :class="[octaveClass, { disabled }]">
    <span v-if="accidentalChar" class="acc">{{ accidentalChar }}</span>
    <input
      ref="inputRef"
      type="text"
      :value="displayValue === '' ? '' : displayValue"
      :maxlength="inputMaxlength"
      :readonly="disabled"
      autocomplete="off"
      :class="{ shake: shaking }"
      @input="onInput"
      @keydown="onKeydown"
      @focus="onFocus"
      @blur="onBlur"
      @animationend="onAnimationEnd"
    />
  </span>
</template>

<style scoped>
.tone {
  position: relative;
  display: inline-block;
  width: 1em;
  line-height: 1.6;
}

/* 升降号标记：在 input 左侧显示 # 或 b */
.acc {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.4em;
  line-height: 1;
  pointer-events: none;
  color: #fff;
}

.tone::before,
.tone::after {
  position: absolute;
  left: 50%;
  font-size: 0.5em;
}

/* 高音标记：音符上方加点 */
.tone.s1::before {
  content: '▪';
  top: 0;
  transform: translate(-50%, -100%);
}

/* 低音标记：音符下方加点 */
.tone.s-1::after {
  content: '▪';
  bottom: 0;
  transform: translate(-50%, 50%);
}

input {
  display: block;
  width: auto;
  min-width: 1em;
  height: 1em;
  box-sizing: border-box;
  text-align: center;
  font-size: 100%;
  color: #fff;
  background: transparent;
  border: none;
  outline: none;
  caret-color: transparent;
  overflow: hidden;
  field-sizing: content;

  &:focus {outline: 1px dotted;}
}

/* 播放禁用状态 */
.tone.disabled input {
  cursor: not-allowed;
}

.shake {
  outline: 1px solid;
  animation: shake 0.8s ease-in-out;
}

@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
  50% { transform: translate3d(-4px, 0, 0); }
}
</style>
