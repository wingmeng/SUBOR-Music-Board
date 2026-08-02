<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: []
}>()

/** 点击遮罩层关闭（仅当点击的是遮罩本身，而非面板内部） */
function onBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    emit('close')
  }
}

/** Esc 关闭 */
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    v-if="visible"
    class="clear-backdrop"
    @click="onBackdropClick"
  >
    <dialog
      class="nes-dialog"
      open
    >
      <p class="title">确认清空</p>
      <p class="message">此操作将清空所有已输入的内容，不可撤销，是否继续？</p>
      <menu class="dialog-menu">
        <button
          type="button"
          class="nes-btn"
          @click="emit('close')"
        >
          NO
        </button>
        <button
          type="button"
          class="nes-btn is-error"
          @click="emit('confirm')"
        >
          YES
        </button>
      </menu>
    </dialog>
  </div>
</template>

<style scoped>
.clear-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(2px);
}

.nes-dialog {
  position: relative;
  margin: 0;
  max-width: 360px;
  width: 100%;
}

.message {
  margin: 12px 0 16px;
  line-height: 1.5;
}

.dialog-menu {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0;
  margin: 16px 0 0;
}
</style>
