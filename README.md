# soundhub.js

[![npm version](https://img.shields.io/npm/v/soundhub.svg)](https://www.npmjs.com/package/soundhub)
[![License: MIT](https://img.shields.io/npm/l/soundhub.svg)](https://opensource.org/licenses/MIT)
[![Minzipped size](https://img.shields.io/bundlephobia/minzip/soundhub.svg)](https://bundlephobia.com/package/soundhub)
[![Total downloads](https://img.shields.io/npm/dt/soundhub.svg)](https://www.npmjs.com/package/soundhub)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-yellow.svg)](https://www.npmjs.com/package/soundhub)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-3178C6.svg)](https://www.npmjs.com/package/soundhub)

**One hub for all the audio in your app.** Load sounds once, address them by id, and
listen to a single typed event bus instead of wiring callbacks per sound.

Built directly on the Web Audio API. 21 KB gzipped, zero dependencies, written in
TypeScript and usable from plain JavaScript. Coming from Howler.js? There is a
comparison a bit further down.

- **[Live demo](https://soundhub.chriscreativecode.com/)**
- **[Changelog](./CHANGELOG.md)**
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
hub.play('laser', { overlap: true });

// One bus, one place to react.
hub.addEventListener(SoundEventsEnum.PROGRESS, (event) => {
  progressBar.value = event.progressInfo!.progress;
});
```

## soundhub next to Howler.js

Howler.js is the library most people reach for, and it is a good one. The
difference is the shape of the API. Howler gives you an object per sound and you
keep track of those objects yourself. soundhub keeps one manager in front of the
audio graph and you address everything by id, so the state of your audio lives in
one place instead of spread over your components.

| | soundhub | Howler.js |
| --- | --- | --- |
| Model | one hub, sounds by id | one `Howl` object per sound |
| Events | one typed bus, 35+ event types, filter per listener | callbacks per `Howl` |
| Types | written in TypeScript | types in a separate `@types` package |
| Long files | `loadStream`, still routed through the graph | `html5: true`, outside the Web Audio graph |
| Spatial on long files | yes | no, HTML5 mode skips the panner |
| Limiter | `masterLimiter: true` | build it yourself on `Howler.ctx` |
| Groups | `createSoundGroup` with `maxInstances` | your own bookkeeping |
| Media Session | `setMediaSession` | your own bookkeeping |
| Progress | `progress` events plus `getSoundState` | poll `seek()` yourself |
| Gapless loop | `seamlessLoop: true` | no |
| Format fallback | a list of urls per sound, plus `canPlay` | a list of urls per sound, plus `Howler.codecs` |
| Listener | `setListenerPosition` and `setListenerOrientation` | `Howler.pos` and `Howler.orientation` |
| Deferred loading | `registerSound` plus `getLoadState` | `preload: false` plus `load()` |
| Idle battery | `autoSuspend` | `Howler.autoSuspend`, on by default |
| Auth headers | `fetchHeaders` in the config | `xhr: { headers }` per sound |

Where Howler is ahead: it is smaller, and it has been in production far longer,
on more strange devices than I will ever own.

Pick soundhub when your app has a lot of audio at once and you want one place to
control it. Pick Howler when you need a handful of sounds and the smallest
possible download.

## Playing a sound many times at once

By default a sound has one voice. Play it again while it is still running and it
starts over from the top, which is what you want for music and for a voice-over.

For footsteps, lasers, coins and UI clicks you want the opposite. Set `overlap`
and every call gets its own instance, so the sounds stack instead of cutting each
other off:

```ts
hub.play('laser');                     // restarts, one laser at a time
hub.play('laser', { overlap: true });  // stacks, ten lasers if you click ten times
```

Each instance gets its own id, `laser:1`, `laser:2` and so on. `play()` returns
the instance, so you can address a single one:

```ts
const shot = hub.play('laser', { overlap: true });
hub.setSoundVolume(shot!.id, 0.4);
hub.stop(shot!.id);
```

Instances clean themselves up when they end. To put a ceiling on how many can run
at the same time, play them into a group:

```ts
hub.createSoundGroup('lasers', { maxInstances: 8 });
hub.play('laser', { overlap: true, groupId: 'lasers' });
```

The ninth laser stops the oldest one instead of piling up. Without a group,
`new SoundHub({ maxInstancesPerSound: 8 })` does the same for every sound at
once, which is a cheap guard against a stuck key.

On the event bus, the filter tells the two apart. `{ soundId: 'laser' }` matches
that one id, `{ originalId: 'laser' }` matches every instance of it:

```ts
hub.addEventListener(SoundEventsEnum.ENDED, (event) => {
  console.log('finished:', event.soundId);   // laser:3
}, { originalId: 'laser' });
```

You can switch the default over for the whole hub with `new SoundHub({ overlap:
true })`. It stays off unless you ask for it, because overlapping playback changes
what `stop(id)` and `pause(id)` reach: those act on the original id, and the
running instances have their own.

> `overlap` used to be called `createNewInstance`. The old name still works and
> is removed in v7. See [migrating](#migrating).

## Sprites

One file, many sounds. Load the sprite sheet, name the ranges in seconds, then
play them by name:

```ts
await hub.loadSound('ui', '/audio/ui-sprites.mp3');

hub.setSoundSprite('ui', {
  click: [0, 0.2],      // [start, end] in seconds
  hover: [0.5, 0.7],
  error: [1, 1.8],
});

hub.playSprite('ui', 'click');
hub.playSprite('ui', 'error', { volume: 0.8 });
```

`setSoundSprite` cuts each range into its own buffer once, so playing a sprite is
as cheap as playing any other sound and it starts exactly on the sample you asked
for. The two go together well: `hub.playSprite('ui', 'click', { overlap: true })`
lets a fast typist trigger the same click twenty times without it stuttering.

Sprites need the samples in memory, so they work on sounds loaded with
`loadSound` and not on streams.

## Loading

Give a sound a list of urls and the browser picks the one it can play. The check
runs before anything is fetched, so the files it cannot use are never requested:

```ts
await hub.loadSound('theme', [
  '/audio/theme.opus',   // Chrome, Firefox, Edge
  '/audio/theme.m4a',    // Safari
]);

SoundHub.canPlay('opus');        // false on older Safari
SoundHub.getSupportedFormats();  // ['mp3', 'wav', 'm4a', ...]
```

A url without a known extension, a signed CDN link for example, is used as is.
soundhub would rather try and fail than refuse to load anything.

Sounds you do not need at startup can be written down and fetched later:

```ts
hub.registerSounds([
  { id: 'boss-music', url: ['/audio/boss.opus', '/audio/boss.mp3'] },
  { id: 'victory', url: '/audio/victory.mp3' },
]);

hub.getLoadState('boss-music');    // 'unloaded'

await hub.loadSound('boss-music'); // no url needed, it is on file
hub.getLoadState('boss-music');    // 'loading', then 'loaded' or 'error'
```

`loading` events fire on the same bus, so a spinner is four lines. For audio
behind a token, `fetchHeaders` goes on every request:

```ts
const hub = new SoundHub({
  fetchHeaders: { Authorization: `Bearer ${token}` },
});
```

## Why one hub

Most Web Audio wrappers hand you an object per sound and leave the rest to you.
soundhub keeps a single manager in front of the audio graph, which changes what
the day-to-day code looks like:

**One typed event bus.** Thirty-plus event types in a single enum
(`SoundEventsEnum.STARTED`, `.FADE_OUT_COMPLETED`, `.SPATIAL_POSITION_CHANGED`, …),
each carrying the sound id. Your UI subscribes once instead of once per sound,
and a filter keeps each listener to the sound it cares about:

```ts
const off = hub.addEventListener(SoundEventsEnum.PROGRESS, (event) => {
  bar.value = event.progressInfo!.progress;      // no id check needed
}, { soundId: 'music' });

hub.once(SoundEventsEnum.ENDED, playNextTrack, { soundId: 'music' });

off();  // addEventListener hands back its own unsubscribe
```

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

**A listener you can move.** `setSpatialPosition` moves a sound around the ear,
which is what a map or a menu needs. A first-person camera works the other way
round: the sounds stay where they are and you move. `setListenerPosition` and
`setListenerOrientation` do that, and `setSpatialOrientation` points a sound in
a direction, which is what makes the cone settings on the panner mean something.

```ts
hub.setListenerPosition(player.x, 0, player.z);
hub.setListenerOrientation(camera.x, 0, camera.z);

hub.setSpatialOrientation('television', 0, 0, -1);   // facing into the room
```

**Sleeping on battery.** A running audio context keeps the audio hardware awake
even when nothing plays. With `autoSuspend: true` the context goes to sleep after
thirty seconds of silence and the next `play()` wakes it. Off by default, because
waking up costs a few milliseconds and a game that fires sounds constantly is
better off awake.

**An escape hatch.** `getMasterInput()` and `getMasterOutput()` let you route your
own oscillators through the master chain, or hang an `AnalyserNode` off the output
for a visualiser. The library never gets in your way.

Also included: seamless looping, fades per sound and globally, playback rate,
stereo panning, 3D spatial positioning with HRTF, cross-origin loading with
retries, and mobile handling (auto-unlock, auto-mute when the tab hides,
auto-resume on focus).

**Long files stream.** Short sounds are decoded into memory, which is what makes
precise scheduling, sprites and instance stacking possible. An hour-long podcast
loaded that way would cost hundreds of megabytes and a long wait before the first
sound. So `loadStream` takes the other route: the browser fetches as it plays.
The audio still runs through the same graph, so master volume, panning and the
limiter apply either way.

```ts
await hub.loadStream('episode-42', '/audio/episode-42.mp3');

hub.play('episode-42');
hub.setPlaybackRate('episode-42', 1.5);   // podcast listeners want this
hub.seek('episode-42', 1800);             // jump half an hour in
```

Playback, seeking, volume, fades, mute, panning, playback rate, looping, state and
progress events behave the same as for a buffered sound, on the same event bus.
What a stream cannot do is anything that needs random access to samples: sprites
and `overlap` are unavailable, and looping is handled by the browser, so no
`loop_completed` event fires. `getStreamElement(id)` hands you the media element
for the rest, such as buffered ranges for a loading bar.

**The lock screen works.** `setMediaSession` puts a title, artist and artwork on
the operating system's media controls and wires up the hardware keys for play,
pause, skip back fifteen, skip forward thirty, and the scrubber:

```ts
hub.setMediaSession('episode-42', {
  title: 'Episode 42: naming things',
  artist: 'The Podcast',
  artwork: [{ src: '/cover-512.png', sizes: '512x512', type: 'image/png' }],
  onNextTrack: () => playEpisode(43),
});
```

soundhub keeps the playback state and the scrubber position in step as the
sound plays; `clearMediaSession()` takes it off again.

## Examples

The `examples/` folder holds a single page that exercises the whole public API:
sprites, overlapping instances, deferred loading, progress and seeking, groups,
fades, panning, spatial audio with a listener you can move, and a live view of
the event bus.

```bash
npm install
npm run dev
```

Every sound in `examples/sounds/` is synthesised by
`scripts/generate-example-sounds.py`. Nothing there is sampled or downloaded, so
the example audio carries the same MIT licence as the rest of the project.

## Tests

```bash
npm test              # once
npm run test:watch    # while you work
npm run test:coverage
```

Vitest on jsdom, with a Web Audio mock in `tests/support`. The mock is a plain
stand-in: nodes remember what they are connected to, audio params remember their
value, the clock only moves when a test moves it, and a buffer source refuses a
second `start()` the way the real one does. That is enough to run the library
itself rather than a rehearsal of it, so the tests cover loading, playback,
overlap, sprites, groups, fades, panning, spatial audio, the listener, streams,
the media session and the event bus.

## API

Full reference: **[soundhub-docs.chriscreativecode.com](https://soundhub-docs.chriscreativecode.com/)**

The shape of it:

| Area | Methods |
| --- | --- |
| Loading | `loadSound` `loadSounds` `registerSound` `registerSounds` `loadStream` `updateSoundUrl` `unloadSound` `removeSound` `isSoundLoaded` `getLoadState` `getSoundUrls` `canPlay` `getSupportedFormats` |
| Playback | `play` `playSprite` `pause` `resume` `stop` `seek` `stopAllSounds` `pauseAllSounds` `resumeAllSounds` |
| Volume & mute | `setSoundVolume` `setGlobalVolume` `mute` `unmute` `toggleGlobalMute` `fadeIn` `fadeOut` `fadeGlobalIn` `fadeGlobalOut` |
| State | `getSoundState` `isPlaying` `isPaused` `getProgress` `getDuration` `startProgressTracking` |
| Groups | `createSoundGroup` `addToSoundGroup` `removeFromSoundGroup` `getGroup` `removeSoundGroup` |
| Sprites | `setSoundSprite` `getSpriteConfig` `removeSpriteConfig` |
| Panning | `setPan` `setGlobalPan` `resetPan` `isStereoPanActive` |
| Spatial | `setSpatialPosition` `setSpatialOrientation` `setMasterSpatialPosition` `setMasterSpatialOrientation` `updatePannerConfigById` `removeSpatialEffect` |
| Listener | `setListenerPosition` `setListenerOrientation` `getListenerPosition` `getListenerOrientation` `resetListener` |
| Streaming | `loadStream` `isStream` `getStreamElement` |
| Graph | `getContext` `getMasterInput` `getMasterOutput` `setMasterLimiter` `getMasterLimiterNode` `suspendContext` `resumeContext` |
| Events | `addEventListener` `once` `removeEventListener` `dispatchEvent` `hasEventListener` |
| Media Session | `setMediaSession` `clearMediaSession` |

## Browser support

Every current browser: Chrome, Edge, Firefox and Safari, desktop and mobile.

## Migrating

### From createNewInstance to overlap

`createNewInstance` is now called `overlap`. It does the same thing, the default
is still off, and the old name keeps working until v7. Both the play options and
the hub config accept either, and `overlap` wins if you pass both.

```diff
-hub.play('laser', { createNewInstance: true });
+hub.play('laser', { overlap: true });
```

Nothing breaks if you change nothing. Your editor will mark the old name as
deprecated, which is the reminder.

### From sound-manager-ts

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
