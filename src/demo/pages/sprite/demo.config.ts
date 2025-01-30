import { SoundManagerConfig } from "../../../sound-manager/sound-manager-config";
import { DEFAULT_PANNER_CONFIG } from '../../../sound-manager/sound-panner-config';

export const DEMO_CONFIG_SPRTES: SoundManagerConfig = {
  autoMuteOnHidden: true, // When the page is hidden, all sounds are muted
  autoResumeOnFocus: true, // when the page is focused again, all sounds are resumed
  crossOrigin: null, // CORS setting for audio files
  debug: true,  //  Enable debug logging
  defaultPan: 0, //  Default pan for new sounds (0-1)
  defaultVolume: 1, // Default volume for new sounds (0-1)
  fadeInDuration: 1000, // Default fade-in duration in milliseconds
  fadeOutDuration: 1000, // Default fade-out duration in milliseconds
  spatialAudio: true, //  Enable spatial audio features
  loopSounds: true, // Loop all sounds by default
  pannerNodeConfig: DEFAULT_PANNER_CONFIG, // Default panner settings
};