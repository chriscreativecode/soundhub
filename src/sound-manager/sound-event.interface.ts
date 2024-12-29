import { SoundEventsEnum } from "./sound-events.enum";

export interface SoundEvent {
    currentTime?: number;
    error?: Error;
    soundId: string;
    timestamp?: number;
    type: SoundEventsEnum;
    volume?: number;
  }