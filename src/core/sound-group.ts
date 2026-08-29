import { PlayOptions } from "./play-sound-options.interface";

export interface SoundGroup {
    id: string; // internal usage (groupName)
    sounds: Set<string>; // Stores sound IDs belonging to this group
    maxInstances?: number; // Maximum number of concurrent instances allowed in the group
    playOptions?: PlayOptions; // Add playOptions to the group
  }