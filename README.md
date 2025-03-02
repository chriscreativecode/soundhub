# 🎵 Modern Web Audio Manager build in TypeScript.

[![npm version](https://img.shields.io/npm/v/sound-manager-ts)](https://www.npmjs.com/package/sound-manager-ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/sound-manager-ts)](https://bundlephobia.com/result?p=sound-manager-ts)
[![npm downloads](https://img.shields.io/npm/dt/sound-manager-ts)](https://www.npmjs.com/package/sound-manager-ts)

A powerful and lightweight (11KB gzipped) sound management system I crafted to make Web Audio API accessible and enjoyable. Perfect for web applications, games, and interactive experiences that demand precise audio control without the complexity. No more wrestling with time calculations or audio states - everything is handled for you. Simply listen to sound events or use getSoundState('soundId') to access comprehensive audio data, ready to integrate with your UI.

## Live demo

[Click here to visit the demo page](https://chriscreativecode.com/sound-manager-ts/demo/ "A demo showcase of my Sound Manager")

## Why Choose This Package?

🚀 **Modern & Efficient**

- Built on the latest Web Audio API
- Only 11 KB gzipped
- Zero dependencies
- High performance with low latency

🎮 **Perfect for Games & Apps**

- Handle multiple audio streams simultaneously
- Precise playback control
- Advanced spatial audio positioning
- Real-time audio processing
- Seamless sound effects management

🛠️ **Developer Friendly**

- TypeScript ready
- Clean, intuitive API
- Minimal setup required
- Comprehensive documentation
- Built with modern browsers in mind

## Features

- 🎚️ Volume control & fading
- 🎯 Spatial audio positioning
- ⏯️ Play, pause, resume, and stop
- 🎛️ Pan and balance adjustment
- ⚡ Event-driven architecture
- 📱 Mobile-friendly

## Note

- Development Status: This sound manager is currently under active development and is not yet finalized. While it is functional, some features may still be refined or added in future updates.

- Availability: Once completed, the sound manager will be published on GitHub. In the meantime, feel free to use it in its current state and provide feedback or suggestions for improvement.

- Contribution: If you encounter any issues or have ideas for enhancements, please don't hesitate to share them. Your input is valuable and will help shape the final version!

## Browser Support

Supports all modern browsers including Chrome, Firefox, Safari, and Edge (98.5% global coverage).

Transform your web audio experience with just a few lines of code!

## Documentation

- [🎵 Modern Web Audio Manager build in TypeScript.](#-modern-web-audio-manager-build-in-typescript)
  - [Live demo](#live-demo)
  - [Why Choose This Package?](#why-choose-this-package)
  - [Features](#features)
  - [Note](#note)
  - [Browser Support](#browser-support)
  - [Documentation](#documentation)
  - [About me](#about-me)
    - [Chris Schardijn (Front-end Developer)](#chris-schardijn-front-end-developer)
  - [🚀 Quick Start](#-quick-start)
  - [Installation / imlement in your project](#installation--imlement-in-your-project)
  - [Implement in your project](#implement-in-your-project)
    - [1. Using the Sound Manager as TypeScript Module](#1-using-the-sound-manager-as-typescript-module)
      - [Install the package](#install-the-package)
    - [2. Using Sound Manager as a Library File](#2-using-sound-manager-as-a-library-file)
  - [Usage](#usage)
  - [Interfaces](#interfaces)
  - [Public methods on the SoundManager](#public-methods-on-the-soundmanager)
  - [PlayOptions](#playoptions)
  - [SoundEvent](#soundevent)
  - [SoundEventsEnum](#soundeventsenum)
  - [SoundManagerConfig](#soundmanagerconfig)
  - [Sound State Information](#sound-state-information)
  - [SoundState](#soundstate)
    - [SoundProgressStateInfo](#soundprogressstateinfo)
  - [Demo included](#demo-included)
  - [Running the Demo](#running-the-demo)
  - [Licence](#licence)
  - [📋 Version History](#-version-history)
    - [5.0.0 (Major udpate)](#500-major-udpate)
    - [4.0.0 (Major update)](#400-major-update)
    - [3.2.0](#320)
      - [🎉 Added features](#-added-features)
    - [3.1.0](#310)
    - [3.0.0](#300)
      - [🚨Breaking changes and new Features](#breaking-changes-and-new-features)
      - [Improvements](#improvements)
      - [Added features](#added-features)
    - [2.3.0](#230)
    - [2.2.0](#220)
    - [2.1.3 ~ 2.1.9 (Current)](#213--219-current)
    - [2.1.2](#212)
    - [2.1.1](#211)
    - [2.1.0](#210)
    - [2.0.0 (Major Release)](#200-major-release)
    - [1.3.0](#130)
    - [1.2.0](#120)
    - [1.1.0](#110)
    - [1.0.4](#104)
  - [🚀 Upcoming Features](#-upcoming-features)

## About me

### Chris Schardijn (Front-end Developer)

My journey in web development spans back to the Flash era, where among various projects, I developed a sound manager using ActionScript 3.0. As technology evolved, so did I, embracing new challenges and opportunities to grow. This Sound Manager TypeScript project represents not just a modern reimagining of a concept I once built in Flash, but also my challange for continuous learning and adaptation in the ever-changing landscape of web development.

I built this library in my spare time. What started as a personal study project has grown into a robust solution that I'm excited to share with the developer community.

Feel free to use this library in your projects, and I hope it inspires you to pursue your own passion projects, regardless of how technology changes. Sometimes the best learning comes from rebuilding something you once loved in a completely new way.

## 🚀 Quick Start

```bash
npm install sound-manager-ts
```

```typescript
import { SoundManager } from "sound-manager-ts";

const soundManager = new SoundManager();
await soundManager.preloadSounds([{ id: "music", url: "/sounds/music.mp3" }]);
soundManager.play("music");
```

## Installation / imlement in your project

## Implement in your project

### 1. Using the Sound Manager as TypeScript Module

For TypeScript projects, it is recommended to install the package and import it directly. This method provides better type safety and allows you to take full advantage of TypeScript features.

#### Install the package

```bash
npm install sound-manager-ts
```

After the installation a folder

In your TypeScript file, you can import and use the Sound Manager like this:

```typescript
import { SoundManager, SoundManagerConfig, SoundEventsEnum } from "sound-manager-ts";

// Optional configuration
const config: SoundManagerConfig = {
  autoMuteOnHidden: true, // Mute when tab is hidden
  autoResumeOnFocus: true, // Resume on tab focus
  defaultVolume: 0.8, // Default volume (0-1)
};

// Initialize sound manager with config
const soundManager = new SoundManager(config);

// Define sounds to preload
const soundsToLoad = [
  { id: "background-music", url: "/assets/sounds/background.mp3" },
  { id: "click-effect", url: "/assets/sounds/click.wav" },
];

// Preload sounds
soundManager
  .preloadSounds(soundsToLoad)
  .then(() => {
    console.log("All sounds loaded successfully");
  })
  .catch((error) => {
    console.error("Error loading sounds:", error);
  });

// Play a sound
soundManager.play("background-music", {
  volume: 0.7,
  fadeIn: 2,
});
```

### 2. Using Sound Manager as a Library File

If you prefer to include Sound Manager directly as a library file in your project, you can use the UMD (Universal Module Definition) version. This approach allows you to integrate the sound manager without package managers or build tools - simply include the JavaScript file in your HTML.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="/favicon.ico" type="image/x-icon" />
    <title>Sound Manager Implementation</title>
  </head>
  <body>
    <div id="app"></div>
    <!-- Include the UMD version of the Sound Manager -->
    <script src="./lib/sound-manager-ts.umd.js?v=4.0.0"></script>
    <script>
      // Initialize the Sound Manager
      const soundManager = new SoundManager({
        autoMuteOnHidden: true, // Mute when tab is hidden
        autoResumeOnFocus: true, // Resume on tab focus
        defaultVolume: 0.8, // Default volume (0-1)
        spatialAudio: false, // Enable spatial audio
      });

      // Define sounds to preload
      const soundsToLoad = [
        { id: "background-music", url: "/assets/sounds/background.mp3" },
        { id: "click-effect", url: "/assets/sounds/click.wav" },
      ];

      // ====================================================================
      // Method 1: Preload sounds using Promises (then/catch)
      // ====================================================================
      soundManager
        .preloadSounds(soundsToLoad)
        .then(() => {
          console.log("All sounds loaded successfully");

          // Play a sound
          soundManager.play("background-music", {
            volume: 0.7,
            fadeIn: 2,
          });

          // Control individual sounds
          soundManager.stop("background-music");
        })
        .catch((error) => {
          console.error("Error loading sounds:", error);
        });

      // ====================================================================
      // Method 2: Preload sounds using async/await
      // ====================================================================
      async function loadAndPlaySounds() {
        try {
          // Preload sounds
          await soundManager.preloadSounds(soundsToLoad);
          console.log("All sounds loaded successfully");

          // Play a sound
          soundManager.play("background-music", {
            volume: 0.7,
            fadeIn: 2,
          });

          // Control individual sounds
          soundManager.stop("background-music");
        } catch (error) {
          console.error("Error loading sounds:", error);
        }
      }

      // Call the async function
      loadAndPlaySounds();

    </script>
  </body>
</html>
```

## Usage

```typescript
import { SoundManager, SoundManagerConfig, SoundEventsEnum } from 'sound-manager-ts';

// Optional configuration
export interface SoundManagerConfig {
  autoMuteOnHidden: true; // Automatically mute when page or tab of your browser is not active
  autoResumeOnFocus: true; // Automatically resume when page or tab of your browser gets focus
  autoMuteOnHidden: true, // When the page is hidden, all sounds are muted
  autoResumeOnFocus: true, // when the page is focused again, all sounds are resumed
  crossOrigin: null, // CORS setting for audio files
  debug: false,  //  Enable debug logging
  defaultPlaybackRate: 1, // Default playback rate for new sounds
  defaultPan: 0, //  Default pan for new sounds (0-1)
  defaultVolume: 1, // Default volume for new sounds (0-1)
  fadeInDuration: 1, // Default fade-in duration in seconds
  fadeOutDuration: 1, // Default fade-out duration in seconds
  spatialAudio: true, //  Enable spatial audio features
  loopSounds: false, // Loop all sounds by default
  maxLoops: -1,// if loopSounds is true and maxLoops is set, the sound will loop maxLoops times  (-1 is for infinite)
  pannerNodeConfig: DEFAULT_PANNER_CONFIG, // Default panner settings
}

// Initialize sound manager with config
const soundManager = new SoundManager(config);

// Define sounds to preload
const soundsToLoad = [
    { id: 'background-music', url: '/assets/sounds/background.mp3' },
    { id: 'click-effect', url: '/assets/sounds/click.wav' }
];

// Preload sounds (recommended)
try {
    await soundManager.preloadSounds(soundsToLoad);
    console.log('All sounds loaded successfully');
} catch (error) {
    console.error('Error loading sounds:', error);
}

// Add event listeners
soundManager.addEventListener(SoundEventsEnum.STARTED, (event) => {
    console.log(`Sound ${event.soundId} started playing at ${event.timestamp}`);
});

soundManager.addEventListener(SoundEventsEnum.ENDED, (event) => {
    console.log(`Sound ${event.soundId} finished playing`);
});

// Play a sound with options
soundManager.play('background-music', {
    volume: 0.7,
    fadeIn: 2000,
    fadeOut: 1,
    pan: -0.5,
    startTime: 0
});

// Control individual sounds
soundManager.pauseSound('background-music');
soundManager.resume('background-music');
soundManager.stop('background-music');
soundManager.seek('background-music', 30); // Seek to 30 seconds

// Volume control
soundManager.setSoundVolume('background-music', 0.5);
soundManager.setGlobalVolume(0.8);

// Pan control
soundManager.setPan('background-music', -0.5); // Pan left
soundManager.setGlobalPan(0.3); // Slight right pan for all sounds

// Fade effects
soundManager.fadeIn('background-music', 2); // Fade in over 2 seconds
soundManager.fadeOut('background-music', 1); // Fade out over 1 second
soundManager.fadeGlobalIn(1.5); // Fade in all sounds
soundManager.fadeGlobalOut(1.5); // Fade out all sounds

// Playback rate
soundManager.setPlaybackRate('background-music', 1.5);

// Full example using Sprites
const soundsToLoad = [
	{ id: "game-sound", url: gameSounds },        
];

await this.soundManager.preloadSounds(soundsToLoad);

let mySprite: any = {
	intro: [0, 2],
	levelup: [2.4, 4],
	jump: [4, 5],
	fail: [5, 7]
};

this.soundManager.setSoundSprite("game-sound", mySprite);

this.soundManager.playSprite("game-sound", "intro", { fadeIn: 1, pan: 0.8, playbackRate: 1.5});
this.soundManager.playSprite("game-sound", "jump", { loop: true});
this.soundManager.playSprite("game-sound", "levelup", { fadeOut: 1, pan: -0.8});

setTimeout( ()=> {
    this.soundManager.playSprite(this.id, "fail", { pan: 0.8});
}, 500);


// 3D Spatial Audio
// Set on a specific sound the 3d / spatial audio positioni
soundManager.setSpatialPosition(5, 0, -2, 'background-music');

// Set the master spatial position (x, y, z)
soundManager.setMasterSpatialPosition(10, 0, -3);

// Mute controls
soundManager.muteAllSounds();
soundManager.unmuteAllSounds();
soundManager.mute('background-music');
soundManager.unmute('background-music');
soundManager.toggleMute('background-music');
soundManager.toggleGlobalMute();

// Spatial audio (if enabled in config)
soundManager.setSpatialPosition('background-music', 1, 0, -1);
soundManager.resetSpatialPosition('background-music');
soundManager.removeSpatialEffect();
soundManager.isSpatialAudioActive('background-music');
soundManager.updatePannerConfig('background-music',
    <SoundPannerConfig>{
        panningModel: PanningModel.HRTF,
        distanceModel: DistanceModel.Inverse,
        refDistance: 1,
        maxDistance: 10000,
        rolloffFactor: 0.2,
        coneInnerAngle: 360,
        coneOuterAngle: 360,
        coneOuterGain: 0,
    }
);

// State checks
const isPlaying = soundManager.isPlaying('background-music');
const isPaused = soundManager.isPaused('background-music');
const isStopped = soundManager.isStopped('background-music');
const state = soundManager.getSoundState('background-music');

// Reset all sound settings to default values
soundManager.reset();

// Or use the SoundResetOptions
soundManager.reset({
  keepVolumes: true; // Keep current volume settings
  keepPanning: false; // Keep current panning settings
  keepSpatial: false; // Keep spatial audio settings
  unloadSounds: false; // Unload all sounds
})

// Cleanup
soundManager.destroy();

```

## Interfaces

## Public methods on the SoundManager

```typescript
export interface SoundManagerInterface {
  // Playback control
  play(id: string, options?: PlayOptions, skipDispatchEvent?: boolean): void;
  playSprite(id: string, spriteKey: string, options: PlayOptions, skipDispatchEvent?: boolean): void
  pause(id: string, skipDispatchEvent?: boolean): void;
  resume(id: string, skipDispatchEvent?: boolean): void;
  stop(id: string, skipDispatchEvent?: boolean): void;
  seek(id: string, time: number, skipDispatchEvent?: boolean): void;

  // Volume control
  getVolume(id: string): number;
  setSoundVolume(id: string, volume: number): void;
  getSoundVolume(id: string): number;
  setGlobalVolume(volume: number): void;
  getGlobalVolume(): number;

  // Loop control
  setLoop(id: string, loop: boolean): void
  getLoop(id: string): boolean

  // Mute control
  muteAllSounds(): void;
  unmuteAllSounds(): void;
  mute(id: string): void;
  unmute(id: string): void;
  toggleGlobalMute(): void;
  toggleMute(id: string): void;

  // Sound loading and management
  loadSounds(soundsToLoad: { id: string; url: string }[]): Promise<void>;
  loadSound(id: string, url: string): Promise<void>;
  updateSoundUrl(id: string, newUrl: string): Promise<void>;
  unloadSound(id: string): void
  removeSound(id: string): void
  isSoundLoaded(id: string): boolean;
  hasSound(id: string): boolean;

  // State checks
  isPlaying(id: string): boolean;
  isPaused(id: string): boolean;
  isStopped(id: string): boolean;
  getSoundState(id: string): SoundStateInfo;
  getSoundCount(): number;
  isReady(): boolean;

  // Progress tracking
  getCurrentTime(id: string): number;
  getDuration(id: string): number;
  getProgress(id: string): number; // Returns the progress as a ratio (0-1)
  getProgressPercentage(id: string): number;
  startProgressTracking(id: string): void;
  stopProgressTracking(id: string): void;

  // Batch operations
  stopAllSounds(): void;
  pauseAllSounds(): void;
  resumeAllSounds(): void;
  reset(options?: SoundResetOptions): void;

  // Fading
  fadeIn(id: string, duration: number, startVolume?: number, endVolume?: number): void;
  fadeOut(id: string, duration?: number, startVolume?: number, endVolume?: number, stopAfterFade?: boolean): void;
  fadeGlobalIn(duration?: number, startVolume?: number, endVolume?: number): void;
  fadeGlobalOut(duration?: number, startVolume?: number, endVolume?: number): void;

  // Spatial audio
  isSpatialAudioEnabled(): boolean;
  setSpatialPosition(x: number, y: number, z: number, soundId?: string | null, soundPannerConfig?: SoundPannerConfig, skipEvent?: boolean): void;
  getSpatialPosition(soundId: string): { x: number; y: number; z: number } | null;
  setMasterSpatialPosition(x: number, y: number, z: number, config?: SoundPannerConfig, skipEvent?: boolean): void;
  resetSpatialPosition(id: string): void;
  removeSpatialEffect(id: string): void;
  isSpatialAudioActive(id: string): boolean;
  updatePannerConfigById(soundId: string, newConfig: Partial<SoundPannerConfig>): void;

  // Pan control
  setPan(id: string, pan: number): void;
  removePan(id: string): void;
  setGlobalPan(value: number): void;
  getGlobalPan(): number;
  resetPan(id?: string): void;
  resetGlobalPan(): void;
  cleanupGlobalPan(): void;
  isStereoPanActive(id: string): boolean;

  // Sprite logic
  setSoundSprite(id: string, sprite: { [key: string]: [number, number] }): void;
  getSpriteConfig(id: string): { [key: string]: [number, number] } | undefined;
  removeSpriteConfig(id: string): void 

  // Context management
  suspendContext(): Promise<void>;
  resumeContext(): Promise<void>;
  getContext(): AudioContext;

  // Utilities
  setDebugMode(debug: boolean): void;
  getConfig(): Readonly<SoundManagerConfig>;
  getSound(id: string): Sound | undefined;
  getBuffer(id: string): AudioBuffer | undefined;
  getSource(id: string): AudioBufferSourceNode | undefined;
  getGainNode(id: string): GainNode | undefined;
  getSoundIds(): string[];
  updateSoundOptions(soundId: string, options: Partial<PlayOptions>): void;
  setPlaybackRate(id: string, rate: number): void;
  getLastError(): Error | null;
  roundValue(value: number, decimals: number): number; // Default precision is this.DEFAULT_PRECISION
  destroy(): void;

  // Listeners / Event handling
  addEventListener(type: SoundEventsEnum, callback: (event: SoundEvent) => void): void;
  removeEventListener(type: SoundEventsEnum, callback: (event: SoundEvent) => void): void;
  dispatchEvent(event: SoundEvent): void;
  hasEventListener(type: SoundEventsEnum): boolean;

}

```

## PlayOptions

Options for playing a sound

```typescript
export interface PlayOptions {
  fadeIn?: number; // in seconds
  fadeInStartVolume?: number; // 0 to 1
  fadeOut?: number; // in seconds
  pan?: number; // -1 (left) to 1 (right)
  panSpatialPosition?: { x: number; y: number; z: number };
  startTime?: number; // in seconds
  volume?: number; // 0 to 1
  loop?: boolean; // default: false
  maxLoops?: number; // -1 for infinte, number > 0 for specific number of loops
  playbackRate?: number;
  duration?:number; // in seconds
  pauseAtDurationReached?: boolean; // by default it will trigger the stop method when the duration is reached
  isSeeking?: boolean; // used internally for the seek method
}
```

## SoundEvent

Event object dispatched by the sound manager:

```typescript
export interface SoundEvent {
  currentTime?: number;
  duration?:number;
  error?: Error;
  isMaster?: boolean;
  isMuted?: boolean;
  options?: PlayOptions;
  pan?: number;
  pannerConfig?: SoundPannerConfig;
  playbackRate?: number;
  position?: { x: number; y: number; z: number };
  previousPan?: number;
  progress?: number; // ratio from 0 to 1
  progressInfo?: SoundProgressStateInfo;
  resetOptions?: SoundResetOptions;
  sound?: Sound;
  soundId?: string;
  timestamp?: number;
  type: SoundEventsEnum;
  volume?: number;
}
```

## SoundEventsEnum

Available event types:

```typescript
export enum SoundEventsEnum {
  ENDED = 'ended',
  ERROR = 'error',
  FADE_IN_COMPLETED = 'fade_in_completed',
  FADE_MASTER_IN_COMPLETED = 'fade_master_in_completed',
  FADE_MASTER_OUT_COMPLETED = 'fade_master_out_completed',
  FADE_OUT_COMPLETED = 'fade_out_completed',
  GLOBAL_SPATIAL_POSITION_CHANGED = 'global_spatial_position_changed',
  LOOP_COMPLETED = 'loop_completed',
  MASTER_PAN_CHANGED = 'master_pan_changed',
  MASTER_VOLUME_CHANGED = 'master_volume_changed',
  MUTE_GLOBAL = 'mute_global',
  MUTED = 'muted',
  OPTIONS_UPDATED = 'options_updated',
  PAN_CHANGED = 'pan_changed',
  PAN_RESET = 'pan_reset',
  PAUSED = 'paused',
  PLAYBACK_RATE_CHANGED = 'playback_rate_changed',
  PROGRESS = 'progress',
  RESET = 'reset',
  RESUMED = 'resumed',
  SEEKED = 'seeked',
  SPATIAL_POSITION_CHANGED = 'spatial_position_changed',
  SPATIAL_POSITION_RESET = 'spatial_position_reset',
  SPRITE_SET = 'sprite_set',
  STARTED = 'started',
  STOPPED = 'stopped',
  UNMUTE_GLOBAL = 'unmute_global',
  UNMUTED = 'unmuted',
  UNLOADED = 'unloaded',
  UPDATED_URL = 'updated_url',
  VOLUME_CHANGED = 'volume_changed',
}
```

## SoundManagerConfig

Configuration options:

```typescript
export interface SoundManagerConfig {
  autoMuteOnHidden?: boolean; // Automatically mute when page or tab of your browser is not active
  autoResumeOnFocus?: boolean; // Automatically resume when page or tab of your browser gets focus
  crossOrigin?: "anonymous" | "use-credentials" | null; // CORS setting for audio files
  debug?: boolean; // Enable debug logging
  defaultPlaybackRate?: number // The default playbackRate is 1
  defaultPan?: number; // The default pan value = 0, in the center. Posiible values are (-1 to 1)
  defaultVolume?: number; // Default volume for new sounds (0-1)
  fadeInDuration?: number; // Default fade-in duration in seconds
  fadeOutDuration?: number; // Default fade-out duration in seconds
  defaultStartTime?: number; // Default start time for new sounds
  spatialAudio?: boolean; // Enable spatial audio features
  loopSounds?: boolean // Loop all sounds by default
  maxLoops?: number // if loopSounds is true and maxLoops is set, the sound will loop maxLoops times  (-1 is for infinite)
  pannerNodeConfig?: SoundPannerConfig; // Panner settings for 3D sound
  defaultPanSpatialPosition?: { x: number; y: number; z: number };
}

```

## Sound State Information

Information about a sound's current state:

```typescript
interface SoundStateInfo {
  currentTime: number; // Current playback position in seconds
  duration: number | null; // Total duration of the sound
  state: SoundState; // Current state (playing/paused/stopped)
  volume: number; // Current volume level
}
```

## SoundState

Possible states of a sound:

```typescript
enum SoundState {
  Playing = "playing",
  Paused = "paused",
  Stopped = "stopped",
}
```

### SoundProgressStateInfo

Sound progress information, is connected to the sound event ->progressInfo

```typescript
  export interface SoundProgressStateInfo {
    soundId: string;
    currentTime: number;
    duration: number;
    progress: number; // 0-1
  }
```


## Demo included

The package includes a comprehensive demo showcasing all features:

- Demo Features
- Sound loading and preloading
  - Individual sound controls
  - Play/Pause/Stop buttons
  - Loop controls
  - Volume slider
  - Pan control
  - Fade in/out controls
  - Seek bar with time display
- Global controls
  - Master volume
  - Master pan
  - Mute toggle
  - Stop all sounds
- Real-time status display
- Event logging
- Spatial audio controls

## Running the Demo

1. Install dependencies: `npm install`
2. Start the demo: npm run dev
3. Open http://localhost:5173 in your browser

Features are automatically adapted based on browser support:

- Falls back gracefully when spatial audio is not supported
- Handles browser autoplay policies
- Manages WebAudio context state
- Provides webkit prefix support for Safari

## Licence

This project is developed by Chris Schardijn. It is free to use in your project.

## 📋 Version History

### 5.0.0 (Major udpate)
 - Changed configuration values from miliseconds to seconds. 
 - Added more utility methods for better sound state management and control.
 - Renamed the following methods
| Old Method                               | New Method                                |
| ---------------------------------------- | ----------------------------------------- |
| `soundManager.setSoundPosition(id)`      | `soundManager.setSpatialPosition(id)`     |
| `soundManager.resetSoundPosition(id)`    | `soundManager.resetSpatialPosition(id)`   |
| `playOptions`  (interface)               | `PlayOptions` (interface)                 |
| `preloadSounds`                          | `loadSounds`                              |

- Added new methods

  ```typescript
  getVolume(id: string): number;

    // Loop control
  setLoop(id: string, loop: boolean): void
  getLoop(id: string): boolean

  loadSound(id: string, url: string): Promise<void>;
  unloadSound(id: string): void
  removeSound(id: string): void

  // State checks
  getSoundCount(): number;
  isReady(): boolean;

  // Progress tracking
  getDuration(id: string): number;
  startProgressTracking(id: string): void;
  stopProgressTracking(id: string): void;

  // Spatial audio
  setSpatialPosition(x: number, y: number, z: number, soundId?: string | null, soundPannerConfig?: SoundPannerConfig, skipEvent?: boolean): void;
  getSpatialPosition(soundId: string): { x: number; y: number; z: number } | null;

  // Context management
  suspendContext(): Promise<void>;
  resumeContext(): Promise<void>;
  getContext(): AudioContext;

  // Utilities
  getSound(id: string): Sound | undefined;
  getBuffer(id: string): AudioBuffer | undefined;
  getSource(id: string): AudioBufferSourceNode | undefined;
  getGainNode(id: string): GainNode | undefined;
  getSoundIds(): string[];
  getLastError(): Error | null;
  roundValue(value: number, decimals: number): number; // Default precision is this.DEFAULT_PRECISION

  // Listeners / Event handling
  dispatchEvent(event: SoundEvent): void;
  hasEventListener(type: SoundEventsEnum): boolean;
  
  }
```

- Added more PlayOptions
  * newSoundInstance (if false, it will use the previously instance of the sound)
  * playbackRate
  * isSeeking
  * duration (seconds)
  * pauseAtDurationReached (by default it will trigger the stop method when the duration is reached)
  
- Added more information to the getSoundState(id) `SoundStateInfo`
  * elapsedTime
  * panSpatialPosition
  * rawDuration

- Rebuild demo page
  * seperate component for the spatial grid
  * added dark theme
  * seperate component master constrols
  * seperate component sound controls
  * added playbackRate UI 
  
- Bug fixes
  * startTime in PlayOptions was not working correctly.
  * fix issues with spatial audio
  * fix reset method
  * playBackRate
  * fadeIn / fadeOut


### 4.0.0 (Major update)

- Added PROGRESS event listener for sound playback monitoring
- Rebuilt sound sprite system with improved logic
- Fixed sound configuration issues (volume, fadeIn/fadeOut)
- Simplified build process and removed unnecessary Vite plugins
- Rebuild demo structure and split the code in components.
- Added new sound management methods:

```typescript
  getCurrentTime(id: string): number;
  getProgress(id: string): number; // Returns the progress as a ratio (0-1)
  getProgressPercentage(id: string): number;
  setDebugMode(debug: boolean): void;
 ```

### 3.2.0

- Fixed issues with typescript declaration maps in build process

#### 🎉 Added features

- Added support for playback rate adjustment via the setPlaybackRate method
- New event: PLAYBACK_RATE_CHANGED is dispatched when the playback rate is updated.
- Added support for sound sprites, allowing you to define and play specific segments of a sound file
- Added event: SPRITE_SET
- Added a setMasterSpatialPosition method to control the 3D spatial position of all sounds globall
- Improved handling of spatial audio (3D audio) with fixes for issues related to positioning and listener configuration.
- Added a demo panel to visualize and control the master spatial position

### 3.1.0

- TypeScript declaration maps was missing in build process

### 3.0.0

#### 🚨Breaking changes and new Features

#### Improvements

- API Improvements
  - 🎯 Refactored method names for improved clarity and consistency.
  - Added new utility methods for better sound state management and control.

| Old Method                               | New Method                                |
| ---------------------------------------- | ----------------------------------------- |
| `soundManager.playSound(id)`             | `soundManager.play(id)`                   |
| `soundManager.stopSound(id)`             | `soundManager.stop(id)`                   |
| `soundManager.pauseSound(id)`            | `soundManager.pause(id)`                  |
| `soundManager.resumeSound(id)`           | `soundManager.resume(id)`                 |
| `soundManager.seekTo(id, time)`          | `soundManager.seek(id, time)`             |
| `soundManager.setVolumeById(id, volume)` | `soundManager.setSoundVolume(id, volume)` |
| `soundManager.getVolumeById(id)`         | `soundManager.getSoundVolume(id)`         |
| `soundManager.setGlobalVolume(volume)`   | `soundManager.setGlobalVolume(volume)`    |
| `soundManager.getGlobalVolume()`         | `soundManager.getGlobalVolume()`          |
| `soundManager.muteAllSounds()`           | `soundManager.muteAll()`                  |
| `soundManager.unmuteAllSounds()`         | `soundManager.unmuteAll()`                |
| `soundManager.muteSoundById(id)`         | `soundManager.mute(id)`                   |
| `soundManager.unmuteSoundById(id)`       | `soundManager.unmute(id)`                 |
| `soundManager.toggleMute()`              | `soundManager.toggleGlobalMute()`         |
| `soundManager.fadeMasterIn(...)`         | `soundManager.fadeGlobalIn(...)`          |
| `soundManager.fadeMasterOut(...)`        | `soundManager.fadeGlobalOut(...)`         |
| `soundManager.setMasterPan(value)`       | `soundManager.setGlobalPan(value)`        |
| `soundManager.getMasterPan()`            | `soundManager.getGlobalPan()`             |
| `soundManager.resetMasterPan()`          | `soundManager.resetGlobalPan()`           |
| `soundManager.cleanupMasterPan()`        | `soundManager.cleanupGlobalPan()`         |

- 🛠️ Enhanced configuration system

  - Added separate configuration file for better organization
  - Support for default spatial audio settings
  - Configurable initial volume and panning
  - Global loop settings configuration

- 📊 Expanded event system

  - Added OPTIONS_UPDATED event for runtime changes
  - Improved event handling for spatial updates
  - Better synchronization between UI and audio state

- 🎨 UI/UX enhancements

#### Added features

- 🎮 Added comprehensive loop control system

  - Support for infinite and custom loop counts
  - Added loop iteration tracking and completion events
  - Implemented maxLoops configuration with -1 for infinite loops
  - Runtime loop configuration updates via UI controls

- 🎯 Enhanced seeking functionality

  - Improved real-time scrubbing with debounced updates
  - Optimized seek performance during playback
  - Better handling of seeking during loop playback
  - Added visual feedback during seek operations
  - Fixed multiple audio instance issues during seeking

- 🔊 Implemented 3D spatial audio support
  - Added configurable panning and distance models
  - Interactive 2D position grid for sound placement
  - Configurable spatial parameters:
    - Reference and max distance
    - Rolloff factor
    - Cone angles and outer gain
  - Real-time spatial parameter updates
  - Collapsible control panels for better space management
  - Improved master controls section
  - Enhanced visual feedback for audio operations
  - Better organization of spatial audio controls

### 2.3.0

- 🔧 Fixed type declarations to prevent duplicate exports with incremental suffixes (\_2)
- 📁 Reorganized types into dedicated folder structure

### 2.2.0

- 🏗️ Restructured project with dedicated types folder
- 🔧 Fixed build process and file organization
- 📦 Updated package exports configuration
- 🎯 Improved TypeScript type definitions

### 2.1.3 ~ 2.1.9 (Current)

- Enhanced README.MD documentation
- 🎨 Added badges for npm version and license
- 📚 Improved package description and keywords
- 🔄 Updated version history formatting

### 2.1.2

🐛 **Bug Fixes**

- Fixed spatial audio positioning bug for initial playback
- Improved sound preloading sequence

🎵 **Audio Improvements**

- Replaced woodpecker sound with crickets for better spatial demo

### 2.1.1

📚 **Documentation**

- Enhanced README.MD documentation
- Updated package metadata

⚡ **Dependencies**

- Updated package.json dependencies

### 2.1.0

✨ **New Features**

- Added PAN_CHANGED event
- Added front indicator line for spatial audio

🔧 **Improvements**

- Flipped z-axis logic for more intuitive spatial audio control
- Fixed recursive event loop in pan/spatial reset

### 2.0.0 (Major Release)

🎉 **Major Features**

- Added master pan control
- Enhanced spatial audio support
- Improved event system

🔨 **Technical Improvements**

- Rebuilt core audio logic
- Added TypeScript declaration maps
- Enhanced documentation

🎮 **Demo**

- Completely rebuilt demo page for better UX

### 1.3.0

🐛 **Bug Fixes**

- Fixed TypeScript .d.ts error issues

✨ **Enhancements**

- Improved error handling
- Added additional event types

### 1.2.0

🔧 **Build System**

- Fixed npm build process
- Added TypeScript 5.7.2 dependency

### 1.1.0

🚀 **Major Improvements**

- Fixed critical pause/resume functionality
- Enhanced demo UI and controls

🔒 **Security & Stability**

- Resolved AudioContext initialization issues
- Improved error handling and state management
- Added user gesture handling

📝 **Development**

- Added comprehensive debug logging

### 1.0.4

🎉 **Initial Release**

- Basic audio playback functionality
- Core feature implementation

## 🚀 Upcoming Features

- Add setPlaybackRate to the demo for adjustable audio speed
- Add showcase of the sound sprite to play multiple effects from a single file
- Improvements on various sound logic
- Spatial Recording & Playback
