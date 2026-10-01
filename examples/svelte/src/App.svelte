<script lang="ts">
  import { onMount } from 'svelte';
  import MusicPlayer from './lib/MusicPlayer.svelte';
  import Effects from './lib/Effects.svelte';
  import { loadSounds } from './lib/sound/hub';

  let loaded = $state(false);

  onMount(() => {
    loadSounds().then(() => (loaded = true));
  });
</script>

<main>
  <h1>soundhub + Svelte</h1>
  {#if loaded}
    <MusicPlayer />
    <Effects />
  {:else}
    <p>Loading sounds…</p>
  {/if}
</main>
