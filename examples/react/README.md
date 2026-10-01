# soundhub with React

A small React app that plays music with a seek bar and fires overlapping sound
effects, all through one soundhub hub.

[Open in StackBlitz](https://stackblitz.com/github/chriscreativecode/soundhub/tree/main/examples/react)

```bash
npm install
npm run dev
```

## What it shows

- **One hub for the app.** `src/sound/hub.ts` creates the `SoundHub` on first
  use and keeps it in the module. React StrictMode mounts components twice in
  development, so a hub made inside a component would be made twice too. Making
  it on first use also keeps it out of server rendering (Next.js, Remix), where
  there is no `AudioContext`.
- **Loading once.** `loadSounds()` keeps the promise, so every component that
  asks gets the same load.
- **State from the event bus.** `useSoundState('music')` in `src/sound/hooks.ts`
  listens to the events of one sound with the filter `{ soundId: 'music' }` and
  returns its current state: playing or paused, the position and the duration.
  The seek bar reads straight from it, with no polling.
- **Cleanup.** `addEventListener` returns a function that removes the listener.
  The hook returns those from its effect, so a component that unmounts stops
  listening.
- **Starting from a click.** Browsers keep audio silent until the visitor
  interacts with the page, so the first `play()` runs in a click handler.

The sounds are loaded from the soundhub repository through jsDelivr. Point the
urls in `src/sound/hub.ts` at your own files when you build on this.
