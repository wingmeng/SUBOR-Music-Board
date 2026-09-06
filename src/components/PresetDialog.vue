<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { PRESET_LIST } from '../core/presets'
import type { PresetSong } from '../core/presets'

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  select: [song: PresetSong]
}>()

const closeBtn = ref<HTMLButtonElement | null>(null)

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

/** 选中曲目：直接载入并关闭弹窗（loadScore 已进入撤销栈，可 Ctrl+Z 撤回） */
function onSelect(song: PresetSong) {
  emit('select', song)
  emit('close')
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  // 打开时聚焦关闭按钮，便于键盘操作
  requestAnimationFrame(() => closeBtn.value?.focus())
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    v-if="visible"
    class="preset-backdrop"
    @click="onBackdropClick"
  >
    <dialog
      class="preset-dialog"
      open
    >
      <header class="preset-header">
        <span class="preset-mark">♪</span>
        <h2 class="preset-title">内置曲库</h2>
        <button
          ref="closeBtn"
          type="button"
          class="nes-btn preset-close"
          aria-label="关闭"
          title="关闭 (Esc)"
          @click="emit('close')"
        >
          ×
        </button>
      </header>

      <div class="preset-body">
        <ul class="preset-list">
          <li
            v-for="song in PRESET_LIST"
            :key="song.id"
          >
            <button
              type="button"
              class="preset-item"
              @click="onSelect(song)"
            >
              <span class="pi-main">
                <span class="pi-title">{{ song.title }}</span>
                <span class="pi-tags">
                  <span class="pi-tag">1={{ song.keySignature }}</span>
                  <span class="pi-tag">{{ song.bpm }}</span>
                </span>
              </span>
              <span
                v-if="song.description"
                class="pi-desc"
              >{{ song.description }}</span>
            </button>
          </li>
        </ul>
      </div>
    </dialog>
  </div>
</template>

<style scoped>
.preset-backdrop {
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

.preset-dialog {
  position: relative;
  box-sizing: border-box;
  width: min(460px, 100%);
  max-height: 86vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
  color: #fff;
  background: #141414;
  border: 4px solid #fff;
  border-radius: 8px;
  box-shadow: 0 0 0 4px #9fc, 0 12px 40px rgba(0, 0, 0, 0.6);
  font-family: 'Press Start 2P', monospace;
}

.preset-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 3px solid #fff;
}

.preset-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  font-size: 15px;
  color: #9fc;
  border: 2px solid;
  border-radius: 50%;
}

.preset-title {
  flex: 1;
  margin: 0;
  font-size: 20px;
  font-weight: 500;
  letter-spacing: 0.05em;
}

.preset-close {
  width: 26px;
  height: 26px;
  padding: 0;
  font-size: 18px;
}

.preset-body {
  max-height: calc(86vh - 80px);
  padding: 14px 18px;
  overflow-y: auto;
}

.preset-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.preset-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
  box-sizing: border-box;
  width: 100%;
  padding: 9px 10px;
  font-family: inherit;
  font-size: 11px;
  color: #fff;
  text-align: left;
  background: transparent;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-radius: 4px;
  cursor: pointer;
  transition: color 0.15s, background 0.15s, border-color 0.15s;
}

.preset-item:hover,
.preset-item:focus-visible {
  color: #141414;
  background: #9fc;
  border-color: #9fc;
  outline: none;
}

.preset-item:active {
  transform: translateY(1px);
}

.pi-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pi-title {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 12px;
}

.pi-tags {
  display: flex;
  flex-shrink: 0;
  gap: 4px;
}

.pi-tag {
  padding: 2px 5px 0;
  line-height: 1.2;
  font-size: 9px;
  color: #141414;
  background: #9fc;
  border-radius: 3px;
}

.preset-item:hover .pi-tag,
.preset-item:focus-visible .pi-tag {
  background: #141414;
  color: #9fc;
}

.pi-desc {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 9px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.6);
}

.preset-item:hover .pi-desc,
.preset-item:focus-visible .pi-desc {
  color: rgba(20, 20, 20, 0.75);
}
</style>
