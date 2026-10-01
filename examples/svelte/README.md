# soundhub with Svelte

A small Svelte 5 app that plays music with a seek bar and fires overlapping
sound effects, all through one soundhub hub.

[Open in StackBlitz](https://stackblitz.com/github/chriscreativecode/soundhub/tree/main/examples/svelte)

```bash
npm install
npm run dev
```

## What it shows

- **One hub for the app.** `src/lib/sound/hub.ts` creates the `SoundHub` on
  first use and keeps it in the module, so every component shares it.
- **Loading once.** `loadSounds()` keeps the promise, so every component that
  asks gets the same load.
- **State with runes.** `soundState('music')` in `src/lib/sound/state.svelte.ts`
  listens to the events of one sound with the filter `{ soundId: 'music' }` and
  keeps its current state in `$state`: playing or paused, the position and the
  duration. The seek bar reads `music.current`, with no polling.
- **Cleanup.** `addEventListener` returns a function that removes the listener.
  The `$effect` returns those, and Svelte runs them when the component is
  destroyed.
- **Safe with SvelteKit.** `$effect` and `onMount` never run on the server, so
  server rendering does not need an `AudioContext`.
- **Starting from a click.** Browsers keep audio silent until the visitor
  interacts with the page, so the first `play()` runs in a click handler.

The sounds are loaded from the soundhub repository through jsDelivr. Point the
urls in `src/lib/sound/hub.ts` at your own files when you build on this.
