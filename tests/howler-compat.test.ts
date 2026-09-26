import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Howl, Howler } from '../src/howler';
import { flush, mockAudioFetch, mockFailingFetch } from './support/helpers';

/** Wait until a Howl has loaded, the way Howler code waits for onload. */
const loaded = (howl: Howl) =>
  new Promise<void>((resolve) => (howl.state() === 'loaded' ? resolve() : howl.once('load', () => resolve())));

const hubIdOf = (howl: Howl, id: number): string =>
  (howl as unknown as { voices: Map<number, { hubId: string }> }).voices.get(id)!.hubId;

describe('the Howler compatibility layer', () => {
  beforeEach(() => mockAudioFetch({ seconds: 4 }));
  afterEach(() => {
    Howler.unload();
    Howler.configure({});
  });

  it('loads on construction and calls onload', async () => {
    const onload = vi.fn();
    const howl = new Howl({ src: ['/audio/theme.webm', '/audio/theme.mp3'], onload });

    expect(howl.state()).toBe('loading');
    await loaded(howl);

    expect(howl.state()).toBe('loaded');
    expect(onload).toHaveBeenCalledOnce();
    expect(howl.duration()).toBe(4);
  });

  it('waits for load() when preload is false', async () => {
    const howl = new Howl({ src: '/audio/theme.mp3', preload: false });
    expect(howl.state()).toBe('unloaded');

    howl.load();
    await loaded(howl);
    expect(howl.state()).toBe('loaded');
  });

  it('returns a voice id from play() and queues it until the file is in', async () => {
    const onplay = vi.fn();
    const howl = new Howl({ src: '/audio/theme.mp3', onplay });

    const id = howl.play();
    expect(typeof id).toBe('number');
    expect(howl.playing(id)).toBe(false);

    await loaded(howl);
    expect(howl.playing(id)).toBe(true);
    expect(onplay).toHaveBeenCalledWith(id);
  });

  it('gives every play() its own voice, as Howler does', async () => {
    const howl = new Howl({ src: '/audio/laser.mp3' });
    await loaded(howl);

    const a = howl.play();
    const b = howl.play();

    expect(a).not.toBe(b);
    expect(howl.playing(a)).toBe(true);
    expect(howl.playing(b)).toBe(true);

    howl.stop(a);
    expect(howl.playing(a)).toBe(false);
    expect(howl.playing(b)).toBe(true);
  });

  it('pauses and resumes a voice by its id', async () => {
    const onpause = vi.fn();
    const howl = new Howl({ src: '/audio/theme.mp3', onpause });
    await loaded(howl);
    const id = howl.play();

    howl.pause(id);
    expect(howl.playing(id)).toBe(false);
    expect(onpause).toHaveBeenCalledWith(id);

    expect(howl.play(id)).toBe(id);
    expect(howl.playing(id)).toBe(true);
  });

  it('plays sprites given in milliseconds', async () => {
    const howl = new Howl({ src: '/audio/ui.mp3', sprite: { click: [0, 200], error: [1000, 800, true] } });
    await loaded(howl);

    const click = howl.play('click');
    const error = howl.play('error');

    expect(howl.playing(click)).toBe(true);
    expect(howl.duration(click)).toBe(0.2);
    expect(howl.duration(error)).toBe(0.8);
    expect(Howler.hub.getLoop(hubIdOf(howl, error))).toBe(true);
  });

  it('sets volume, rate and mute on one voice or on all of them', async () => {
    const howl = new Howl({ src: '/audio/theme.mp3', volume: 0.5 });
    await loaded(howl);
    const a = howl.play();
    const b = howl.play();

    expect(howl.volume(a)).toBe(0.5);
    howl.volume(0.2, a);
    expect(howl.volume(a)).toBe(0.2);
    expect(howl.volume(b)).toBe(0.5);

    howl.volume(0.9);
    expect(howl.volume()).toBe(0.9);
    expect(howl.volume(b)).toBe(0.9);

    howl.rate(1.5, b);
    expect(howl.rate(b)).toBe(1.5);

    howl.mute(true);
    expect(howl.mute()).toBe(true);
    expect(howl.mute(a)).toBe(true);
    expect(Howler.hub.getSound(hubIdOf(howl, a))?.isMuted).toBe(true);
  });

  it('seeks in seconds', async () => {
    const howl = new Howl({ src: '/audio/theme.mp3' });
    await loaded(howl);
    const id = howl.play();

    howl.seek(2.5, id);

    expect(howl.seek()).toBeCloseTo(2.5);
  });

  it('fades over milliseconds and calls onfade', async () => {
    vi.useFakeTimers();
    try {
      const onfade = vi.fn();
      const howl = new Howl({ src: '/audio/theme.mp3', onfade });
      await vi.waitFor(() => expect(howl.state()).toBe('loaded'));
      const id = howl.play();

      howl.fade(1, 0, 500, id);
      vi.advanceTimersByTime(500);

      expect(onfade).toHaveBeenCalledWith(id);
    } finally {
      vi.useRealTimers();
    }
  });

  it('calls onend when a voice finishes', async () => {
    const onend = vi.fn();
    const howl = new Howl({ src: '/audio/theme.mp3', onend });
    await loaded(howl);
    const id = howl.play();

    const source = Howler.hub.getSource(hubIdOf(howl, id)) as unknown as { fireEnded(): void };
    source.fireEnded();

    expect(onend).toHaveBeenCalledWith(id);
  });

  it('removes listeners with off()', async () => {
    const onplay = vi.fn();
    const howl = new Howl({ src: '/audio/theme.mp3' });
    howl.on('play', onplay);
    howl.off('play', onplay);
    await loaded(howl);

    howl.play();
    expect(onplay).not.toHaveBeenCalled();
  });

  it('reports a failed load through onloaderror', async () => {
    mockFailingFetch();
    Howler.configure({ fetchRetries: 0, html5AudioFallback: false });
    const onloaderror = vi.fn();
    new Howl({ src: '/audio/missing.mp3', onloaderror });

    await vi.waitFor(() => expect(onloaderror).toHaveBeenCalled());
  });

  it('shares one hub, whose master volume Howler.volume sets', async () => {
    const a = new Howl({ src: '/audio/a.mp3' });
    const b = new Howl({ src: '/audio/b.mp3' });
    await Promise.all([loaded(a), loaded(b)]);

    Howler.volume(0.3);

    expect(Howler.volume()).toBe(0.3);
    expect(Howler.hub.isSoundLoaded(a.soundhubId)).toBe(true);
    expect(Howler.hub.isSoundLoaded(b.soundhubId)).toBe(true);
    expect(Howler.ctx).toBe(Howler.hub.getContext());
  });

  it('stops every Howl with Howler.stop()', async () => {
    const howl = new Howl({ src: '/audio/theme.mp3' });
    await loaded(howl);
    const id = howl.play();

    Howler.stop();
    await flush();

    expect(howl.playing(id)).toBe(false);
  });

  it('streams with html5: true, one voice at a time', async () => {
    const onplay = vi.fn();
    const howl = new Howl({ src: '/audio/episode.mp3', html5: true, onplay });
    await loaded(howl);

    const id = howl.play();
    expect(Howler.hub.isStream(howl.soundhubId)).toBe(true);
    expect(howl.playing(id)).toBe(true);
    expect(onplay).toHaveBeenCalledWith(id);

    howl.pause(id);
    expect(howl.playing(id)).toBe(false);
    howl.play(id);
    expect(howl.playing(id)).toBe(true);
  });

  it('lets the soundhub API reach a Howl, for what Howler cannot do', async () => {
    const music = new Howl({ src: '/audio/music.mp3', loop: true });
    const voice = new Howl({ src: '/audio/voice.mp3' });
    await Promise.all([loaded(music), loaded(voice)]);
    Howler.hub.duck(music.soundhubId, { when: voice.soundhubId });

    music.play();
    voice.play();

    expect(Howler.hub.isDucked(music.soundhubId)).toBe(true);
  });
});
