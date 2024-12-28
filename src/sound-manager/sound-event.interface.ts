import { SoundEventsEnum } from "./sound-events.enum";

export interface SoundEvent {
    type: SoundEventsEnum;
    soundId: string;
    timestamp?: number;
    volume?: number;
    currentTime?: number;
    error?: Error;
  }