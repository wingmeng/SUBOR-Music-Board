<script setup lang="ts">
defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: []
}>()
</script>

<template>
  <dialog
    v-if="visible"
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
</template>

<style scoped>
.nes-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  max-width: 360px;
  width: 90%;
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
