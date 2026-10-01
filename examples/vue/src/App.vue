<script setup lang="ts">
import MusicPlayer from './components/MusicPlayer.vue';
import Effects from './components/Effects.vue';
import { useSoundsLoaded } from './sound/composables';

const loaded = useSoundsLoaded();
</script>

<template>
  <main>
    <h1>soundhub + Vue</h1>
    <template v-if="loaded">
      <MusicPlayer />
      <Effects />
    </template>
    <p v-else>Loading sounds…</p>
  </main>
</template>
