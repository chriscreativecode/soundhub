export interface SoundGroup {
    id: string;
    sounds: Set<string>; // Stores sound IDs belonging to this group
    maxInstances?: number; // Maximum number of concurrent instances allowed in the group
    volume?: number; // Group-specific volume (optional)
  }