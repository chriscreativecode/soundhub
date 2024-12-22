# Sound Manager TypeScript

A minimalist yet powerful sound management solution that puts you in control of audio playback. Perfect for web apps, games, and interactive experiences. Handle multiple audio streams, control playback, and manage sound effects with just a few lines of code.

## Features
- Ultra-lightweight (11KB) with zero dependencies (This is without the demo files)
- Simple API for audio loading and playback control
- Audio context management with automatic initialization
- Sound preloading and caching
- Individual sound control (play, pause, resume, stop)
- Volume control for individual sounds and master volume
- Mute/unmute functionality
- Multiple simultaneous sound playback
- TypeScript support with full type definitions
- Perfect for games and interactive web applications

## Installation

```bash
npm install sound-manager-typescript
```

## Usage

```typescript
import { SoundManager } from './sound-manager';

// Initialize the sound manager
const soundManager = new SoundManager();

// Define sounds to preload
const soundsToLoad = [
    { id: 'background-music', url: '/assets/sounds/background.mp3' },
    { id: 'click-effect', url: '/assets/sounds/click.wav' }
];

// Preload sounds
await soundManager.preloadSounds(soundsToLoad);

// Play a sound
soundManager.play('background-music');

// Control volume (0.0 to 1.0)
soundManager.setVolume('background-music', 0.5);

// Pause/Resume
soundManager.pause('background-music');
soundManager.resume('background-music');

// Global controls
soundManager.setGlobalVolume(0.8);
soundManager.mute();
soundManager.unmute();


// Play multiple sounds simultaneously
soundManager.play('background-music');
soundManager.play('click-effect');

// Stop all sounds
soundManager.stopAll();

// Check if a sound is playing
const isPlaying = soundManager.isPlaying('background-music');

// Check if a sound is paused
const isPaused = soundManager.isPaused('background-music');

```

## Demo included
The demo provides a UI with:

- Sound loading controls
- Individual sound controls (play, pause, stop)
- Volume sliders for each sound
- Global volume control
- Mute toggle
- Status display


## Browser Support
Compatible with modern browsers supporting the Web Audio API. Includes fallbacks for webkit prefixed implementations and handles browser autoplay policies

## Licence
This project is developed by Chris Schardijn. It is free to use in your project.

## Version History

### 1.1.0 (Current)
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
- Performance optimizations
- Convert the Sound Manager to a singleton.
