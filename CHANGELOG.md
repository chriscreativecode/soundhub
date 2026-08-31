# Changelog

All notable changes to soundhub are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[semantic versioning](https://semver.org/): a patch fixes something, a minor
adds something backwards-compatible, a major asks you to change your code.

## [Unreleased]

### Added

**`overlap`.** Playing a sound while it is still running restarts it. Set
`overlap: true` and the call gets its own instance instead, so the sounds stack.
That is what `createNewInstance` did, under a name that says what happens rather
than what the library does internally. It works in the play options and in the
hub config, and the default is still off.

```js
hub.play('laser', { overlap: true });
```

`playSprite` no longer needs an empty options object: `hub.playSprite('ui',
'click')` is enough.

**A list of urls per sound.** `loadSound` and `loadSounds` take an array, and the
browser picks the first format it can play. The check happens before anything is
fetched, so the files it cannot use are never requested. `SoundHub.canPlay('opus')`
and `SoundHub.getSupportedFormats()` answer the same question directly, and both
are static so you can ask before building a hub. A url without a known extension,
a signed CDN link for example, is used as is.

```js
await hub.loadSound('theme', ['/audio/theme.opus', '/audio/theme.m4a']);
```

**Deferred loading.** `registerSound(id, url)` writes down where a sound lives
without fetching it. `loadSound(id)` then needs no url. `getLoadState(id)` returns
`unloaded`, `loading`, `loaded` or `error`, and a `loading` event fires on the bus
when a fetch starts, which is enough to drive a spinner. `getSoundUrls(id)` gives
back what was registered.

**A listener you can move.** `setListenerPosition` and `setListenerOrientation`
move the ear through the scene, which is what a first-person camera needs.
Until now sounds could only move around a fixed listener. `getListenerPosition`,
`getListenerOrientation` and `resetListener` come with it, and a
`listener_changed` event goes on the bus. Old Safari, which has `setPosition`
instead of the audio params, is handled.

**Sounds that point somewhere.** `setSpatialOrientation(id, x, y, z)` aims a
sound, and `panSpatialOrientation` does the same from the play options. The cone
settings in `SoundPannerConfig` have been there for a while but had no direction
to work with, so they did nothing. Now they do. `setMasterSpatialOrientation`
does the same for the master panner.

**`autoSuspend`.** A running audio context keeps the audio hardware awake even
when nothing plays. Turn this on and the context sleeps after `autoSuspendDelay`
seconds of silence, thirty by default, and the next `play()` wakes it up. Off by
default: waking takes a few milliseconds, and a metronome or a busy game is
better off awake. `context_suspended` and `context_resumed` events report it.

**`fetchHeaders`.** Extra request headers for every audio fetch, for audio behind
a token.

```js
const hub = new SoundHub({ fetchHeaders: { Authorization: `Bearer ${token}` } });
```

**`maxInstancesPerSound`.** A ceiling on overlapping instances of one sound,
without needing a group for it. Reaching the ceiling stops the oldest instance.
Off by default.

**An `unlocked` event.** Mobile browsers keep audio locked until the first touch.
The hub already handled that; now it says so, which is the moment to take your
"tap for sound" overlay off the screen.

### Fixed

**A sound played into a group did not join it.** `play(id, { groupId })` only
added the sound to the group on the overlap path. Without overlap the group
stayed empty, so its play options never applied and stopping every member of a
group stopped nothing. This is the bug behind "press Rain, press Stop group,
still hear rain" on the example page.

**`getSoundVolume` ignored fades.** It reads `originalVolume`, which a fade did
not touch, so after a fade it kept reporting the volume from before while
`getSoundState().volume` already reported the new one. The two agree again.

**Cancelling a fade finished it instead.** Anything that interrupts a fade goes
through the same cancel step: setting the volume, starting another fade, stopping
the sound. That step ran the fade's completion callback, so the volume jumped to
the value the fade was heading for, `fade_in_completed` or `fade_out_completed`
fired, and a `fadeOut(..., stopAfterFade)` stopped the sound. Turning the volume
up halfway through a fade out therefore silenced it and stopped it. Cancelling
now abandons the fade and leaves the volume where it got to, which is also what
`fadeIn` always assumed when it carries on from the current volume.

**A fade that stops the sound fired its event thousands of times.** The completion
callback of `fadeOut(..., stopAfterFade)` calls `stop()`, `stop()` calls back into
the fade machinery, and it found its own callback still registered. It recursed
until the stack ran out, dispatching `fade_out_completed` on every level. The
callback is now taken out of the map before it runs, and the event fires once.

**`removeEventListener` removed too much.** The filter comparison never looked at
`soundId`, so two listeners with the same callback and different `soundId`
filters counted as the same listener and removing one removed both.

**A listener filtered on an instance never heard it end.** The listeners for an
instance were dropped during the cleanup that runs before the `ended` event, so
the one event they were waiting for arrived after they were gone. The cleanup now
happens after the event.

### Changed

**Finished instances are cleaned up.** An instance played with `overlap` used to
stay in the sound map for the lifetime of the page. A game firing a footstep
every half second grew the map by seven thousand entries an hour. Instances that
have finished are now dropped when a new instance of the same sound starts.
Playing and paused ones are left alone, and so is one that is on the lock screen.
`getSoundIds()` no longer lists instances that ended.

**Comments.** The source lost about a hundred and thirty comments that only
repeated what the line below them said. The build strips comments either way, so
the package is the same size; this is for anyone reading the code.

**Tests.** The project has a test suite: Vitest on jsdom with a Web Audio mock,
173 tests over loading, playback, overlap, sprites, groups, fades, panning,
spatial audio, the listener, streams, the media session and the event bus.
`npm test` runs it. Five of the fixes above came out of writing it.

### Deprecated

**`createNewInstance`.** Renamed to `overlap`. The old name still works in the
play options and in the config, so nothing breaks by upgrading, and your editor
marks it as deprecated. It is removed in v7, together with the `SoundManager`
alias.

If you set both, `overlap` wins.

## [6.1.0] - 2026-08-29

### Added

**Streaming.** `loadStream(id, url, options?)` loads a long file without
decoding it into memory first. An hour of stereo audio costs around 600 MB once
decoded, and nothing plays until the download and the decode are both done. With
a stream the browser fetches as it plays, and the audio still runs through the
same graph, so master volume, panning and the limiter apply either way.
`isStream(id)` and `getStreamElement(id)` come with it.

**Media Session.** `setMediaSession(id, info?)` puts a title, artist and artwork
on the operating system's media controls and hooks up play, pause, skip and
scrubbing. The playback state and the scrubber position stay in step while the
sound plays. `clearMediaSession()` removes it again.

**Listener filters and `once()`.** `addEventListener` now accepts a filter and
returns a function that removes the listener again. `once(type, callback,
filter?)` listens for a single event and then stops.

```js
const off = hub.addEventListener(SoundEventsEnum.PROGRESS, (event) => {
  bar.value = event.progressInfo.progress;
}, { soundId: 'music' });

hub.once(SoundEventsEnum.ENDED, playNextTrack, { soundId: 'music' });
```

The filter gained a `soundId` field. It used to match only `originalId` and
`instanceId`, which are set on sounds played with `createNewInstance` and on
nothing else, so filtering did nothing for ordinary playback and every callback
had to start with its own id check. The interface never declared the filter
parameter at all, even though the implementation had always accepted one.

`SoundEventFilter`, `MediaSessionInfo` and `StreamOptions` are exported for
typing.

### Fixed

- `SoundHubInterface` now matches the implementation in four places where it did
  not. `play` returns `Sound | undefined`, `setLoop` takes an optional
  `maxLoops`, `createSoundGroup` takes `{ maxInstances?, playOptions? }`, and
  `resetSpatialPosition` takes an optional id. Code written against the
  interface could fail to compile against these before.

### Changed

- The console banner is five links instead of an ASCII drawing.

### Notes on streams

- Sprites and `createNewInstance` do not work on a stream, because both need the
  samples in memory. `setSoundSprite` and `playSprite` throw a clear error
  instead of failing quietly.
- The browser handles looping, so no `loop_completed` event fires and `maxLoops`
  has nothing to count.

## [6.0.0] - 2026-08-29

Renamed from `sound-manager-ts`. Nothing about the behaviour changed. See the
[migration notes](./README.md#migrating-from-sound-manager-ts).

### Changed

- The package is now `soundhub` and the main class is `SoundHub`.
- `SoundManager`, `SoundManagerConfig` and `SoundManagerInterface` are still
  exported as deprecated aliases, so existing code compiles unchanged. They will
  be removed in v7.

### Fixed

- The type declarations now land at `dist/types/index.d.ts`, where
  `package.json` has always pointed. They used to be written one directory
  deeper, so editors found no types at all.
- `PanningModel` and `DistanceModel` are exported. They were internal by
  accident.
- `SoundState` is exported as a value instead of a type, so `SoundState.Playing`
  can be used in a comparison.

### Added

- `examples/` holds one page that exercises the whole public API. The audio in
  it is generated by `scripts/generate-example-sounds.py`, so the folder carries
  the same MIT licence as the rest of the project.

---

Earlier history belongs to [`sound-manager-ts`](https://www.npmjs.com/package/sound-manager-ts),
versions 1.0.0 through 5.9.1.

[6.1.0]: https://github.com/chriscreativecode/soundhub/releases/tag/v6.1.0
[6.0.0]: https://github.com/chriscreativecode/soundhub/releases/tag/v6.0.0
