# soundhub.js

[![npm version](https://img.shields.io/npm/v/soundhub)](https://www.npmjs.com/package/soundhub)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/soundhub)](https://bundlephobia.com/result?p=soundhub)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**One hub for all the audio in your app.** Load sounds once, address them by id, and
listen to a single typed event bus instead of wiring callbacks per sound.

Built directly on the Web Audio API. 16 KB gzipped, zero dependencies, written in
TypeScript and usable from plain JavaScript.

- **[Live demo](https://soundhub.chriscreativecode.com/)**
- **[Documentation](https://soundhub-docs.chriscreativecode.com/)**

```bash
npm install soundhub
```

## Quick start

```ts
import { SoundHub, SoundEventsEnum } from 'soundhub';

const hub = new SoundHub({ masterLimiter: true });

await hub.loadSounds([
  { id: 'music', url: '/audio/theme.mp3' },
  { id: 'laser', url: '/audio/laser.wav' },
]);

hub.play('music', { loop: true, volume: 0.6, fadeInDuration: 2 });

// Overlapping one-shots: each call gets its own instance.
hub.play('laser', { createNewInstance: true });

// One bus, one place to react.
hub.addEventListener(SoundEventsEnum.PROGRESS, (event) => {
  progressBar.value = event.progressInfo!.progress;
});
```

## Why another audio library

Most Web Audio wrappers hand you an object per sound and leave the rest to you.
soundhub keeps a single manager in front of the audio graph, which changes what
the day-to-day code looks like:

**One typed event bus.** Thirty-plus event types in a single enum
(`SoundEventsEnum.STARTED`, `.FADE_OUT_COMPLETED`, `.SPATIAL_POSITION_CHANGED`, …),
each carrying the sound id. Your UI subscribes once, not once per sound.

**UI-ready state.** `getSoundState(id)` returns progress, current time, adjusted
elapsed time, duration, volume, pan and spatial position in one object, and
`progress` events fire on an interval you choose. No polling loop of your own,
no time arithmetic.

**A master limiter.** `masterLimiter: true` puts a compressor just before the
output, so twenty simultaneous sound effects do not clip. Off by default, so
turning it on is a deliberate change to how your project sounds.

**Groups.** Give a group its own play options and route sounds into it with
`play(id, { groupId })`. `maxInstances` caps concurrency and retires the oldest
instance automatically.

**An escape hatch.** `getMasterInput()` and `getMasterOutput()` let you route your
own oscillators through the master chain, or hang an `AnalyserNode` off the output
for a visualiser. The library never gets in your way.

Also included: sprites, seamless looping, fades per sound and globally, playback
rate, stereo panning, 3D spatial positioning with HRTF, cross-origin loading with
retries, and mobile handling (auto-unlock, auto-mute when the tab hides,
auto-resume on focus).

### Scope

soundhub decodes into buffers, which is what makes precise scheduling, sprites and
spatial audio work. That suits interfaces, games and sound effects. It is not built
for streaming hour-long media files — use an `<audio>` element for those, or route
one through `getMasterInput()`.

## Examples

The `examples/` folder holds a single page that exercises the whole public API —
sprites, overlapping instances, progress and seeking, groups, fades, panning,
spatial audio, and a live view of the event bus.

```bash
npm install
npm run dev
```

Every sound in `examples/sounds/` is synthesised by
`scripts/generate-example-sounds.py` — no samples, no third-party audio — so the
example audio carries the same MIT licence as the rest of the project.

## API

Full reference: **[soundhub-docs.chriscreativecode.com](https://soundhub-docs.chriscreativecode.com/)**

The shape of it:

| Area | Methods |
| --- | --- |
| Loading | `loadSound` `loadSounds` `updateSoundUrl` `unloadSound` `removeSound` `isSoundLoaded` |
| Playback | `play` `playSprite` `pause` `resume` `stop` `seek` `stopAllSounds` `pauseAllSounds` `resumeAllSounds` |
| Volume & mute | `setSoundVolume` `setGlobalVolume` `mute` `unmute` `toggleGlobalMute` `fadeIn` `fadeOut` `fadeGlobalIn` `fadeGlobalOut` |
| State | `getSoundState` `isPlaying` `isPaused` `getProgress` `getDuration` `startProgressTracking` |
| Groups | `createSoundGroup` `addToSoundGroup` `removeFromSoundGroup` `getGroup` `removeSoundGroup` |
| Sprites | `setSoundSprite` `getSpriteConfig` `removeSpriteConfig` |
| Panning | `setPan` `setGlobalPan` `resetPan` `isStereoPanActive` |
| Spatial | `setSpatialPosition` `setMasterSpatialPosition` `updatePannerConfigById` `removeSpatialEffect` |
| Graph | `getContext` `getMasterInput` `getMasterOutput` `setMasterLimiter` `getMasterLimiterNode` |
| Events | `addEventListener` `removeEventListener` `dispatchEvent` `hasEventListener` |

## Browser support

Every current browser: Chrome, Edge, Firefox and Safari, desktop and mobile.

## Migrating from sound-manager-ts

soundhub is the continuation of `sound-manager-ts`. The API is unchanged; the
package and the main class were renamed.

```diff
-import { SoundManager } from 'sound-manager-ts';
-const manager = new SoundManager();
+import { SoundHub } from 'soundhub';
+const hub = new SoundHub();
```

`SoundManager` and `SoundManagerConfig` are still exported as deprecated aliases,
so existing code compiles unchanged. They will be removed in v7.

## Contributing

Issues and pull requests are welcome. If you hit an edge case, a reproduction in
the examples page is the fastest way to get it fixed.

## Licence

MIT © [Chris Schardijn](https://www.chriscreativecode.com)
