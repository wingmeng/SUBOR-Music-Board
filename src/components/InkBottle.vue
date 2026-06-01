<template>
  <div class="ink-bottle">
    <b>INK</b>
  </div>
</template>

<style scoped>
.ink-bottle {
  position: absolute;
  right: 6px;
  bottom: 6px;
  width: fit-content;
  padding: 3px 2px 2px;
  text-align: right;
  font-family: Arial;
  color: #3cc;
  background: linear-gradient(to bottom, transparent 57%, currentColor 0);
  z-index: 10;
  pointer-events: none;
}

.ink-bottle::before {
  content: '';
  display: block;
  border: 6px solid transparent;
  border-bottom-color: currentColor;
  box-shadow: 0 6px;
}

.ink-bottle::after {
  content: '';
  position: absolute;
  inset: 3px 10px auto;
  height: 1px;
  border-style: solid;
  border-width: 2px 0;
}

.ink-bottle > b {
  display: inline-block;
  padding: 0 2px;
  line-height: 1.15;
  font-size: 14px;
  background: #fff;
  box-shadow: 0 1px 3px;
}
</style>