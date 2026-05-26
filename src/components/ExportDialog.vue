<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: [title: string, description: string]
}>()

const title = ref('')
const description = ref('')

function handleConfirm() {
  const trimmedTitle = title.value.trim()
  if (!trimmedTitle) {
    return
  }
  emit('confirm', trimmedTitle, description.value.trim())
  resetForm()
}

function handleCancel() {
  emit('close')
  resetForm()
}

function resetForm() {
  title.value = ''
  description.value = ''
}
</script>

<template>
  <dialog
    class="nes-dialog"
    :open="visible"
  >
    <p class="title">导出乐谱</p>
    <form
      method="dialog"
      @submit.prevent="handleConfirm"
    >
      <div class="nes-field">
        <label for="export-title">标题</label>
        <input
          id="export-title"
          v-model="title"
          type="text"
          class="nes-input"
          placeholder="请输入乐谱标题"
          maxlength="50"
          required
        >
      </div>
      <div class="nes-field">
        <label for="export-desc">简介（可选）</label>
        <textarea
          id="export-desc"
          v-model="description"
          class="nes-textarea"
          placeholder="描述一下这首曲子..."
          rows="3"
          maxlength="200"
        />
      </div>
      <menu class="dialog-menu">
        <button
          type="button"
          class="nes-btn"
          @click="handleCancel"
        >
          取消
        </button>
        <button
          type="submit"
          class="nes-btn is-primary"
          :disabled="!title.trim()"
        >
          导出
        </button>
      </menu>
    </form>
  </dialog>
</template>

<style scoped>
.nes-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  max-width: 400px;
  width: 90%;
}

.nes-field {
  margin-bottom: 16px;
}

.nes-field label {
  display: block;
  margin-bottom: 4px;
}

.dialog-menu {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0;
  margin: 16px 0 0;
}
</style>
