import { SoundManagerConfig } from "../../../sound-manager/sound-manager-config";
import { DEFAULT_PANNER_CONFIG } from '../../../sound-manager/sound-panner-config';

export const DEMO_CONFIG: SoundManagerConfig = {
  autoMuteOnHidden: true, // Automatically mute when page or tab of your browser is not active
  autoResumeOnFocus: true, // Automatically resume when page or tab of your browser gets focus
  createNewInstance: false, // Create a new instance of the sound when playing it. By default this is false. This is useful when you want to play the same sound multiple times simultaneously. 
  crossOrigin: null, // CORS setting for audio files
  debug: false, // Enable debug logging
  defaultDuration: undefined, // Default duration for new sounds, default is undefined (full length of the sound)
  defaultPan: 0, // The default pan value = 0, in the center. Posiible values are (-1 to 1)
  defaultPanSpatialPosition: { x: 0, y: 0, z: 0 },
  defaultPlaybackRate: 1, // The default playbackRate is 1
  defaultStartTime: 0, // Default start time for new sounds
  defaultVolume: 1, // Default volume for new sounds (0-1)
  fadeInDuration: 0.5, // Default fade-in duration in seconds
  fadeOutDuration: 0.5, // Default fade-out duration in seconds
  loopSounds: true, // Loop all sounds by default
  maxLoops: -1, // if loopSounds is true and maxLoops is set, the sound will loop maxLoops times  (-1 is for infinite)
  pannerNodeConfig: DEFAULT_PANNER_CONFIG, // Panner settings for 3D sound
  spatialAudio: true, // Enable spatial audio features
  trackProgress: false, // Track progress of the sound playback. This will keep track of the process and will dispatch the 'progress' event. This is useful when you want to show the progress of the sound playback.
};