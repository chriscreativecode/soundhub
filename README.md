# Sound Manager TypeScript

A minimalist yet powerful sound management solution that puts you in control of audio playback. Perfect for web apps, games, and interactive experiences. Handle multiple audio streams, control playback, and manage sound effects with just a few lines of code.

## Live demo
[Click here to visit the demo page](https://chriscreativecode.com/sound-manager-ts/demo/ 'A demo showcase of my Sound Manager')

## About me
### Chris Schardijn (Front-end Developer)

My journey in web development spans back to the Flash era, where among various projects, I developed a sound manager using ActionScript 3.0. As technology evolved, so did I, embracing new challenges and opportunities to grow. This Sound Manager TypeScript project represents not just a modern reimagining of a concept I once built in Flash, but also my passion for continuous learning and adaptation in the ever-changing landscape of web development.

I built this library in my spare time. What started as a personal study project has grown into a robust solution that I'm excited to share with the developer community.

Feel free to use this library in your projects, and I hope it inspires you to pursue your own passion projects, regardless of how technology changes. Sometimes the best learning comes from rebuilding something you once loved in a completely new way.

## Table of Contents
- [Live Demo](#live-demo)
- [About Me](#about-me)
- [Features](#features)
- [Installation / Implement in Your Project](#installation--implement-in-your-project)
  - [Using the Sound Manager as TypeScript Module](#1-using-the-sound-manager-as-typescript-module)
  - [Using Sound Manager as a Library File](#2-using-sound-manager-as-a-library-file)
- [Usage](#usage)
- [Interfaces](#interfaces)
  - [SoundEvent](#soundevent)
  - [SoundEventsEnum](#soundeventsenum)
  - [SoundManagerConfig](#soundmanagerconfig)
  - [Sound State Information](#sound-state-information)
  - [SoundState](#soundstate)
- [Demo Included](#demo-included)
- [Running the Demo](#running-the-demo)
- [Browser Support](#browser-support)
- [Licence](#licence)
- [Version History](#version-history)
- [Upcoming Features](#upcoming-features)

## Features
- Ultralightweight (20.04 kB │ gzip: 5.29 kB) with zero dependencies (This is without the demo files)
- Simple API for audio loading and playback control
- Audio context management with automatic initialization
- Sound preloading and caching
- Individual sound control (play, pause, resume, stop)
- Volume control for individual sounds and master volume
- Stereo panning control (individual and master)
- Spatial audio support (place every sound in it's own 3d space)
- Fade effects (fade in/out for individual sounds and master)
- Mute/unmute functionality
- Multiple simultaneous sound playback
- TypeScript support with full type definitions
- Perfect for games and interactive web applications

## Installation / imlement in your project

## Implement in your project

### 1. Using the Sound Manager as TypeScript Module
For TypeScript projects, it is recommended to install the package and import it directly. This method provides better type safety and allows you to take full advantage of TypeScript features.

#### Install the package

```bash
npm install sound-manager-ts
```

In your TypeScript file, you can import and use the Sound Manager like this:

```typescript

import { SoundManager, SoundManagerConfig, SoundEventsEnum } from 'sound-manager-ts';

// Optional configuration
const config: SoundManagerConfig = {
    autoMuteOnHidden: true,      // Mute when tab is hidden
    autoResumeOnFocus: true,     // Resume on tab focus
    defaultVolume: 0.8,          // Default volume (0-1)
};

// Initialize sound manager with config
const soundManager = new SoundManager(config);

// Define sounds to preload
const soundsToLoad = [
    { id: 'background-music', url: '/assets/sounds/background.mp3' },
    { id: 'click-effect', url: '/assets/sounds/click.wav' }
];

// Preload sounds
soundManager.preloadSounds(soundsToLoad).then(() => {
    console.log('All sounds loaded successfully');
}).catch(error => {
    console.error('Error loading sounds:', error);
});

// Play a sound
soundManager.playSound('background-music', {
    volume: 0.7,
    fadeIn: 2000
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
    <script src="./lib/sound-manager-ts.umd.js?v=2.0.0"></script>
    <script>
        // Initialize the Sound Manager
        const soundManager = new SoundManager({
            autoMuteOnHidden: true,      // Mute when tab is hidden
            autoResumeOnFocus: true,     // Resume on tab focus
            defaultVolume: 0.8,          // Default volume (0-1)
            spatialAudio: false          // Enable spatial audio
        });

        // Define sounds to preload
        const soundsToLoad = [
            { id: 'background-music', url: '/assets/sounds/background.mp3' },
            { id: 'click-effect', url: '/assets/sounds/click.wav' }
        ];

        // Preload sounds
        soundManager.preloadSounds(soundsToLoad).then(() => {
            console.log('All sounds loaded successfully');
        }).catch(error => {
            console.error('Error loading sounds:', error);
        });

        // Play a sound
        soundManager.playSound('background-music', {
            volume: 0.7,
            fadeIn: 2000
        });

        // Control individual sounds
        soundManager.stopSound('background-music');
    </script>
</body>
</html>

```

## Usage

```typescript
import { SoundManager, SoundManagerConfig, SoundEventsEnum } from 'sound-manager-ts';

// Optional configuration
const config: SoundManagerConfig = {
  autoMuteOnHidden: true,      // Mute when tab is hidden
  autoResumeOnFocus: true,     // Resume on tab focus
  debug: true,                 // Enable debug logging
  defaultVolume: 0.8,          // Default volume (0-1)
  defaultPan: 0,               // Default stereo pan (-1 to 1)
  fadeInDuration: 1000,        // Default fade-in duration (ms)
  fadeOutDuration: 1000,       // Default fade-out duration (ms)
  spatialAudio: false,         // Enable spatial audio
  crossOrigin: "anonymous"     // CORS setting
};

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
soundManager.playSound('background-music', {
    volume: 0.7,
    fadeIn: 2000,
    fadeOut: 1000,
    pan: -0.5,
    startTime: 0
});

// Control individual sounds
soundManager.pauseSound('background-music');
soundManager.resumeSound('background-music');
soundManager.stopSound('background-music');
soundManager.seekTo('background-music', 30); // Seek to 30 seconds

// Volume control
soundManager.setVolumeById('background-music', 0.5);
soundManager.setGlobalVolume(0.8);

// Pan control
soundManager.setPan('background-music', -0.5); // Pan left
soundManager.setMasterPan(0.3); // Slight right pan for all sounds

// Fade effects
soundManager.fadeIn('background-music', 2000); // Fade in over 2 seconds
soundManager.fadeOut('background-music', 1000); // Fade out over 1 second
soundManager.fadeMasterIn(1500); // Fade in all sounds
soundManager.fadeMasterOut(1500); // Fade out all sounds

// Mute controls
soundManager.muteAllSounds();
soundManager.unmuteAllSounds();
soundManager.muteSoundById('background-music');
soundManager.toggleMute();

// Spatial audio (if enabled in config)
soundManager.setSoundPosition('background-music', 1, 0, -1);
soundManager.resetSoundPosition('background-music');

// State checks
const isPlaying = soundManager.isPlaying('background-music');
const isPaused = soundManager.isPaused('background-music');
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
Options for playing a sound:

```typescript
interface PlaySoundOptions {
    fadeIn?: number;      // Fade-in duration in milliseconds
    fadeOut?: number;     // Fade-out duration in milliseconds
    pan?: number;         // Stereo pan value (-1 left to 1 right)
    startTime?: number;   // Start time in seconds
    volume?: number;      // Initial volume (0-1)
}
```

## SoundEvent
Event object dispatched by the sound manager:

```typescript
interface SoundEvent {
    currentTime?: number;  // Current playback time
    error?: Error;         // Error details if applicable
    soundId?: string;      // ID of the sound
    timestamp?: number;    // When the event occurred
    type: SoundEventsEnum; // Event type
    volume?: number;       // Current volume
    isMuted?: boolean;     // Mute state
    pan?: number;          // Current pan value
    position?: number;     // Current sound position for the spatial audio (3d Audio)
    previousPan?: number;  // Previous pan value
}
```

## SoundEventsEnum
Available event types:

```typescript
enum SoundEventsEnum {
    ENDED,
    ERROR,
    FADE_IN_COMPLETED,
    FADE_OUT_COMPLETED,
    FADE_MASTER_IN_COMPLETED,
    FADE_MASTER_OUT_COMPLETED,
    MASTER_VOLUME_CHANGED,
    MUTED,
    MUTE_GLOBAL,
    UNMUTE_GLOBAL,
    MASTER_PAN_CHANGED,
    PAN_CHANGED,
    PAUSED,
    RESUMED,
    SEEKED,
    SPATIAL_POSITION_CHANGED,
    STARTED,
    STOPPED,
    UNMUTED,
    VOLUME_CHANGED
}
```

## SoundManagerConfig
Configuration options:

```typescript
interface SoundManagerConfig {
    autoMuteOnHidden?: boolean;    // Mute when tab hidden
    autoResumeOnFocus?: boolean;   // Resume on tab focus
    crossOrigin?: string;          // CORS setting
    debug?: boolean;               // Enable debug logs
    defaultPan?: number;           // Default pan value
    defaultVolume?: number;        // Default volume
    fadeInDuration?: number;       // Default fade-in time
    fadeOutDuration?: number;      // Default fade-out time
    spatialAudio?: boolean;        // Enable spatial audio
}
```

## Sound State Information
Information about a sound's current state:

```typescript
interface SoundStateInfo {
    currentTime: number;      // Current playback position in seconds
    duration: number | null;  // Total duration of the sound
    state: SoundState;       // Current state (playing/paused/stopped)
    volume: number;          // Current volume level
}
```

## SoundState
Possible states of a sound:

```typescript
enum SoundState {
    Playing = "playing",
    Paused = "paused",
    Stopped = "stopped"
}
```

## Demo included
The package includes a comprehensive demo showcasing all features:

* Demo Features
* Sound loading and preloading
  * Individual sound controls
  * Play/Pause/Stop buttons
  * Volume slider
  * Pan control
  * Fade in/out controls
  * Seek bar with time display
* Global controls
  * Master volume
  * Master pan
  * Mute toggle
  * Stop all sounds
* Real-time status display
* Event logging
* Spatial audio controls (when enabled)


## Running the Demo
1. Clone the repository
2. Install dependencies: npm install
3. Start the demo: npm run dev
4. Open http://localhost:5173 in your browser

## Browser Support
* Chrome 74+
* Firefox 75+
* Safari 12+
* Edge 79+
* Opera 62+

Features are automatically adapted based on browser support:

* Falls back gracefully when spatial audio is not supported
* Handles browser autoplay policies
* Manages WebAudio context state
* Provides webkit prefix support for Safari


## Licence
This project is developed by Chris Schardijn. It is free to use in your project.

## Version History

### 2.1.0 (current)
- added PAN_CHANGED event
- fixed a recursive event loop when resetting the pan and resetting the spatial audio
- fliped the z logic for spatial audio, so when moving up it is now going to the front
- added a front indicator line
- updated README.MD 

### 2.0.0 
- Rebuild some current logic
- Added master pan control
- Enhanced spatial audio support
- Improved event system
- Fixed many issues while testing
- Rebuild the demo page for a better experience to see everything in action.
- Added TypeScript declaration maps
- Updated documentation

### 1.3.0 
- Fixed typscript types .d.ts error 
- Improved error handling
- Added more event types

### 1.2.0 
**Patch Update - npm run build**
- npm run build was failing. I needed to add "typescript": "^5.7.2", to the package.json

### 1.1.0 
**Major Update - Audio Control Improvements**
- Fixed critical pause and resume functionality
- Enhanced demo UI with better controls and status display
- Resolved AudioContext initialization issues
  - Fixed: "AudioContext was not allowed to start" error
  - Added user gesture handling for proper audio context initialization
- Improved error handling and state management
- Added comprehensive debug logging

### 1.0.4
- Initial public release
- Basic audio playback functionality

## Upcoming Features
- Add Spatial (3d) recording. So you can playback the sound positions over time. 