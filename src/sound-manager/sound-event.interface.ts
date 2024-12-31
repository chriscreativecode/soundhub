import { SoundEventsEnum } from "./sound-events.enum";
import { SoundResetOptions } from "./sound-reset-options.interface";

export interface SoundEvent {
    currentTime?: number;
    error?: Error;
    soundId?: string;
    timestamp?: number;
    type: SoundEventsEnum;
    volume?: number;
    isMuted?: boolean;
    pan?: number;
    previousPan?: number;
    resetOptions?: SoundResetOptions;
  }