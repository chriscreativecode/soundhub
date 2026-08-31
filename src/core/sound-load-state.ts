/**
 * Where a sound is in the loading process.
 *
 * `unloaded` covers both an id the hub has never heard of and one that was
 * registered with `registerSound` but not fetched yet. `isSoundLoaded(id)`
 * stays the quick yes or no; this is the answer when you want to show a
 * spinner or a retry button.
 */
export type SoundLoadState = "unloaded" | "loading" | "loaded" | "error";
