# 🎵 sound-manager-ts |  SoundManager for Web Audio API

[![npm version](https://img.shields.io/npm/v/sound-manager-ts)](https://www.npmjs.com/package/sound-manager-ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/sound-manager-ts)](https://bundlephobia.com/result?p=sound-manager-ts)
[![npm downloads](https://img.shields.io/npm/dt/sound-manager-ts)](https://www.npmjs.com/package/sound-manager-ts)
[![Donate ❤](https://img.shields.io/badge/Donate-%E2%9D%A4-ff69b4)](https://www.paypal.com/donate/?hosted_button_id=M94NZXNHS8DT2)

A powerful and lightweight (13KB gzipped) sound management system I crafted to make Web Audio API accessible and enjoyable. Perfect for web applications, games, and interactive experiences that demand precise audio control without the complexity. No more wrestling with time calculations or audio states - everything is handled for you. Simply listen to sound events or use getSoundState('soundId') to access comprehensive audio data, ready to integrate with your UI.

## Live Demo's implementing the sound manager

[Visit the main demo page](https://chriscreativecode.com/sound-manager-ts/demo/ "A demo showcase of my Sound Manager")

[Codepen.io (Demo / Playground) JavScript](https://codepen.io/Chris-Front-end-developer/pen/gbOBqPd "A demo in codepen.io (JavaScript)")

[Codepen.io (Demo / Playground) TypeScript](https://codepen.io/Chris-Front-end-developer/pen/RNRzyym "A demo in codepen.io (TypeScript)")

## Why Choose This Package?

🚀 **Modern & Efficient**

- Built on the latest Web Audio API
- Only 13 KB gzipped
- Zero dependencies
- Easy to connect to a UI interface.

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

- 🎚️ **Volume Control & Fading**  
  Easily adjust volume levels for individual sounds or globally. Supports smooth fade-in and fade-out effects.  

- 🎯 **Spatial Audio Positioning**  
  Create immersive 3D audio experiences with spatial audio positioning (x, y, z coordinates).

- ⏯️ **Playback Control** 
  Play, pause, resume, and stop sounds with precision. Supports seamless looping and custom start/end times.

- 🎛️ **Pan & Balance Adjustment**  
  Adjust stereo panning for individual sounds or globally. Supports both stereo and spatial panning.

- ⚡ **Event-Driven Architecture** 
  Built with an event-driven design, allowing you to hook into sound events like play, pause, volume changes, and more.

- 📱 **Mobile-Friendly**  
Optimized for mobile devices with support for auto-resume on focus and auto-mute on page hidden.

- 🎚️ **Sound Groups**  
Organize sounds into groups for easier management. Apply volume, pan, and playback rate adjustments to entire groups.

- ⏩ **Playback Rate Control**  
Adjust the playback speed of sounds without affecting pitch. Perfect for slow-motion or fast-forward effects.

- 🔁 **Looping & Max Loops**  
Loop sounds indefinitely or set a maximum number of loops for controlled playback.

- 🎶 **Sound Sprites**  
Split audio files into smaller segments (sprites) for precise playback of specific sections.

- 📊 **Progress Tracking**  
Track playback progress in real-time with events for progress updates, duration changes, and more.

- 🔇 **Mute & Unmute**  
Mute or unmute individual sounds, groups, or the entire audio context.

- 🔄 **Reset & Cleanup**  
Reset individual sounds or the entire sound manager to their initial state. Clean up resources when no longer needed.

- 📡 **Cross-Origin Support**  
Load sounds from external sources with cross-origin support.

- 🔧 **Debug Mode**  
Enable debug mode for detailed logging and troubleshooting.

- 🎧 **Audio Context Management**  
Automatically handle audio context suspension and resumption for better performance and compatibility.

## Note

- Development Status: This sound manager has undergone significant recent enhancements, with numerous additional features including sound groups, sprites, and more. After extensive testing and resolving various edge cases, version 5.2.0 now appears stable with most features and scenarios thoroughly validated.

- The documentation page will be published on GitHub within the next month or so.

- Contribution: If you encounter any issues or have ideas for enhancements, please don't hesitate to share them. Your input is valuable and will help shape the final version!

## Browser Support

Supports all modern browsers including Chrome, Firefox, Safari, and Edge (98.5% global coverage).

Transform your web audio experience with just a few lines of code!

## Documentation

- [🎵 sound-manager-ts |  SoundManager for Web Audio API](#-sound-manager-ts---soundmanager-for-web-audio-api)
  - [Live Demo's implementing the sound manager](#live-demos-implementing-the-sound-manager)
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
    - [2. Using Sound Manager as a Library File  / CDN Installation](#2-using-sound-manager-as-a-library-file---cdn-installation)
  - [Usage](#usage)
  - [The SoundManager API](#the-soundmanager-api)
    - [Public methods on the SoundManager](#public-methods-on-the-soundmanager)
    - [PlayOptions](#playoptions)
    - [SoundEvent](#soundevent)
    - [SoundEventsEnum](#soundeventsenum)
    - [SoundGroup](#soundgroup)
    - [SoundManagerConfig](#soundmanagerconfig)
    - [Sound State Information](#sound-state-information)
    - [SoundState](#soundstate)
      - [The Sound Object](#the-sound-object)
      - [SoundProgressStateInfo](#soundprogressstateinfo)
    - [SoundPanType](#soundpantype)
    - [Spatial Audio](#spatial-audio)
    - [Reset options](#reset-options)
  - [Demo included](#demo-included)
  - [Running the Demo](#running-the-demo)
  - [Licence](#licence)
  - [📋 Version History](#-version-history)
    - [5.5.9](#559)
    - [5.5.8](#558)
    - [5.5.7](#557)
    - [5.5.1 ~ 5.5.6](#551--556)
    - [5.5.0 - Enhanced Audio Loading \& Mobile Support](#550---enhanced-audio-loading--mobile-support)
    - [5.1.0 ~ 5.4.0](#510--540)
    - [5.0.0 (Major \& critical udpate )](#500-major--critical-udpate-)
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

soundManager.addEventListener(SoundEventsEnum.LOADED, (event: SoundEvent) => {
  console.log('Sound loaded', event);
});

await soundManager.loadSounds([{ id: "music", url: "/sounds/music.mp3" }]);
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

// Listen to load event
soundManager.addEventListener(SoundEventsEnum.LOADED, (event: SoundEvent) => {
  console.log('Sound loaded', event);
});


// Define sounds to preload
const soundsToLoad = [
  { id: "background-music", url: "/assets/sounds/background.mp3" },
  { id: "click-effect", url: "/assets/sounds/click.wav" },
];

// Preload sounds
soundManager
  .loadSounds(soundsToLoad)
  .then(() => {
    console.log("All sounds loaded successfully");
  })
  .catch((error) => {
    console.error("Error loading sounds:", error);
  });

// Play a sound
soundManager.play("background-music", {
  volume: 0.7,
  fadeInDuration: 2,
});
```

### 2. Using Sound Manager as a Library File  / CDN Installation

If you prefer to include Sound Manager directly as a library file in your project, you can use the UMD (Universal Module Definition) version. This approach allows you to integrate the sound manager without package managers or build tools - simply include the JavaScript file in your HTML.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sound Manager Implementation</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .sound-controls { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px; }
    button { padding: 8px 12px; margin-right: 10px; cursor: pointer; }
  </style>
</head>
<body>
  <h1>Sound Manager Implementation</h1>
  
  <div class="sound-controls">
    <button id="playBtn">Play Background Music</button>
    <button id="stopBtn">Stop Music</button>
    <button id="clickBtn">Play Click Sound</button>
  </div>

  <!-- 
    ====================================================================
    CDN INSTALLATION OPTIONS
    ====================================================================
  -->
  
  <!-- Option 1: UMD Version (Works everywhere) -->
  <script src="https://unpkg.com/sound-manager-ts@5.5.7/dist/sound-manager-ts.umd.js"></script>
  
  <!-- 
    Alternative UMD options:
    - Download and use local file: <script src="/path/to/sound-manager-ts.umd.js"></script>
    - Specific version: <script src="https://unpkg.com/sound-manager-ts@5.5.8/dist/sound-manager-ts.umd.js"></script>
  -->
  
  <!-- Option 2: ESM Version (Modern browsers/bundlers) -->
  <!--
  <script type="module">
    import { SoundManager } from 'https://unpkg.com/sound-manager-ts@5.5.7/dist/sound-manager-ts.es.js';
    // Your ESM code here
  </script>
  -->

  <script>
    // ====================================================================
    // INITIALIZATION
    // ====================================================================
    const soundManager = new SoundManagerTS.SoundManager({
      debug: true, // Enable console logs for debugging
      autoMuteOnHidden: true, // Mute when tab is hidden
      autoResumeOnFocus: true, // Resume when tab regains focus
      defaultVolume: 0.7, // Default volume (0-1)
      spatialAudio: false, // Enable 3D audio if needed
      fadeInDuration: 1, // Default fade-in duration (seconds)
      fadeOutDuration: 1  // Default fade-out duration (seconds)
    });

    
    // ====================================================================
    // Add eventlistener LOADED
    // ====================================================================
    soundManager.addEventListener(SoundEventsEnum.LOADED, (event: SoundEvent) => {
      console.log('Sound loaded', event);
    });

    // ====================================================================
    // SOUND DEFINITIONS
    // ====================================================================
    const sounds = {
      background: {
        id: "background-music",
        url: "https://example.com/sounds/background.mp3",
        options: { loop: true, volume: 0.6 }
      },
      click: {
        id: "click-effect", 
        url: "https://example.com/sounds/click.wav",
        options: { volume: 0.8 }
      }
    };

    // ====================================================================
    // SOUND LOADING (Using async/await)
    // ====================================================================
    async function initializeSounds() {
      try {
        // Load all sounds
        await soundManager.loadSounds([
          { id: sounds.background.id, url: sounds.background.url },
          { id: sounds.click.id, url: sounds.click.url }
        ]);
        
        console.log("All sounds loaded successfully");
        
        // Set up event listeners after sounds are loaded
        setupControls();
        
      } catch (error) {
        console.error("Error loading sounds:", error);
        alert("Failed to load sounds. Please check console for details.");
      }
    }

    // ====================================================================
    // CONTROL FUNCTIONS
    // ====================================================================
    function setupControls() {
      document.getElementById('playBtn').addEventListener('click', () => {
        soundManager.play(sounds.background.id, {
          ...sounds.background.options,
          fadeInDuration: 2 // Override default fade-in
        });
      });

      document.getElementById('stopBtn').addEventListener('click', () => {
        soundManager.stop(sounds.background.id);
      });

      document.getElementById('clickBtn').addEventListener('click', () => {
        soundManager.play(sounds.click.id, sounds.click.options);
      });
    }

    // ====================================================================
    // ERROR HANDLING & EVENTS
    // ====================================================================
    soundManager.addEventListener(SoundManagerTS.SoundEventsEnum.ERROR, (event) => {
      console.error("Sound Manager Error:", event.error);
    });

    soundManager.addEventListener(SoundManagerTS.SoundEventsEnum.ENDED, (event) => {
      console.log(`Sound ${event.soundId} finished playing`);
    });

    soundManager.addEventListener(SoundManagerTS.SoundEventsEnum.PROGRESS, (event) => {
      console.log(`Sound Progress:  ${event.progress} %`);
      console.log(`Sound Progress Info: ${event.progressInfo}`);
    });

    // Initialize the sound manager when page loads
    window.addEventListener('DOMContentLoaded', initializeSounds);
  </script>
</body>
</html>
```

## Usage

```typescript
import { SoundManager, SoundManagerConfig, SoundEventsEnum } from 'sound-manager-ts';

// Optional configuration
export interface SoundManagerConfig {
  autoUnlock?: boolean; // Unlock audio for mobile browser that have restrictions
  autoMuteOnHidden?: boolean; // Automatically mute when page or tab of your browser is not active
  autoResumeOnFocus?: boolean; // Automatically resume when page or tab of your browser gets focus
  createNewInstance?: boolean; // Create a new instance of the sound when playing it. 
  // By default this is false. This is useful when you want to play the same sound multiple times simultaneously. 

  // ------- Loading Configuration: -------------------------------------------------------------
  // Loading Behaviour
  webAudioPreferred?: boolean; // Whether to prefer Web Audio API (default: true)
  html5AudioFallback?: boolean; // Whether to use HTML5 Audio as fallback (default: true)
  maxParallelLoads?: number; // Maximum parallel sound loads (default: 6)
  retryDelay?: number; // Delay between retry attempts in seconds (default: 0.5 seconds)

  // Network Handling
  fetchRetries?: number; // Number of retries for failed fetches (default: 2)
  fetchTimeout?: number; // Timeout for fetch requests in seconds
  corsProxy?: string; // URL of CORS proxy service, the ones I tested that work great are: 
  // corsProxy: "https://cors-anywhere.herokuapp.com/", or corsProxy: "https://corsproxy.io/?",  or your own proxy
  fetchStrategy?: 'direct-first' | 'proxy-first' | 'direct-only';

  // Security & Limits
  maxAudioSize?: number; // in bytes, currently the max is set to 50MB  (50 * 1024 * 1024)
  audioCache?: boolean; // Cache the audio file when loading.
  crossOrigin?: "anonymous" | "use-credentials" | null;
  credentialStrategy?: 'auto' | 'omit' | 'include';
  
  // -----End Loading Configuration-------------------------------------------------------------

  debug?: boolean; // Enable debug logging
  defaultDuration?: number; // Default duration for new sounds, default is undefined (full length of the sound)
  defaultPan?: number; // The default pan value = 0, in the center. Posiible values are (-1 to 1)
  defaultPanSpatialPosition?: { x: number; y: number; z: number };
  defaultPanType?: SoundPanType; // Default pan type
  defaultPlaybackRate?: number // The default playbackRate is 1
  defaultStartTime?: number; // Default start time for new sounds
  defaultVolume?: number; // Default volume for new sounds (0-1)
  fadeInDuration?: number; // Default fade-in duration in seconds
  fadeOutDuration?: number; // Default fade-out duration in seconds
  loopSounds?: boolean // Loop all sounds by default
  maxLoops?: number // if loopSounds is true and maxLoops is set, the sound will loop maxLoops times  (-1 is for infinite)
  pannerNodeConfig?: SoundPannerConfig; // Panner settings for 3D sound
  spatialAudio?: boolean; // Enable spatial audio features
  trackProgress?: boolean; // Track progress of the sound playback. 
  // This will keep track of the process and will dispatch the 'progress' event. This is useful when you want to show the progress of the sound playback.
}

// Initialize sound manager with config
const soundManager = new SoundManager(config);

// Listen to Sound Loaded event
soundManager.addEventListener(SoundEventsEnum.LOADED, (event: SoundEvent) => {
  console.log('Sound loaded', event);
});

// Define sounds to preload
const soundsToLoad = [
    { id: 'background-music', url: '/assets/sounds/background.mp3' },
    { id: 'click-effect', url: '/assets/sounds/click.wav' }
];

// Preload sounds (recommended)
try {
    await soundManager.loadSounds(soundsToLoad);
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
    loop: true,
    fadeInDuration: 2,
    fadeOutDuration: 2,
    playbackRate: 0.5,
    pan: -0.5,
    startTime: 0
});

// Control individual sounds
soundManager.pauseSound('background-music');
soundManager.resume('background-music');
soundManager.stop('background-music');
soundManager.seek('background-music', 12); // Seek to 12 seconds

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

await this.soundManager.loadSounds(soundsToLoad);

let mySprite: any = {
	intro: [0, 2], // 0,2 means start from 0 seconds until 2 seconds.
	levelup: [2.4, 4], // start from 2.4 seconds till 4 seconds.
	jump: [4, 5],
	fail: [5, 7]
};

this.soundManager.setSoundSprite("game-sound", mySprite);

this.soundManager.playSprite("game-sound", "intro", { fadeInDuration: 1, pan: 0.8, playbackRate: 1.5});
this.soundManager.playSprite("game-sound", "jump", { loop: true});
this.soundManager.playSprite("game-sound", "levelup", { fadeOutDuration: 1, pan: -0.8});

setTimeout( ()=> {
    this.soundManager.playSprite(this.id, "fail", { pan: 0.8});
}, 500);


// Sound Group example.
// 
// In this example, when pressing the letter c, a piano note is triggerd. These piano notes are
// played in the sound group 'pian-group' where volume, paning and more can be managed.

// First, we create a Sound Group called piano-group.  
// This group will manage up to 12 sound instances and set default options like volume and panning.

this.soundManager.createSoundGroup('piano-group', {
  maxInstances: 12, // Limit the group to 12 simultaneous sounds
  playOptions: {
    volume: 0.8, // Default volume for sounds in this group
    pan: 0, // Default panning (center)
  },
});

// Next, we set up an event listener to play a new sound instance whenever a key is pressed. 
// In this case, pressing the C key will play the piano-note sound.

document.addEventListener('keydown', (e) => {
  if (e.key === 'c') {
    // Play the "piano-note" sound with custom options
    const sound = this.soundManager.play('piano-note', {
      // groupId: 'piano-group', // Optionally, you can add the sound to a group here
      trackProgress: true, // Enable progress tracking for this instance
      loop: true, // Loop the sound
      volume: 1, // Set volume (overrides group default)
      playbackRate: 1, // Playback speed (1 = normal speed)
      pan: Math.random() * 2 - 1, // Random panning between left (-1) and right (1)
      createNewInstance: true, // Create a new instance of the sound
    });
  }
});

// To track the progress of each sound instance, we add an event listener for the PROGRESS event. 
// This allows you to monitor how far along each sound is in its playback.
this.soundManager.addEventListener(
  SoundEventsEnum.PROGRESS,
  (event) => {
      console.log(`Progress for instance ${event.instanceId}: ${event.progress}`);
  },
  { originalId: "piano-note" } // Optional: Filter by originalId
);


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

## The SoundManager API 


### Public methods on the SoundManager

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
  getMasterOutput(): AudioNode; // Returns the master output node for external connections (e.g. AnalyserNode)

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

### PlayOptions

Options for playing a sound

```typescript
export interface PlayOptions {
  createNewInstance?: boolean; // Create a new instance of the sound when playing it. 
  //  By default this is false. This is useful when you want to play the same sound multiple times simultaneously.
  duration?:number; // in seconds
  fadeInDuration?: number; // in seconds
  fadeInStartVolume?: number; // 0 to 1
  fadeOutDuration?: number; // in seconds, when you play a sound it will immidiately start fading out
  fadeOutEndVolume?: number; // 0 to 1
  fadeOutBeforeEndDuration?: number; // in seconds, fade out before the sound ends
  groupId?: string; // Group ID for the sounds that will be in this group. 
  isSeeking?: boolean; // used internally for the seek method
  loop?: boolean; // default: false
  maxLoops?: number; // -1 for infinte, number > 0 for specific number of loops
  pan?: number; // -1 (left) to 1 (right)
  panSpatialPosition?: { x: number; y: number; z: number }; //  If you want to use 3D panning you must also set panType to SoundPanType.Spatial
  panType?: SoundPanType; // 'stereo' or 'spatial' (default is 'stereo') 
  pauseAtDurationReached?: boolean; // This will only work if you set the duration and if that duration 
  // is reached it will pause. Note: Loop must be false.
  playbackRate?: number; // 0.5 to 4 (normal speed is 1) 
  startTime?: number; // in seconds
  trackProgress?: boolean; // Track progress of the sound playback. 
  // This will keep track of the process and will dispatch the 'progress' event. 
  // This is useful when you want to show the progress of the sound playback.
  volume?: number; // 0 to 1
}
```

### SoundEvent

Event object dispatched by the sound manager:

```typescript
export interface SoundEvent {
  currentTime?: number;
  duration?:number;
  error?: Error;
  instanceId?: string; // Add this for instance tracking
  isMaster?: boolean;
  isMuted?: boolean;
  options?: PlayOptions;
  originalId?: string; // Add this to track the original sound ID
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

### SoundEventsEnum

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
  UNLOADED = 'unloaded',
  UNMUTE_GLOBAL = 'unmute_global',
  UNMUTED = 'unmuted',
  UPDATED_URL = 'updated_url',
  VOLUME_CHANGED = 'volume_changed',
}
```

### SoundGroup

```typescript
export interface SoundGroup {
  id: string; // internal usage (groupName)
  sounds: Set<string>; // Stores sound IDs belonging to this group
  maxInstances?: number; // Maximum number of concurrent instances allowed in the group
  playOptions?: PlayOptions; // Add playOptions to the group
}
```

### SoundManagerConfig

Configuration options:

```typescript
export interface SoundManagerConfig {
  autoUnlock?: boolean; // Unlock audio for mobile browser that have restrictions
  autoMuteOnHidden?: boolean; // Automatically mute when page or tab of your browser is not active
  autoResumeOnFocus?: boolean; // Automatically resume when page or tab of your browser gets focus
  createNewInstance?: boolean; // Create a new instance of the sound when playing it. 
  // By default this is false. This is useful when you want to play the same sound multiple times simultaneously. 

  // ------- Loading Configuration: -------------------------------------------------------------
  // Loading Behaviour
  webAudioPreferred?: boolean; // Whether to prefer Web Audio API (default: true)
  html5AudioFallback?: boolean; // Whether to use HTML5 Audio as fallback (default: true)
  maxParallelLoads?: number; // Maximum parallel sound loads (default: 6)
  retryDelay?: number; // Delay between retry attempts in seconds (default: 0.5 seconds)

  // Network Handling
  fetchRetries?: number; // Number of retries for failed fetches (default: 2)
  fetchTimeout?: number; // Timeout for fetch requests in seconds
  corsProxy?: string; // URL of CORS proxy service, the ones I tested that work great are: 
  // corsProxy: "https://cors-anywhere.herokuapp.com/", or corsProxy: "https://corsproxy.io/?",  or your own proxy
  fetchStrategy?: 'direct-first' | 'proxy-first' | 'direct-only';

  // Security & Limits
  maxAudioSize?: number; // in bytes, currently the max is set to 50MB  (50 * 1024 * 1024)
  audioCache?: boolean; // Cache the audio file when loading.
  crossOrigin?: "anonymous" | "use-credentials" | null;
  credentialStrategy?: 'auto' | 'omit' | 'include';
  
  // -----End Loading Configuration-------------------------------------------------------------

  debug?: boolean; // Enable debug logging
  defaultDuration?: number; // Default duration for new sounds, default is undefined (full length of the sound)
  defaultPan?: number; // The default pan value = 0, in the center. Posiible values are (-1 to 1)
  defaultPanSpatialPosition?: { x: number; y: number; z: number };
  defaultPanType?: SoundPanType; // Default pan type
  defaultPlaybackRate?: number // The default playbackRate is 1
  defaultStartTime?: number; // Default start time for new sounds
  defaultVolume?: number; // Default volume for new sounds (0-1)
  fadeInDuration?: number; // Default fade-in duration in seconds
  fadeOutDuration?: number; // Default fade-out duration in seconds
  loopSounds?: boolean // Loop all sounds by default
  maxLoops?: number // if loopSounds is true and maxLoops is set, the sound will loop maxLoops times  (-1 is for infinite)
  pannerNodeConfig?: SoundPannerConfig; // Panner settings for 3D sound
  spatialAudio?: boolean; // Enable spatial audio features
  trackProgress?: boolean; // Track progress of the sound playback. 
  // This will keep track of the process and will dispatch the 'progress' event. This is useful when you want to show the progress of the sound playback.
}

```

### Sound State Information

Information about a sound's current state:

```typescript
export interface SoundStateInfo {
  progress: number; // ratio from 0 to 1
  startTime: number; // in seconds
  currentTime: number; // in seconds
  elapsedTime: number; // in seconds
  adjustedElapsedTime: number; // Elapsed time adjusted for playback rate
  duration: number; // in seconds
  rawDuration: number | null; // in seconds
  playbackRate: number | null;
  state: SoundState;
  volume: number; // value from 0 to 1
  pan: number; // value form 0 to 1
  panSpatialPosition: { x: number; y: number; z: number };
}
```

### SoundState

Possible states of a sound:

```typescript
export enum SoundState {
  Playing = "playing",
  Paused = "paused",
  Stopped = "stopped",
}
```

#### The Sound Object

```typescript
export interface Sound {
  buffer: AudioBuffer;
  source: AudioBufferSourceNode | null;
  positionTracker?: ConstantSourceNode;
  currentLoopCount?: number;
  gainNode: GainNode;
  groupId?: string;
  id: string;
  isFadingIn?: boolean;
  isFadingOut?: boolean;
  originalVolume?: number;
  pannerNode?: PannerNode | null; // for 3D panning
  pan?: number; // Normal panning value -1 to 1
  panSpatialPosition? : { x: number; y: number; z: number };
  panType?: SoundPanType; 
  pausedAt?: number;
  playOptions?: PlayOptions;
  previousVolume?: number;
  sprite?: { [key: string]: [number, number] }; // Sprite support
  startTime?: number; // in seconds
  state?: SoundState;
  stereoPanner?: StereoPannerNode | null; // just plain left to right panning
  volume?: number; // values from 0 to 1
  duration?: number; // in seconds
  currentTime?:number; // in seconds
  instanceId?:string;
  instanceCount?:number;
  baseId?: string; // Base sound ID (e.g., "game-sound_jump")
}
```

#### SoundProgressStateInfo

Sound progress information, is connected to the sound event ->progressInfo

```typescript
export interface SoundProgressStateInfo {
  soundId: string;
  currentTime: number;
  duration: number;
  rawDuration: number;
  progress: number; // 0-1
}
```

### SoundPanType

```typescript
export enum SoundPanType {
    Stereo = 'stereo',
    Spatial = 'spatial'
}
```

### Spatial Audio

```typescript
export enum PanningModel {
  HRTF = "HRTF",
  EqualPower = "equalpower",
}

export enum DistanceModel {
  Linear = "linear",
  Inverse = "inverse",
  Exponential = "exponential",
}

export interface SoundPannerConfig {
  /**
   * Determines which spatialisation algorithm to use to position the audio in 3D space.
   * - 'HRTF': More accurate, head-related transfer function (default)
   * - 'equalpower': Basic equal-power panning
   */
  panningModel?: PanningModel;

  /**
   * Determines how the volume of the audio source decreases as it moves away from the listener.
   * - 'linear': Volume reduces linearly with distance
   * - 'inverse': Volume reduces inversely with distance (realistic, default)
   * - 'exponential': Volume reduces exponentially with distance
   */
  distanceModel?: DistanceModel;

  /**
   * The reference distance for reducing volume as the audio source moves further from the listener.
   * Default is 1 meter.
   * @min 0
   */
  refDistance?: number;

  /**
   * The maximum distance between the audio source and the listener, after which the volume will not be reduced any further.
   * Default is 10000 meters.
   * @min refDistance
   */
  maxDistance?: number;

  /**
   * Describes how quickly the volume reduces as the source moves away from the listener.
   * - For 'linear': Valid range [0, 1], default 1
   * - For 'inverse': Valid range [0, ∞], default 1
   * - For 'exponential': Valid range [0, ∞], default 1
   */
  rolloffFactor?: number;

  /**
   * The angle, in degrees, of a cone inside which there will be no volume reduction.
   * Default is 360 (no cone).
   * @range [0, 360]
   */
  coneInnerAngle?: number;

  /**
   * The angle, in degrees, of a cone outside which the volume will be reduced by a constant value.
   * Default is 360 (no cone).
   * @range [0, 360]
   */
  coneOuterAngle?: number;

  /**
   * The amount of volume reduction outside the outer cone.
   * Default is 0.
   * @range [0, 1]
   */
  coneOuterGain?: number;
}
```

### Reset options
```typescript
export interface SoundResetOptions {
  keepVolumes?: boolean; // Keep current volume settings
  keepPanning?: boolean; // Keep current panning settings
  keepSpatial?: boolean; // Keep spatial audio settings
  keepPlaybackRate?: boolean // Keep playback rate
  unloadSounds?: boolean; // Unload all sounds
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

### 5.5.9

- 📝 Updated README heading to include the package name and added a donate button.

### 5.5.8

- 🐛 Bug Fix: `STARTED` and `ENDED` events now include `originalId` and `instanceId` fields, consistent with `PROGRESS`. Previously, `STARTED` also used the raw `id` parameter for `soundId` instead of the actual instance ID (e.g. `piano-C4:3`), making it impossible to correlate events across instances when using `createNewInstance: true`.
- 🐛 Bug Fix: `fadeIn` now respects an explicit `endVolume` of `0`. Previously, any end-volume of `0` was silently overridden to `1`, making it impossible to fade in to silence.
- 🐛 Bug Fix: Progress-tracking duration check now correctly handles non-default `playbackRate`. The formula was `duration * playbackRate`, which caused the end-of-segment trigger to fire far too late (or never) at speeds other than 1×. Corrected to `(duration + startTime) / playbackRate`.
- 🐛 Bug Fix: Default `rolloffFactor` for spatial audio changed from `0.2` to `1` (the Web Audio API spec default for the `inverse` distance model). The previous value caused sounds to remain almost equally loud regardless of distance. **⚠️ Breaking change for spatial audio users** sounds will attenuate more realistically with distance. Override via `pannerNodeConfig: { rolloffFactor: 0.2 }` to restore the old behaviour.
- 🔧 Internal: Removed a redundant `reconnectAudioNodes` call inside `play()`. The audio graph was already wired by `setupAudioSource`, so the second connect/disconnect cycle was unnecessary.
- ⚡ Performance: `setSpatialPosition` no longer allocates a temporary configuration object on every call. The `mergedConfig` object (merged from `DEFAULT_PANNER_CONFIG`, the manager config, and the per-call config) is now created only once, when the `PannerNode` is first set up. This eliminates three object spreads and GC pressure when updating spatial position at high frequency (e.g. 60 fps in an animation loop).
- ⚡ Performance: `isSpatialAudioSupported()` now caches its result after the first call. Previously it created and immediately closed a temporary `AudioContext` on every invocation causing severe animation jitter when `setSpatialPosition` was called at 60 fps (e.g. in an auto-rotate loop). The check now runs once and the result is stored in `_spatialAudioSupported`.
- ⚡ Performance: `setSpatialPosition` no longer spreads the entire `playOptions` object on every call. The `panSpatialPosition` property is now updated in place, eliminating per-frame object allocation and GC pressure.

### 5.5.7

- ✨ Added `getMasterOutput()` method that returns the master output `AudioNode` for external connections such as an `AnalyserNode`.
- 🎨 Added wave visualizer component to the demo page, visualizing real-time audio output using the Web Audio API `AnalyserNode`.

### 5.5.1 ~ 5.5.6
- 🚀 Added state (SoundStateInfo) to the SoundEventsEnum.PROGRESS ('progress') event. 
- Fix broken anchor links in README.md file
-  Added Codepen.io demo links. One version using the JS version and one using the typescript version.
- 🐛 Bug Fix in fadeIn method
-  Added information in the console.log with a logo
-  Added animation logo to the demo page.

### 5.5.0 - Enhanced Audio Loading & Mobile Support

🚀 New Features
- Dual Loading System

- Web Audio API (primary) with HTML5 Audio fallback (html5AudioFallback)

- Configurable preference via webAudioPreferred (default: true)

- Advanced Loading Controls

- maxParallelLoads: Throttle concurrent loads (default: 10)

- maxAudioSize: Safety limit (default: 50MB)

- audioCache: Control browser caching behavior

- CORS Management

  - corsProxy support with smart URL handling

  - Configurable strategies:
 
  ```typescript
    fetchStrategy: 'direct-first' | 'proxy-first' | 'direct-only'
    credentialStrategy: 'auto' | 'omit' | 'include'
  ```

- Automatic retries (fetchRetries)

- Configurable timeouts (fetchTimeout)

- Delay between retries (retryDelay)

- 📊 New Event: SoundEvent.LOAD
  In the event, you have this information of the loaded sound:
  ```typescript
  {
    bufferSize,
    channels,
    duration,
    fileSize,
    sampleRate,
    sound, // The Sound object
    soundId,
    timestamp,
    type, // The Event type, in this case 'loaded' or SoundEvent.LOAD
  }
  ```
  
- 📱 Mobile Improvements
  - Auto-Unlock System
  - Touch/click event listeners for iOS/Android
  - Silent buffer initialization
  - Configurable via autoUnlock: boolean (default: true)

⚙️ Configuration Updates
  ```typescript
  interface SoundManagerConfig {
    // Loading Behavior
    webAudioPreferred?: boolean;       // Default: true
    html5AudioFallback?: boolean;      // Default: true
    maxParallelLoads?: number;         // Default: 10
    retryDelay?: number;               // Seconds, default: 0.5
    
    // Network Handling
    fetchRetries?: number;             // Default: 2
    fetchTimeout?: number;             // Seconds, default: 10
    corsProxy?: string;                // e.g. "https://corsproxy.io/?"
    fetchStrategy?: 'direct-first' | 'proxy-first' | 'direct-only';
    
    // Security & Limits
    maxAudioSize?: number;             // Bytes, default: 50MB
    audioCache?: boolean;              // Default: false
    crossOrigin?: "anonymous" | "use-credentials" | null;
    
    // Mobile
    autoUnlock?: boolean;              // Default: true
  }
```

### 5.1.0 ~ 5.4.0 
- 🐛 Bug Fixes
  * Fix dependencies in package.json so it is used pure as library and not as an app.
  * Fixed an issue with fadeInDuration and fadeOutDuration when used in combination with defaultVolume in the configuration. This ensures consistent fade behavior across all sounds.
  * Fixed error: Failed to execute 'stop' on 'AudioScheduledSourceNode': cannot call stop without calling start first.

- 🔊 New Feature: fadeOutBeforeEndDuration with optionally setting fadeOutEndVolume.
Added the fadeOutBeforeEndDuration option to PlayOptions. This feature automatically fades out a sound as it nears the end of playback.
Example: If a sound has a duration of 10 seconds and you set fadeOutBeforeEndDuration to 3, the sound will begin fading out at 7 seconds and complete the fade by 10 seconds.
This is particularly useful for creating smoother transitions and avoiding abrupt endings.  

### 5.0.0 (Major & critical udpate )
 - Fixed a lot of bugs, because I did not test most scenario's.
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
  // Playback Control
  setLoop(id: string, loop: boolean): void
  getLoop(id: string): boolean

  //Sound Loading and Management
  loadSound(id: string, url: string): Promise<void>
  loadSounds (renamed from preloadSounds)
  unloadSound(id: string): void
  removeSound(id: string): void

  //Group Management (entirely new)
  createSoundGroup(groupName: string, options: SoundGroup): void
  addToSoundGroup(groupName: string, soundId: string): void
  removeFromSoundGroup(groupName: string, soundId: string): void
  getGroup(groupName: string): SoundGroup | undefined
  removeSoundGroup(groupName: string): void

  //Sprite Logic (expanded)
  getSpriteConfig(id: string): { [key: string]: [number, number] } | undefined
  removeSpriteSound(id: string): void
  removeSpriteConfig(id: string): void

  //Context Management (new)
  suspendContext(): Promise<void>
  resumeContext(): Promise<void>
  getContext(): AudioContext

  //Progress Tracking (expanded)
  getDuration(id: string): number
  startProgressTracking(id: string): void
  stopProgressTracking(id: string): void
  setProgressUpdateInterval(interval: number): void

  //Spatial Audio (expanded)
  isSpatialAudioSupported(): boolean
  getSpatialPosition(soundId: string): { x: number; y: number; z: number } | null
  getMasterSpatialPosition(): { x: number; y: number; z: number } | null
  resetMasterSpatialPosition(): void
 
  // renamed from setSoundPosition
  setSpatialPosition(x: number, y: number, z: number, soundId?: string | null, soundPannerConfig?: SoundPannerConfig, skipDispatchEvent?: boolean): void;

  //Reset Operations (expanded)
  resetSound(id: string, options?: SoundResetOptions): void
  resetPan(id?: string): void

  //Sound/Buffer/Source/GainNode Retrieval (new)
  getBuffer(id: string): AudioBuffer | undefined
  getSource(id: string): AudioBufferSourceNode | undefined
  getGainNode(id: string): GainNode | undefined
  
  //Utilities (expanded)
  isReady(): boolean
  getSoundCount(): number
  getLastError(): Error | null
  roundValue(value: number, decimals: number): number
 
  //Event Handling (expanded)
  removeEventListenersForInstance(instanceId: string): void
  dispatchEvent(event: SoundEvent): void
  hasEventListener(type: SoundEventsEnum): boolean

```

- Added more PlayOptions
  * fadeIn -> renamded to fadeInDuration
  * fadeOut -> renamed to fadeOutDuration
  * panSpatialPosition?: { x: number; y: number; z: number }
  * PanType?: SoundPanType (stereo or spatial)
  * trackProgress?: boolean (wheter to track playback progress)
  * createNewInstance (if false, it will use the previously instance of the sound)
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
  * fix issues with the PlayOptions 
  * fix issues with spatial audio
  * fix reset method
  * fix playBackRate issues
  * fadeIn / fadeOut
  * fix issues with new instances
  * fix issues with Sprites
  * fixed typescript support .d.ts files


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
- None at the moment. I just finished the demo pages and am currently working on the API documentation pages.