export interface SoundManagerConfig {
  debug?: boolean; // Enable debug logging
  defaultVolume?: number; // Default volume for new sounds (0-1)
  fadeInDuration?: number; // Default fade-in duration in milliseconds
  fadeOutDuration?: number; // Default fade-out duration in milliseconds
  autoMuteOnHidden?: boolean; // Automatically mute when page is hidden
  autoResumeOnFocus?: boolean; // Automatically resume when page gets focus
  spatialAudio?: boolean; // Enable spatial audio features
  crossOrigin?: "anonymous" | "use-credentials" | null; // CORS setting for audio files
}

export const DEFAULT_CONFIG: SoundManagerConfig = {
  debug: false,
  defaultVolume: 1,
  fadeInDuration: 500,
  fadeOutDuration: 500,
  autoMuteOnHidden: true,
  autoResumeOnFocus: true,
  spatialAudio: false,
  crossOrigin: null,
};
