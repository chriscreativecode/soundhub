export interface SoundManagerConfig {
  autoMuteOnHidden?: boolean; // Automatically mute when page or tab of your browser is not active
  autoResumeOnFocus?: boolean; // Automatically resume when page or tab of your browser gets focus
  crossOrigin?: "anonymous" | "use-credentials" | null; // CORS setting for audio files
  debug?: boolean; // Enable debug logging
  defaultVolume?: number; // Default volume for new sounds (0-1)
  fadeInDuration?: number; // Default fade-in duration in milliseconds
  fadeOutDuration?: number; // Default fade-out duration in milliseconds
  spatialAudio?: boolean; // Enable spatial audio features
}

export const DEFAULT_CONFIG: SoundManagerConfig = {
  autoMuteOnHidden: true,
  autoResumeOnFocus: true,
  crossOrigin: null,
  debug: false,
  defaultVolume: 1,
  fadeInDuration: 500,
  fadeOutDuration: 500,
  spatialAudio: false,
};
