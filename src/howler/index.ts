/**
 * soundhub/howler: the Howler.js API on top of soundhub.
 *
 * Swap the import and existing Howler code keeps working:
 *
 *   - import { Howl, Howler } from 'howler';
 *   + import { Howl, Howler } from 'soundhub/howler';
 *
 * Every Howl is a sound in one shared SoundHub, which Howler.hub hands out, so
 * you can mix the two styles while you move over: ducking, variations, the
 * event bus and streams in 3D are all on that hub.
 *
 * What it covers: the Howl constructor options that projects use (src, volume,
 * loop, rate, mute, sprite, autoplay, preload, html5 and the on* callbacks),
 * play, pause, stop, mute, volume, fade, rate, seek, loop, playing, duration,
 * state, stereo, pos, load, unload, on, once and off, and Howler.volume, mute,
 * stop, unload, codecs and ctx. Times are in milliseconds where Howler uses
 * milliseconds (fade durations, sprite ranges) and in seconds where it uses
 * seconds (seek, duration).
 */
import { SoundHub, SoundEventsEnum, SoundPanType } from '../index';
import type { SoundEvent, SoundHubConfig } from '../index';

type HowlEvent =
  | 'load' | 'loaderror' | 'playerror' | 'play' | 'end' | 'pause' | 'stop'
  | 'mute' | 'volume' | 'rate' | 'seek' | 'fade' | 'unlock';

type HowlCallback = (soundId: number, detail?: unknown) => void;

export interface HowlOptions {
  src: string | string[];
  volume?: number;
  loop?: boolean;
  rate?: number;
  mute?: boolean;
  /** Named ranges as [offset in ms, duration in ms, loop?]. */
  sprite?: Record<string, [number, number] | [number, number, boolean]>;
  autoplay?: boolean;
  /** true (default) loads right away, false waits for load(). 'metadata' is treated as true. */
  preload?: boolean | 'metadata';
  /** Stream the file through a media element, for long files. One voice at a time, no sprites. */
  html5?: boolean;
  onload?: () => void;
  onloaderror?: (soundId: number | null, error: unknown) => void;
  onplayerror?: (soundId: number, error: unknown) => void;
  onplay?: (soundId: number) => void;
  onend?: (soundId: number) => void;
  onpause?: (soundId: number) => void;
  onstop?: (soundId: number) => void;
  onmute?: (soundId: number) => void;
  onvolume?: (soundId: number) => void;
  onrate?: (soundId: number) => void;
  onseek?: (soundId: number) => void;
  onfade?: (soundId: number) => void;
  onunlock?: () => void;
}

let sharedHub: SoundHub | null = null;
let sharedConfig: SoundHubConfig = {};
let howlCounter = 0;
let voiceCounter = 1000;
const howls = new Set<Howl>();

function hub(): SoundHub {
  if (!sharedHub) {
    // Howler has no hidden-page mute and no progress timer, so neither does this
    sharedHub = new SoundHub({ autoMuteOnHidden: false, trackProgress: false, ...sharedConfig });
  }
  return sharedHub;
}

/** One voice of a Howl: Howler's numeric sound id and the hub id behind it. */
interface Voice {
  id: number;
  hubId: string | null;
  sprite: string | null;
  /** Things asked of this voice before its Howl had loaded */
  pending: boolean;
}

export class Howl {
  private readonly options: HowlOptions;
  private readonly key: string;
  private readonly voices = new Map<number, Voice>();
  private readonly listeners = new Map<HowlEvent, { fn: HowlCallback; id?: number; once: boolean }[]>();
  private readonly unsubscribe: (() => void)[] = [];
  private loadState: 'unloaded' | 'loading' | 'loaded' = 'unloaded';
  private loadPromise: Promise<void> | null = null;
  private currentVolume: number;
  private currentRate: number;
  private currentLoop: boolean;
  private muted: boolean;
  /** The voice whose hub play() is running, so its started event can be matched before play() returns */
  private startingVoice: Voice | null = null;

  constructor(options: HowlOptions) {
    this.options = { ...options };
    this.key = `howl${++howlCounter}`;
    this.currentVolume = options.volume ?? 1;
    this.currentRate = options.rate ?? 1;
    this.currentLoop = options.loop ?? false;
    this.muted = options.mute ?? false;
    howls.add(this);

    const map: [keyof HowlOptions, HowlEvent][] = [
      ['onload', 'load'], ['onloaderror', 'loaderror'], ['onplayerror', 'playerror'], ['onplay', 'play'],
      ['onend', 'end'], ['onpause', 'pause'], ['onstop', 'stop'], ['onmute', 'mute'], ['onvolume', 'volume'],
      ['onrate', 'rate'], ['onseek', 'seek'], ['onfade', 'fade'], ['onunlock', 'unlock'],
    ];
    map.forEach(([option, event]) => {
      const fn = options[option];
      if (typeof fn === 'function') this.on(event, fn as HowlCallback);
    });

    this.listenToHub();
    if (options.preload !== false) this.load();
    if (options.autoplay) this.play();
  }

  /** The hub id of this Howl, for reaching the same sound through soundhub's own API. */
  get soundhubId(): string {
    return this.key;
  }

  // Loading ------------------------------------------------------------------------------------------------------------

  public load(): this {
    if (this.loadPromise) return this;
    this.loadState = 'loading';
    const sources = Array.isArray(this.options.src) ? this.options.src : [this.options.src];
    const loading = this.options.html5
      ? hub().loadStream(this.key, sources[0], { volume: this.currentVolume, loop: this.currentLoop, playbackRate: this.currentRate })
      : hub().loadSound(this.key, sources);

    this.loadPromise = loading.then(
      () => {
        this.loadState = 'loaded';
        this.applySprites();
        if (this.muted) this.mute(true);
        this.emit('load', null);
        this.voices.forEach((voice) => {
          if (voice.pending) this.startVoice(voice);
        });
      },
      (error) => {
        this.loadState = 'unloaded';
        this.loadPromise = null;
        this.emit('loaderror', null, error);
      }
    );
    return this;
  }

  public state(): 'unloaded' | 'loading' | 'loaded' {
    return this.loadState;
  }

  public unload(): null {
    this.voices.forEach((voice) => voice.hubId && hub().stop(voice.hubId, true));
    this.voices.clear();
    this.unsubscribe.forEach((off) => off());
    this.unsubscribe.length = 0;
    if (hub().isSoundLoaded(this.key)) hub().unloadSound(this.key);
    this.loadState = 'unloaded';
    this.loadPromise = null;
    howls.delete(this);
    return null;
  }

  private applySprites(): void {
    if (!this.options.sprite || this.options.html5) return;
    const ranges: Record<string, [number, number]> = {};
    Object.entries(this.options.sprite).forEach(([name, [offset, duration]]) => {
      ranges[name] = [offset / 1000, (offset + duration) / 1000];
    });
    hub().setSoundSprite(this.key, ranges);
  }

  // Playback -----------------------------------------------------------------------------------------------------------

  /**
   * Play the whole file, a sprite by name, or resume a paused voice by its id.
   * Returns the voice id, as Howler does, even before the file has loaded.
   */
  public play(spriteOrId?: string | number): number {
    if (typeof spriteOrId === 'number') {
      const voice = this.voices.get(spriteOrId);
      if (voice) {
        if (voice.hubId && hub().isPaused(voice.hubId)) {
          hub().resume(voice.hubId);
        } else if (!voice.hubId || !hub().isPlaying(voice.hubId)) {
          this.startVoice(voice);
        }
        return voice.id;
      }
      spriteOrId = undefined;
    }

    const voice: Voice = { id: ++voiceCounter, hubId: null, sprite: spriteOrId ?? null, pending: true };
    if (this.options.html5) {
      // A stream has one voice, so every play() is that voice
      this.voices.forEach((v) => this.voices.delete(v.id));
    }
    this.voices.set(voice.id, voice);
    if (this.loadState === 'loaded') this.startVoice(voice);
    else this.load();
    return voice.id;
  }

  private startVoice(voice: Voice): void {
    voice.pending = false;
    const spriteLoop = voice.sprite ? this.options.sprite?.[voice.sprite]?.[2] : undefined;
    const options = {
      volume: this.currentVolume,
      loop: spriteLoop ?? this.currentLoop,
      playbackRate: this.currentRate,
    };

    this.startingVoice = voice;
    try {
      if (this.options.html5) {
        hub().play(this.key, options);
        voice.hubId = this.key;
      } else {
        const id = voice.sprite ? `${this.key}_${voice.sprite}` : this.key;
        const sound = hub().play(id, { ...options, overlap: true });
        if (!sound) throw new Error(`Could not play ${voice.sprite ?? this.options.src}`);
        voice.hubId = sound.id;
      }
      if (this.muted && voice.hubId) hub().mute(voice.hubId);
    } catch (error) {
      this.emit('playerror', voice.id, error);
    } finally {
      this.startingVoice = null;
    }
  }

  public pause(id?: number): this {
    this.voicesFor(id).forEach((voice) => {
      if (voice.hubId && hub().isPlaying(voice.hubId)) hub().pause(voice.hubId);
    });
    return this;
  }

  public stop(id?: number): this {
    this.voicesFor(id).forEach((voice) => {
      voice.pending = false;
      if (voice.hubId && !hub().isStopped(voice.hubId)) hub().stop(voice.hubId);
    });
    return this;
  }

  public playing(id?: number): boolean {
    return this.voicesFor(id).some((voice) => !!voice.hubId && hub().isPlaying(voice.hubId));
  }

  /** Seconds. The sprite's length for a sprite voice, the file's length otherwise. */
  public duration(id?: number): number {
    const sprite = id !== undefined ? this.voices.get(id)?.sprite : null;
    if (sprite && this.options.sprite?.[sprite]) return this.options.sprite[sprite][1] / 1000;
    return this.loadState === 'loaded' ? hub().getDuration(this.key) : 0;
  }

  // Properties ---------------------------------------------------------------------------------------------------------

  public volume(): number;
  public volume(id: number): number;
  public volume(volume: number, id?: number): this;
  public volume(volume?: number, id?: number): number | this {
    if (id === undefined && volume !== undefined && this.voices.has(volume)) [volume, id] = [undefined, volume];
    if (volume === undefined) {
      const voice = id !== undefined ? this.voices.get(id) : undefined;
      return voice?.hubId ? hub().getSoundVolume(voice.hubId) : this.currentVolume;
    }
    if (id === undefined) this.currentVolume = volume;
    this.voicesFor(id).forEach((voice) => {
      if (voice.hubId) hub().setSoundVolume(voice.hubId, volume, true);
      this.emit('volume', voice.id);
    });
    return this;
  }

  /** Fade from one volume to another over `duration` milliseconds. */
  public fade(from: number, to: number, duration: number, id?: number): this {
    if (id === undefined) this.currentVolume = to;
    this.voicesFor(id).forEach((voice) => {
      if (!voice.hubId) return;
      const seconds = Math.max(0, duration) / 1000;
      if (to >= from) hub().fadeIn(voice.hubId, seconds, from, to, true);
      else hub().fadeOut(voice.hubId, seconds, from, to, false, true);
      const done = () => this.emit('fade', voice.id);
      if (seconds === 0) done();
      else setTimeout(done, duration);
    });
    return this;
  }

  public mute(): boolean;
  public mute(id: number): boolean;
  public mute(muted: boolean, id?: number): this;
  public mute(muted?: boolean | number, id?: number): boolean | this {
    if (typeof muted === 'number') {
      const voice = this.voices.get(muted);
      return voice?.hubId ? !!hub().getSound(voice.hubId)?.isMuted : this.muted;
    }
    if (muted === undefined) return this.muted;
    if (id === undefined) this.muted = muted;
    this.voicesFor(id).forEach((voice) => {
      if (voice.hubId) (muted ? hub().mute(voice.hubId) : hub().unmute(voice.hubId));
      this.emit('mute', voice.id);
    });
    return this;
  }

  public rate(): number;
  public rate(id: number): number;
  public rate(rate: number, id?: number): this;
  public rate(rate?: number, id?: number): number | this {
    if (id === undefined && rate !== undefined && this.voices.has(rate)) [rate, id] = [undefined, rate];
    if (rate === undefined) {
      const voice = id !== undefined ? this.voices.get(id) : undefined;
      return voice?.hubId ? hub().getPlaybackRate(voice.hubId) : this.currentRate;
    }
    if (id === undefined) this.currentRate = rate;
    this.voicesFor(id).forEach((voice) => {
      if (voice.hubId) hub().setPlaybackRate(voice.hubId, rate, true);
      this.emit('rate', voice.id);
    });
    return this;
  }

  public loop(): boolean;
  public loop(loop: boolean, id?: number): this;
  public loop(loop?: boolean, id?: number): boolean | this {
    if (loop === undefined) return this.currentLoop;
    if (id === undefined) this.currentLoop = loop;
    this.voicesFor(id).forEach((voice) => voice.hubId && hub().setLoop(voice.hubId, loop));
    return this;
  }

  /** Get the position in seconds, or jump to one. Without an id this is the first voice, as in Howler. */
  public seek(): number;
  public seek(id: number): number;
  public seek(seconds: number, id?: number): this;
  public seek(seconds?: number, id?: number): number | this {
    if (id === undefined && seconds !== undefined && this.voices.has(seconds)) [seconds, id] = [undefined, seconds];
    const voice = id !== undefined ? this.voices.get(id) : this.voices.values().next().value;
    if (seconds === undefined) return voice?.hubId ? hub().getCurrentTime(voice.hubId) : 0;
    if (voice?.hubId) {
      hub().seek(voice.hubId, seconds, true);
      this.emit('seek', voice.id);
    }
    return this;
  }

  /** Stereo pan from -1 to 1. */
  public stereo(): number;
  public stereo(pan: number, id?: number): this;
  public stereo(pan?: number, id?: number): number | this {
    const voices = this.voicesFor(id);
    if (pan === undefined) {
      const first = voices.find((v) => v.hubId);
      return first?.hubId ? hub().getSoundState(first.hubId).pan ?? 0 : 0;
    }
    voices.forEach((voice) => voice.hubId && hub().setPan(voice.hubId, pan, true));
    return this;
  }

  /** Position in 3D. */
  public pos(x: number, y: number, z: number, id?: number): this {
    this.voicesFor(id).forEach((voice) => {
      if (!voice.hubId) return;
      hub().updateSoundOptions(voice.hubId, { panType: SoundPanType.Spatial });
      hub().setSpatialPosition(x, y, z, voice.hubId, undefined, true);
    });
    return this;
  }

  // Events -------------------------------------------------------------------------------------------------------------

  public on(event: HowlEvent, fn: HowlCallback, id?: number): this {
    return this.addListener(event, fn, id, false);
  }

  public once(event: HowlEvent, fn: HowlCallback, id?: number): this {
    return this.addListener(event, fn, id, true);
  }

  public off(event?: HowlEvent, fn?: HowlCallback, id?: number): this {
    if (!event) {
      this.listeners.clear();
      return this;
    }
    const list = this.listeners.get(event) ?? [];
    const matches = (l: { fn: HowlCallback; id?: number }) => (!fn || l.fn === fn) && (id === undefined || l.id === id);
    this.listeners.set(event, list.filter((l) => !matches(l)));
    return this;
  }

  private addListener(event: HowlEvent, fn: HowlCallback, id: number | undefined, once: boolean): this {
    const list = this.listeners.get(event) ?? [];
    list.push({ fn, id, once });
    this.listeners.set(event, list);
    return this;
  }

  private emit(event: HowlEvent, id: number | null, detail?: unknown): void {
    const list = this.listeners.get(event);
    if (!list) return;
    list.slice().forEach((listener) => {
      if (listener.id !== undefined && listener.id !== id) return;
      if (listener.once) list.splice(list.indexOf(listener), 1);
      try {
        if (event === 'loaderror' || event === 'playerror') listener.fn(id as number, detail);
        else if (event === 'load' || event === 'unlock') (listener.fn as () => void)();
        else listener.fn(id as number);
      } catch (error) {
        console.error(`Error in Howl ${event} listener:`, error);
      }
    });
  }

  /** Turn the hub's events for this Howl into Howler callbacks with voice ids. */
  private listenToHub(): void {
    const forward = (type: SoundEventsEnum, event: HowlEvent) => {
      const off = hub().addEventListener(type, (e: SoundEvent) => {
        const hubId = e.instanceId ?? e.soundId;
        let voice = this.voiceOf(hubId);
        if (!voice && this.startingVoice && hubId) {
          // play() dispatches started before it returns the id it gave the voice
          voice = this.startingVoice;
          voice.hubId = hubId;
        }
        if (voice) this.emit(event, voice.id);
      });
      this.unsubscribe.push(off);
    };
    forward(SoundEventsEnum.STARTED, 'play');
    forward(SoundEventsEnum.RESUMED, 'play');
    forward(SoundEventsEnum.ENDED, 'end');
    forward(SoundEventsEnum.LOOP_COMPLETED, 'end');
    forward(SoundEventsEnum.PAUSED, 'pause');
    forward(SoundEventsEnum.STOPPED, 'stop');
    this.unsubscribe.push(hub().addEventListener(SoundEventsEnum.UNLOCKED, () => this.emit('unlock', null)));
  }

  private voiceOf(hubId?: string): Voice | undefined {
    if (!hubId) return undefined;
    for (const voice of this.voices.values()) if (voice.hubId === hubId) return voice;
    return undefined;
  }

  private voicesFor(id?: number): Voice[] {
    if (id === undefined) return Array.from(this.voices.values());
    const voice = this.voices.get(id);
    return voice ? [voice] : [];
  }
}

export interface HowlerGlobal {
  readonly hub: SoundHub;
  readonly ctx: AudioContext;
  readonly masterGain: AudioNode;
  configure(config: SoundHubConfig): HowlerGlobal;
  volume(): number;
  volume(volume: number): HowlerGlobal;
  mute(muted: boolean): HowlerGlobal;
  stop(): HowlerGlobal;
  unload(): HowlerGlobal;
  codecs(extension: string): boolean;
}

/** The global Howler object: master volume, mute and the shared context. */
export const Howler: HowlerGlobal = {
  /** The SoundHub every Howl plays through. Use it for what Howler cannot do. */
  get hub(): SoundHub {
    return hub();
  },
  get ctx(): AudioContext {
    return hub().getContext();
  },
  get masterGain(): AudioNode {
    return hub().getMasterInput();
  },
  /**
   * The config for the shared hub, such as { masterLimiter: true }. Call it
   * before the first Howl and before anything else on Howler, since the hub is
   * made once. Progress events are off by default, as Howler has none; pass
   * { trackProgress: true } to get them. After Howler.unload()
   * the next Howl makes a new hub with this config.
   */
  configure(config: SoundHubConfig): HowlerGlobal {
    if (sharedHub) {
      throw new Error('Howler.configure() has to come before the first Howl, and before Howler.hub, ctx, volume() or codecs().');
    }
    sharedConfig = { ...config };
    return Howler;
  },
  // One body behind both overloads, which an object literal can only type loosely
  volume(volume?: number): any {
    if (volume === undefined) return hub().getGlobalVolume();
    hub().setGlobalVolume(volume);
    return Howler;
  },
  mute(muted: boolean): HowlerGlobal {
    if (muted) hub().muteAllSounds();
    else hub().unmuteAllSounds();
    return Howler;
  },
  stop(): HowlerGlobal {
    howls.forEach((howl) => howl.stop());
    return Howler;
  },
  unload(): HowlerGlobal {
    Array.from(howls).forEach((howl) => howl.unload());
    sharedHub?.destroy();
    sharedHub = null;
    return Howler;
  },
  /** Whether the browser plays this format: 'mp3', 'ogg', 'webm' and so on. */
  codecs(extension: string): boolean {
    return hub().canPlay(extension);
  },
};
