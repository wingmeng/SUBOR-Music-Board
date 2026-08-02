<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
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
    class="help-backdrop"
    @click="onBackdropClick"
  >
    <dialog
      class="help-dialog"
      open
    >
      <header class="help-header">
        <span class="help-mark">?</span>
        <h2 class="help-title">使用帮助</h2>
        <button
          ref="closeBtn"
          type="button"
          class="nes-btn help-close"
          aria-label="关闭"
          title="关闭 (Esc)"
          @click="emit('close')"
        >
          ×
        </button>
      </header>

      <div class="help-body">
        <!-- 一、主要功能 -->
        <section class="help-section">
          <h3 class="help-h3">主要功能</h3>
          <ul class="help-list">
            <li>
              <span class="hl-label">记谱输入</span>
              用键盘直接在当前高亮方格中写入简谱。<strong>每格为一个八分音符</strong>，写入后光标自动右移。
            </li>
            <li>
              <span class="hl-label">输入模式</span>
              <b>INS</b>（插入）：所输音符插入光标处，并将后续内容整体右移。
              <b>OVR</b>（覆盖）：直接替换光标所在格，不移动后续内容。
            </li>
            <li>
              <span class="hl-label">调号 / 速度</span>
              在底部控制栏选择调号 C D E F G A B♭ E♭ 与速度 BPM 60–135。
            </li>
            <li>
              <span class="hl-label">播放控制</span>
              <b>PLAY</b>（播放）、<b>PAUSE</b>（暂停）、<b>STOP</b>（停止）；勾选 <b>LOOP</b> 可循环播放。
            </li>
            <li>
              <span class="hl-label">文件操作</span>
              左侧 <b>OPEN</b> 导入乐谱，<b>SAVE</b> 将当前乐谱导出为 <code>*.subor.json</code>，<b>CLEAR</b> 清空当前全部内容。
            </li>
          </ul>
        </section>

        <!-- 二、记谱语法 -->
        <section class="help-section">
          <h3 class="help-h3">记谱语法</h3>
          <p>
            三声部记谱，从上到下依次为 <b>主旋律</b>（方波）、<b>和弦律</b>（方波）、<b>低频</b>（三角波）。每列三个声部对应同一节拍。
          </p>
          <div class="kbd-grid">
            <div class="kbd-item"><kbd>1</kbd>–<kbd>7</kbd><span>唱名 do re mi fa sol la si（中音）</span></div>
            <div class="kbd-item"><kbd>#</kbd> / <kbd>b</kbd><span>升号 / 降号，先按再输数字即生效，如 <code>#4</code> <code>b3</code></span></div>
            <div class="kbd-item"><kbd>,</kbd> / <kbd>.</kbd><span>低音（下加点）/ 高音（上加点），先按再输数字即生效，如 <code>,1</code> <code>.5</code></span></div>
            <div class="kbd-item"><kbd>-</kbd><span>延音线，延续前一个音符时值</span></div>
            <div class="kbd-item"><kbd>空格</kbd><span>休止符（静音一拍）</span></div>
          </div>
        </section>

        <!-- 三、快捷键 -->
        <section class="help-section">
          <h3 class="help-h3">快捷键（编辑模式可用）</h3>
          <table class="help-table">
            <tbody>
              <tr>
                <td class="k"><kbd class="font-fix">↑</kbd> <kbd class="font-fix">↓</kbd></td>
                <td>光标在声部间上下移动</td>
              </tr>
              <tr>
                <td class="k"><kbd class="font-fix">←</kbd> <kbd class="font-fix">→</kbd></td>
                <td>光标在列间左右移动</td>
              </tr>
              <tr>
                <td class="k"><kbd>Insert</kbd></td>
                <td>切换 INS（插入）/ OVR（覆盖）模式</td>
              </tr>
              <tr>
                <td class="k"><kbd>Backspace</kbd></td>
                <td>删除上一格，光标后退</td>
              </tr>
              <tr>
                <td class="k"><kbd>Delete</kbd></td>
                <td>清空当前格，光标不动</td>
              </tr>
              <tr>
                <td class="k"><kbd>Ctrl</kbd> + <kbd>I</kbd></td>
                <td>OPEN（打开、导入乐谱）</td>
              </tr>
              <tr><td class="k"><kbd>Ctrl</kbd> + <kbd>S</kbd></td>
                <td>SAVE（保存、导出乐谱）</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </dialog>
  </div>
</template>

<style scoped>
.help-backdrop {
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

.help-dialog {
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

.help-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 3px solid #fff;
}

.help-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  font-size: 16px;
  color: #9fc;
  border: 2px solid;
  border-radius: 50%;
}

.help-title {
  flex: 1;
  margin: 0;
  font-size: 20px;
  font-weight: 500;
  letter-spacing: 0.05em;
}

.help-close {
  width: 26px;
  height: 26px;
  padding: 0;
  font-size: 18px;
}

.help-body {
  max-height: calc(86vh - 80px);
  padding: 14px 18px;
  overflow-y: auto;
  line-height: 1.7;
  font-size: 11px;
}

.help-section + .help-section {
  margin-top: 16px;
}

.help-h3 {
  margin: 0 0 8px;
  padding-left: 8px;
  font-size: 12px;
  font-weight: 400;
  color: #9fc;
  border-left: 4px solid;
}

.help-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.help-list li {
  margin-bottom: 8px;
  padding-left: 2px;
}

.hl-label {
  display: inline-block;
  margin-right: 6px;
  padding: 1px 6px;
  font-size: 10px;
  color: #141414;
  background: #9fc;
  border-radius: 4px;
}

.help-list b,
.help-h3 b {
  color: #fc9;
}

.kbd-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.kbd-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.kbd-item span {
  flex: 1;
}

.help-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.help-table td {
  padding: 5px 4px;
  vertical-align: top;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.15);
}

.help-table .k {
  width: 38%;
  white-space: nowrap;
}

.font-fix {
  font-family: auto;
  font-weight: bolder;
}

kbd {
  display: inline-block;
  min-width: 16px;
  margin: 0 1px;
  padding: 2px 5px;
  font-size: 10px;
  color: #141414;
  text-align: center;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 0 #888;
}

code {
  padding: 1px 4px;
  font-size: 10px;
  color: #fc9;
  background: rgba(255, 204, 153, 0.12);
  border-radius: 3px;
}
</style>
