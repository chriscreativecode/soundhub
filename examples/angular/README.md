# soundhub with Angular

A small Angular app that plays music with a seek bar and fires overlapping sound
effects, all through one soundhub hub. Standalone components, signals and no
zone.js.

[Open in StackBlitz](https://stackblitz.com/github/chriscreativecode/soundhub/tree/main/examples/angular)

```bash
npm install
npm start
```

## What it shows

- **One hub for the app.** `SoundService` in `src/app/sound/sound.service.ts`
  is provided in root, so every component shares the same `SoundHub`. It only
  creates the hub in the browser. With server-side rendering the service also
  runs on the server, where there is no `AudioContext`, and its methods then do
  nothing.
- **State as a signal.** `injectSoundState('music')` listens to the events of
  one sound with the filter `{ soundId: 'music' }` and returns a signal with its
  current state: playing or paused, the position and the duration. The template
  reads it directly, so the seek bar moves without polling. Because the hub
  updates a signal, this works without zone.js.
- **Cleanup.** `addEventListener` returns a function that removes the listener.
  `injectSoundState` hands those to the component's `DestroyRef`, so a
  destroyed component stops listening.
- **Starting from a click.** Browsers keep audio silent until the visitor
  interacts with the page, so the first `play()` runs in a click handler.

The sounds are loaded from the soundhub repository through jsDelivr. Point the
urls in `sound.service.ts` at your own files when you build on this.
