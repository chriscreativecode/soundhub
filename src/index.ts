/**
 * soundhub.js — public entry point.
 *
 * The main class is SoundHub. `SoundManager` is kept as a deprecated alias so
 * projects migrating from sound-manager-ts keep compiling; it will be removed
 * in v7.
 */

export { SoundHub } from './core/sound-hub';
export { SoundHub as SoundManager } from './core/sound-hub';

export { DEFAULT_CONFIG } from './core/sound-hub-config';
export { DEFAULT_PANNER_CONFIG, PanningModel, DistanceModel } from './core/sound-panner-config';
export { SoundEventsEnum } from './core/sound-events.enum';
export { SoundPanType } from './core/sound-pan-type.enum';
export { SoundState } from './core/sound-state.interface';

export type { SoundHubConfig } from './core/sound-hub-config';
export type { SoundHubConfig as SoundManagerConfig } from './core/sound-hub-config';
export type { SoundHubInterface } from './core/sound-hub.interface';
export type { SoundHubInterface as SoundManagerInterface } from './core/sound-hub.interface';

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
