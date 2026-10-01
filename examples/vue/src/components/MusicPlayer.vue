<script setup lang="ts">
import { computed } from 'vue';
import { SoundState } from 'soundhub';
import { getHub } from '../sound/hub';
import { useSoundState } from '../sound/composables';

const state = useSoundState('music');
const playing = computed(() => state.value?.state === SoundState.Playing);

function formatTime(seconds = 0): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Browsers only start audio after a click, tap or key press, so the first
// play() has to come from an event handler like this one.
function toggle() {
  const hub = getHub();
  const current = state.value?.state;
  if (current === SoundState.Playing) hub.pause('music');
  else if (current === SoundState.Paused) hub.resume('music');
  else hub.play('music', { loop: true, volume: 0.7, fadeInDuration: 1 });
}

function seek(event: Event) {
  getHub().seek('music', Number((event.target as HTMLInputElement).value));
}
</script>

<template>
  <section class="card">
    <h2>Music</h2>
    <div class="row">
      <button @click="toggle">{{ playing ? 'Pause' : 'Play' }}</button>
      <button class="quiet" @click="getHub().stop('music')">Stop</button>
      <span class="time">{{ formatTime(state?.currentTime) }} / {{ formatTime(state?.duration) }}</span>
    </div>
    <input
      type="range"
      aria-label="Position"
      min="0"
      step="0.1"
      :max="state?.duration || 1"
      :value="state?.currentTime ?? 0"
      @input="seek"
    />
  </section>
</template>
