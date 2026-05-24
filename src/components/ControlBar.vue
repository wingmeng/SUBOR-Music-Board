<script setup lang="ts">
import SpeedControl from './SpeedControl.vue'

const props = defineProps(['value'])
</script>

<template>
  <div class="control-bar">
    <SpeedControl :value="props.value" @change="" />
  </div>
</template>

<style scoped>

</style>