<script setup lang="ts">
import { computed } from 'vue'
import { KEY_SIGNATURES, DEFAULT_KEY_SIGNATURE } from '../core/types'
import type { KeySignature } from '../core/types'

const modelValue = defineModel<KeySignature>({ default: DEFAULT_KEY_SIGNATURE })
const isBeginning = computed(() => KEY_SIGNATURES.indexOf(modelValue.value) === 0)
const isEnd = computed(() => KEY_SIGNATURES.indexOf(modelValue.value) === KEY_SIGNATURES.length - 1)

function prevKey() {
  const idx = KEY_SIGNATURES.indexOf(modelValue.value)

  if (idx > 0) {
    modelValue.value = KEY_SIGNATURES[idx - 1]
  }
}

function nextKey() {
  const idx = KEY_SIGNATURES.indexOf(modelValue.value)
  
  if (idx < KEY_SIGNATURES.length - 1) {
    modelValue.value = KEY_SIGNATURES[idx + 1]
  }
}
</script>

<template>
  <div class="key-signature">
    <button
      class="nes-btn is-symbol"
      :class="{'is-disabled': isBeginning}"
      :disabled="isBeginning"
      @click="prevKey"
    >&lt;</button>
    <span class="key-display">1={{ modelValue }}</span>
    <button
      class="nes-btn is-symbol"
      :class="{'is-disabled': isEnd}"
      :disabled="isEnd"
      @click="nextKey"
    >&gt;</button>
  </div>
</template>

<style scoped>
.key-signature {
  display: flex;
  align-items: center;
  gap: 0.25em;
  font-size: 14px;
}

.key-display {
  padding: 0 0.3em;
  white-space: nowrap;
}
</style>