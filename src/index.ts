/**
 * soundhub.js public entry point.
 *
 * The main class is SoundHub. `SoundManager` is kept as a deprecated alias so
 * projects migrating from sound-manager-ts keep compiling. It will be removed
 * in v7.
 */

import { SoundHub } from './core/sound-hub';
import type { SoundHubConfig } from './core/sound-hub-config';
import type { SoundHubInterface } from './core/sound-hub.interface';

export { SoundHub };

// The old names are declared here rather than re-exported under an alias,
// because only a declaration can carry @deprecated for an editor to strike
// through. They will be removed in v7.

/** @deprecated Renamed to `SoundHub`. Removed in v7. */
export const SoundManager = SoundHub;
/** @deprecated Renamed to `SoundHub`. Removed in v7. */
export type SoundManager = SoundHub;
/** @deprecated Renamed to `SoundHubConfig`. Removed in v7. */
export type SoundManagerConfig = SoundHubConfig;
/** @deprecated Renamed to `SoundHubInterface`. Removed in v7. */
export type SoundManagerInterface = SoundHubInterface;

export { DEFAULT_CONFIG } from './core/sound-hub-config';
export { DEFAULT_PANNER_CONFIG, PanningModel, DistanceModel } from './core/sound-panner-config';
export { SoundEventsEnum } from './core/sound-events.enum';
export { SoundPanType } from './core/sound-pan-type.enum';
export { SoundState } from './core/sound-state.interface';

export type { SoundHubConfig } from './core/sound-hub-config';
export type { SoundLoadState } from './core/sound-load-state';
export type { SoundHubInterface } from './core/sound-hub.interface';

export type { PlayOptions } from './core/play-sound-options.interface';
export type { Sound } from './core/sound.interface';
export type { SoundEvent } from './core/sound-event.interface';
export type { SoundGroup } from './core/sound-group';
export type { SoundPannerConfig } from './core/sound-panner-config';
export type { SoundProgressStateInfo } from './core/sound-progress-state-info';
export type { SoundResetOptions } from './core/sound-reset-options.interface';
export type { SoundStateInfo } from './core/sound-state-info.interface';
export type { StreamOptions } from './core/stream-sound';
export type { SoundEventFilter, MediaSessionInfo } from './core/sound-event-filter';
