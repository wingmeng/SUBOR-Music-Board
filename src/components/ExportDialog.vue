<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: [title: string, description: string]
}>()

const title = ref('')
const description = ref('')
const titleValid = computed(() => title.value.trim().length > 0)

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
    class="export-backdrop"
    @click="onBackdropClick"
  >
    <dialog
      class="nes-dialog"
      open
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
            CLOSE
          </button>
          <button
            type="submit"
            class="nes-btn is-primary"
            :class="{'is-disabled': !titleValid}"
            :disabled="!titleValid"
          >
            SAVE
          </button>
        </menu>
      </form>
    </dialog>
  </div>
</template>

<style scoped>
.export-backdrop {
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
  max-width: 400px;
  width: 100%;
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
