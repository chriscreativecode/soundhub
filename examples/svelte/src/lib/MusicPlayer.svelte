<script lang="ts">
  import { SoundState } from 'soundhub';
  import { getHub } from './sound/hub';
  import { soundState } from './sound/state.svelte';

  const music = soundState('music');
  const playing = $derived(music.current?.state === SoundState.Playing);

  function formatTime(seconds = 0): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // Browsers only start audio after a click, tap or key press, so the first
  // play() has to come from an event handler like this one.
  function toggle() {
    const hub = getHub();
    const state = music.current?.state;
    if (state === SoundState.Playing) hub.pause('music');
    else if (state === SoundState.Paused) hub.resume('music');
    else hub.play('music', { loop: true, volume: 0.7, fadeInDuration: 1 });
  }

  function seek(event: Event) {
    getHub().seek('music', Number((event.target as HTMLInputElement).value));
  }
</script>

<section class="card">
  <h2>Music</h2>
  <div class="row">
    <button onclick={toggle}>{playing ? 'Pause' : 'Play'}</button>
    <button class="quiet" onclick={() => getHub().stop('music')}>Stop</button>
    <span class="time">{formatTime(music.current?.currentTime)} / {formatTime(music.current?.duration)}</span>
  </div>
  <input
    type="range"
    aria-label="Position"
    min="0"
    step="0.1"
    max={music.current?.duration || 1}
    value={music.current?.currentTime ?? 0}
    oninput={seek}
  />
</section>
