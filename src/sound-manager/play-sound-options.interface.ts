export interface PlaySoundOptions {
  volume?: number;
  fadeIn?: number;
  fadeOut?: number;
  loop?: boolean;
  loopCount?: number;
  pan?: number; // -1 (left) to 1 (right)
  startTime?: number; 
}
