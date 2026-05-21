<script setup lang="ts">
</script>

<template>
  <div class="board">
    <h2 class="board-title">MUSIC BOARD</h2>
    <div class="board-main">
      <slot></slot>
      0123456789 CDEFGAB cdefgab
    </div>
  </div>
</template>

<style scoped>
.board {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 2 * 56px);
  width: 32em;
  margin: 56px auto;
  box-sizing: border-box;
  font-size: 20px;
  color: #fff;
  border: 17px solid;
  border-image: url(../assets/border.svg) 17;
  box-shadow: 0 0 0 2px #fff inset,
        0 0 0 2px #fff,
        0 0 0 56px #c33;
}

.board-title {
  padding: 8px 2.6em;
  margin: 10px auto;
  font-weight: 400;
  font-size: 120%;
  border: 4px solid #36c;
  border-radius: 6px;
  corner-shape: bevel;
}

.board-main {
  flex: 1;
  min-height: 0;
  word-break: break-all;
  scrollbar-gutter: stable both-edges;
  overflow: auto;
}
</style>