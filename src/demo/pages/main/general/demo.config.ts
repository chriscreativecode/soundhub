import { SoundManagerConfig } from "../../../../sound-manager/sound-manager-config";
import { SoundPanType } from "../../../../sound-manager/sound-pan-type.enum";
import { DEFAULT_PANNER_CONFIG } from '../../../../sound-manager/sound-panner-config';

export const DEMO_CONFIG: SoundManagerConfig = {
  autoMuteOnHidden: true,
  autoResumeOnFocus: true,
  createNewInstance: false,
  debug: false,
  defaultDuration: undefined,
  defaultPan: 0,
  defaultPanSpatialPosition: { x: 0, y: 0, z: 0 },
  defaultPanType: SoundPanType.Stereo,
  defaultPlaybackRate: 1,
  defaultStartTime: 0,
  defaultVolume: 1,
  fadeInDuration: 1,
  fadeOutDuration: 1,
  loopSounds: true,
  maxLoops: -1,
  // The spatial grid maps the pointer to a cube from -1 to +1, so the furthest
  // the source can get from the listener is about 1.73. refDistance 0.5 with
  // rolloffFactor 2 burned through roughly 15 dB over that tiny range, which is
  // why dragging the marker made the sound drop off a cliff. Keeping the library
  // defaults (refDistance 1, rolloffFactor 1) gives about 5 dB across the same
  // space: audible movement without losing the sound.
  pannerNodeConfig: {
    ...DEFAULT_PANNER_CONFIG,
    refDistance: 1,
    maxDistance: 10,
    rolloffFactor: 1,
  },
  spatialAudio: true,
  trackProgress: true,
};
