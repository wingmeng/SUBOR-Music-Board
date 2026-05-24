<script setup lang="ts">
import { ref } from 'vue'
import Board from './components/Board.vue'
import NotationGrid from './components/NotationGrid.vue'
import ControlBar from './components/ControlBar.vue'

const config = ref({
  speed: 90
})
</script>

<template>
  <Board>
    <NotationGrid />
    <ControlBar v-model="config.speed" />
  </Board>
</template>
