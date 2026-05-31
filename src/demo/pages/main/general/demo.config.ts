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
  pannerNodeConfig: {
    ...DEFAULT_PANNER_CONFIG,
    refDistance: 0.5,
    maxDistance: 10,
    rolloffFactor: 2,
  },
  spatialAudio: true,
  trackProgress: true,
};
