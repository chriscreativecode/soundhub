export interface SoundResetOptions {
  keepVolumes?: boolean; // Keep current volume settings
  keepPanning?: boolean; // Keep current panning settings
  keepSpatial?: boolean; // Keep spatial audio settings
  keepPlaybackRate?: boolean // Keep playback rate
  unloadSounds?: boolean; // Unload all sounds
}
