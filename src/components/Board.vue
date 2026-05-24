<script setup lang="ts">
</script>

<template>
  <div class="board">
    <h2 class="board-title">MUSIC BOARD</h2>
    <div class="board-main">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.board {
  --width-outer-border: 50px;

  display: flex;
  flex-direction: column;
  height: calc(100vh - 2 * var(--width-outer-border));
  width: 32em;
  margin: var(--width-outer-border) auto;
  box-sizing: border-box;
  font-size: 20px;
  color: #fff;
  border: 17px solid;
  border-image: url(../assets/border.svg) 17;
  box-shadow: 0 0 0 2px #fff inset,
              0 0 0 2px #fff,
              0 0 0 var(--width-outer-border) #c33;
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
  scrollbar-gutter: stable both-edges;
  overflow: auto;
}
</style>