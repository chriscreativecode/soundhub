import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundEventsEnum, SoundHub } from '../src/index';
import { contextOf, createHub, loadSound } from './support/helpers';

describe('volume', () => {
  it('sets and reads the volume of one sound', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');

    hub.play('music');
    hub.setSoundVolume('music', 0.3);

    expect(hub.getSoundVolume('music')).toBe(0.3);
    expect(hub.getVolume('music')).toBe(0.3);
    expect(hub.getGainNode('music')?.gain.value).toBeCloseTo(0.3, 5);
  });

  it('clamps a volume outside 0 to 1', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');

    hub.setSoundVolume('music', 4);
    expect(hub.getSoundVolume('music')).toBe(1);

    hub.setSoundVolume('music', -2);
    expect(hub.getSoundVolume('music')).toBe(0);
  });

  it('dispatches volume_changed', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    const listener = vi.fn();
    hub.addEventListener(SoundEventsEnum.VOLUME_CHANGED, listener);

    hub.setSoundVolume('music', 0.7);

    expect(listener.mock.calls.at(-1)?.[0].volume).toBe(0.7);
  });

  it('keeps the master volume separate from the sounds', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');

    hub.play('music', { volume: 0.5 });
    hub.setGlobalVolume(0.2);

    expect(hub.getGlobalVolume()).toBe(0.2);
    expect(hub.getSoundVolume('music')).toBe(0.5);
  });
});

describe('mute', () => {
  it('mutes and unmutes one sound without losing its volume', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    hub.play('music', { volume: 0.6 });

    hub.mute('music');
    expect(hub.getGainNode('music')?.gain.value).toBe(0);

    hub.unmute('music');
    expect(hub.getSoundVolume('music')).toBeCloseTo(0.6, 5);
  });

  it('toggles one sound', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    hub.play('music', { volume: 0.8 });

    hub.toggleMute('music');
    expect(hub.getGainNode('music')?.gain.value).toBe(0);

    hub.toggleMute('music');
    expect(hub.getGainNode('music')?.gain.value).toBeCloseTo(0.8, 5);
  });

  it('mutes everything at once', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    hub.play('music');

    hub.muteAllSounds();
    expect(hub.getGlobalVolume()).toBe(0);

    hub.unmuteAllSounds();
    expect(hub.getGlobalVolume()).toBeGreaterThan(0);
  });

  it('dispatches the global mute events', async () => {
    const hub = createHub();
    const muted = vi.fn();
    const unmuted = vi.fn();
    hub.addEventListener(SoundEventsEnum.MUTE_GLOBAL, muted);
    hub.addEventListener(SoundEventsEnum.UNMUTE_GLOBAL, unmuted);

    hub.toggleGlobalMute();
    hub.toggleGlobalMute();

    expect(muted).toHaveBeenCalledOnce();
    expect(unmuted).toHaveBeenCalledOnce();
  });
});

describe('fades', () => {
  beforeEach(() => {
    // requestAnimationFrame is not in the default fake list, and the ticker that
    // drives a fade runs on it.
    vi.useFakeTimers({
      toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** One animation frame, with the audio clock moved on by the same amount. */
  const tick = (hub: SoundHub, seconds: number): void => {
    contextOf(hub).advance(seconds);
    vi.advanceTimersByTime(Math.max(16, seconds * 1000));
  };

  it('fades in to the target volume and says when it is done', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    const done = vi.fn();
    hub.addEventListener(SoundEventsEnum.FADE_IN_COMPLETED, done);

    hub.play('music', { volume: 0 });
    hub.fadeIn('music', 2, 0, 1);

    tick(hub, 1);
    expect(hub.getSoundVolume('music')).toBeGreaterThan(0);
    expect(hub.getSoundVolume('music')).toBeLessThan(1);
    expect(done).not.toHaveBeenCalled();

    tick(hub, 1.5);
    expect(hub.getSoundVolume('music')).toBe(1);
    expect(done).toHaveBeenCalledOnce();
  });

  it('fades out and can stop the sound at the end', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    const done = vi.fn();
    hub.addEventListener(SoundEventsEnum.FADE_OUT_COMPLETED, done);

    hub.play('music', { volume: 1 });
    hub.fadeOut('music', 1, 1, 0, true);

    tick(hub, 1.5);

    expect(hub.getSoundVolume('music')).toBe(0);
    expect(done).toHaveBeenCalledOnce();
    expect(hub.isPlaying('music')).toBe(false);
  });

  it('leaves the sound playing when it should not stop after the fade', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');

    hub.play('music', { volume: 1 });
    hub.fadeOut('music', 1, 1, 0.2, false);

    tick(hub, 1.5);

    expect(hub.getSoundVolume('music')).toBeCloseTo(0.2, 5);
    expect(hub.isPlaying('music')).toBe(true);
  });

  it('fades the master volume', async () => {
    const hub = createHub();
    const done = vi.fn();
    hub.addEventListener(SoundEventsEnum.FADE_MASTER_OUT_COMPLETED, done);

    hub.setGlobalVolume(1);
    hub.fadeGlobalOut(1, 1, 0);

    tick(hub, 1.5);

    expect(hub.getGlobalVolume()).toBe(0);
    expect(done).toHaveBeenCalledOnce();
  });

  it('reports the faded volume through both getters', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');

    hub.play('music', { volume: 1 });
    hub.fadeOut('music', 1, 1, 0.25, false);
    tick(hub, 1.5);

    expect(hub.getSoundVolume('music')).toBeCloseTo(0.25, 5);
    expect(hub.getSoundState('music').volume).toBeCloseTo(0.25, 5);
  });

  it('lets a second fade replace the first', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');

    hub.play('music', { volume: 1 });
    hub.fadeOut('music', 10, 1, 0);
    tick(hub, 1);
    hub.fadeIn('music', 1, hub.getSoundVolume('music'), 1);
    tick(hub, 1.5);

    expect(hub.getSoundVolume('music')).toBe(1);
    expect(hub.isPlaying('music')).toBe(true);
  });
});

describe('interrupting a fade', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const tick = (hub: SoundHub, seconds: number): void => {
    contextOf(hub).advance(seconds);
    vi.advanceTimersByTime(Math.max(16, seconds * 1000));
  };

  it('lets setSoundVolume take over without finishing the fade', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    const done = vi.fn();
    hub.addEventListener(SoundEventsEnum.FADE_OUT_COMPLETED, done);

    hub.play('music', { volume: 1 });
    hub.fadeOut('music', 10, 1, 0, true);
    tick(hub, 1);

    hub.setSoundVolume('music', 0.7);
    tick(hub, 12);

    expect(hub.getSoundVolume('music')).toBe(0.7);
    expect(hub.isPlaying('music')).toBe(true);
    expect(done).not.toHaveBeenCalled();
  });

  it('carries on from the volume the sound is actually at', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');

    hub.play('music', { volume: 1 });
    hub.fadeOut('music', 10, 1, 0);
    tick(hub, 2);
    const halfway = hub.getSoundVolume('music');

    hub.fadeIn('music', 4, undefined, 1);

    expect(hub.getGainNode('music')?.gain.value).toBeCloseTo(halfway, 2);
    expect(halfway).toBeGreaterThan(0);
  });

  it('does not stop the sound when a fade out is cancelled', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');

    hub.play('music', { volume: 1 });
    hub.fadeOut('music', 5, 1, 0, true);
    tick(hub, 1);
    hub.fadeIn('music', 1, undefined, 1);
    tick(hub, 1.5);

    expect(hub.isPlaying('music')).toBe(true);
    expect(hub.getSoundVolume('music')).toBe(1);
  });

  it('still fires once when the fade is left alone', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    const done = vi.fn();
    hub.addEventListener(SoundEventsEnum.FADE_OUT_COMPLETED, done);

    hub.play('music', { volume: 1 });
    hub.fadeOut('music', 1, 1, 0, true);
    tick(hub, 1.5);

    expect(done).toHaveBeenCalledOnce();
    expect(hub.isPlaying('music')).toBe(false);
  });
});
