import { DestroyRef, Injectable, PLATFORM_ID, assertInInjectionContext, inject, signal, type Signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SoundEventsEnum, SoundHub, type PlayOptions, type SoundStateInfo } from 'soundhub';

// The example sounds live in the soundhub repository, served by jsDelivr.
const BASE = 'https://cdn.jsdelivr.net/gh/chriscreativecode/soundhub@main/examples/sounds/';

const SOUNDS = [
  { id: 'music', url: BASE + 'music.mp3' },
  { id: 'laser', url: BASE + 'laser.wav' },
  { id: 'explosion', url: BASE + 'explosion.wav' },
];

/**
 * One hub for the whole app.
 *
 * The hub is only created in the browser. With server-side rendering this
 * service also runs on the server, where there is no AudioContext, and every
 * method then does nothing.
 */
@Injectable({ providedIn: 'root' })
export class SoundService {
  readonly hub = isPlatformBrowser(inject(PLATFORM_ID)) ? new SoundHub({ masterLimiter: true }) : undefined;

  private readonly loadedSignal = signal(false);
  /** True once every sound has loaded. */
  readonly loaded = this.loadedSignal.asReadonly();

  constructor() {
    this.hub?.loadSounds(SOUNDS).then(() => this.loadedSignal.set(true));
    inject(DestroyRef).onDestroy(() => this.hub?.destroy());
  }

  // Browsers only start audio after a click, tap or key press, so call the
  // first play() from an event handler.
  play(id: string, options?: PlayOptions): void {
    this.hub?.play(id, options);
  }

  pause(id: string): void {
    this.hub?.pause(id);
  }

  resume(id: string): void {
    this.hub?.resume(id);
  }

  stop(id: string): void {
    this.hub?.stop(id);
  }

  seek(id: string, seconds: number): void {
    this.hub?.seek(id, seconds);
  }
}

// Every event that changes what a player shows.
const STATE_EVENTS = [
  SoundEventsEnum.STARTED,
  SoundEventsEnum.PAUSED,
  SoundEventsEnum.RESUMED,
  SoundEventsEnum.STOPPED,
  SoundEventsEnum.ENDED,
  SoundEventsEnum.SEEKED,
  SoundEventsEnum.PROGRESS,
];

/**
 * The state of one sound as a signal, kept up to date from the event bus.
 *
 * Call it in a field initializer of a component. The filter `{ soundId: id }`
 * means the component only hears about its own sound, and the listeners are
 * removed when the component is destroyed.
 */
export function injectSoundState(id: string): Signal<SoundStateInfo | undefined> {
  assertInInjectionContext(injectSoundState);
  const hub = inject(SoundService).hub;
  const state = signal<SoundStateInfo | undefined>(hub?.getSoundState(id));
  if (!hub) return state.asReadonly();

  const update = () => state.set(hub.getSoundState(id));
  const removers = STATE_EVENTS.map((type) => hub.addEventListener(type, update, { soundId: id }));
  inject(DestroyRef).onDestroy(() => removers.forEach((remove) => remove()));

  return state.asReadonly();
}
