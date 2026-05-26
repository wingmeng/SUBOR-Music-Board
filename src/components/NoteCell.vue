<script setup lang="ts">
import { ref, computed } from 'vue'
import { isValidNoteChar, parseNoteValue, type VoiceIndex } from '../core/types'

const inputRef = ref<HTMLInputElement | null>(null)

const props = defineProps<{
  value: string
  voice: VoiceIndex
}>()

const emit = defineEmits<{
  input: [char: string]
  delete: []
  focus: []
}>()

/** 是否聚焦中 */
const isFocused = ref(false)

/** 待决前缀（升降号 #/b） */
const pendingAccidental = ref('')

/** 待决八度修饰符：`.` 高音，`,` 低音，前缀输入 */
const pendingOctave = ref('')

/** 解析完整记谱值，生成input显示内容 */
const noteDisplay = computed(() => parseNoteValue(props.value))

/** 八度CSS类：待决 > 已存储 */
const octaveClass = computed(() => {
  return pendingToClass(pendingOctave.value) || noteDisplay.value.octaveClass
})

/** 将待决后缀转为CSS类名：.. → s2（倍高音），. → s1（高音），,, → s-2（倍低音），, → s-1（低音） */
function pendingToClass(suffix: string): string {
  if (suffix.endsWith('..')) return 's2'
  if (suffix.endsWith('.'))  return 's1'
  if (suffix.endsWith(',,')) return 's-2'
  if (suffix.endsWith(','))  return 's-1'
  return ''
}

/** 动态 maxlength：有 pending 修饰符时开放到 4 以容纳后续输入 */
const inputMaxlength = computed(() => {
  return pendingAccidental.value || pendingOctave.value ? 4 : 1
})

/** input 显示的文本：聚焦时显示完整值（含升降号），未聚焦时只显示数字 */
const displayValue = computed(() => {
  if (pendingAccidental.value) return pendingAccidental.value
  if (isFocused.value) return noteDisplay.value.display
  return noteDisplay.value.display.replace(/^[#b]/, '')
})

/** 升降号字符（未聚焦时在 input 左侧显示） */
const accidentalChar = computed(() => {
  if (isFocused.value) return ''
  if (pendingAccidental.value) return pendingAccidental.value
  const d = noteDisplay.value.display
  if (d.startsWith('#')) return '#'
  if (d.startsWith('b')) return 'b'
  return ''
})

/** 是否正在抖动（非法输入反馈） */
const shaking = ref(false)

function onInput(e: Event) {
  const target = e.target as HTMLInputElement
  const char = target.value

  if (!isValidNoteChar(char)) {
    target.value = ''
    shaking.value = false
    requestAnimationFrame(() => {
      shaking.value = true
    })
    return
  }

  // 空格：直接发射休止符
  if (char === ' ') {
    const suffix = pendingOctave.value
    pendingAccidental.value = ''
    pendingOctave.value = ''
    target.value = ''
    emit('input', ' ' + suffix)
    return
  }

  // 升降号前缀：存入待决，input显示前缀字符
  if (char === '#' || char === 'b') {
    pendingAccidental.value = char
    target.value = ''
    return
  }

  // 八度修饰符：. 高音，, 低音，最多 2 级，不能混用
  if (char === '.' || char === ',') {
    // 已达上限或与现有方向冲突 → 忽略
    if (pendingOctave.value.length >= 2) return
    if (pendingOctave.value && pendingOctave.value[0] !== char) return
    pendingOctave.value += char
    target.value = ''
    return
  }

  // 数字 1-7：拼合前缀 + 数字 + 后缀，完整发射
  const prefix = pendingAccidental.value
  const suffix = pendingOctave.value
  pendingAccidental.value = ''
  pendingOctave.value = ''
  target.value = ''
  emit('input', prefix + char + suffix)
}

function onDelete(_e: Event) {
  if (pendingOctave.value) {
    pendingOctave.value = pendingOctave.value.slice(0, -1)
    return
  }
  if (pendingAccidental.value) {
    pendingAccidental.value = ''
    return
  }
  emit('delete')
}



function onKeydown(e: KeyboardEvent) {
  // 选中当前内容，使新输入覆盖旧值
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
    const target = e.target as HTMLInputElement
    target.select()
  }

  // 退格键：直接在组件内处理，避免触发 onInput 的抖动
  if (e.key === 'Backspace') {
    e.preventDefault()
    e.stopPropagation()
    onDelete(e)
  }
}

function onBlur() {
  isFocused.value = false
  pendingAccidental.value = ''
  pendingOctave.value = ''
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
  <span class="tone" :class="octaveClass" @click="focus()">
    <span v-if="accidentalChar" class="acc">{{ accidentalChar }}</span>
    <input
      ref="inputRef"
      type="text"
      :value="displayValue === '' ? '' : displayValue"
      :maxlength="inputMaxlength"
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
  line-height: 1.15;
}

/* 升降号标记：在 input 左侧显示 # 或 b */
.acc {
  position: absolute;
  left: -0.05em;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.75em;
  line-height: 1;
  pointer-events: none;
  color: #fff;
}

.tone::before,
.tone::after {
  position: absolute;
  left: 50%;
  width: 1em;
  line-height: 0.4;
  pointer-events: none;
  color: #fff;
}

.tone.s1::before,
.tone.s2::before {
  top: -0.15em;
  transform: translate(-50%, -100%);
}

.tone.s1::before { content: '▪'; }
.tone.s2::before { content: '▪▪'; }

/* 低音标记：音符下方加点 */
.tone.s-1::after,
.tone.s-2::after {
  bottom: 0.2em;
  transform: translate(-50%, 100%);
}

.tone.s-1::after { content: '▪'; }
.tone.s-2::after { content: '▪▪'; }

input {
  display: block;
  width: auto;
  min-width: 1em;
  max-width: 1em;
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
}

input:focus {
  max-width: 2.6em;
}

.shake {
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
