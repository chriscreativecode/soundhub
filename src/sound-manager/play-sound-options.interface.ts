export interface PlaySoundOptions {
  fadeIn?: number;
  fadeOut?: number;
  pan?: number; // -1 (left) to 1 (right)
  startTime?: number; 
  volume?: number;
  loop?: boolean;
  maxLoops?: number; // -1 for infinte, number > 0 for specific number of loops
}
