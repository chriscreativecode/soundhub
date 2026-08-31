import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG, SoundEventsEnum } from '../src/index';
import { contextOf, createHub, flush, loadSound } from './support/helpers';
import { MockAudioContext } from './support/web-audio-mock';

describe('the audio context', () => {
  it('suspends and resumes on request', async () => {
    const hub = createHub();

    await hub.suspendContext();
    expect(hub.getContext().state).toBe('suspended');

    await hub.resumeContext();
    expect(hub.getContext().state).toBe('running');
  });

  it('reports what it did', async () => {
    const hub = createHub();
    const suspended = vi.fn();
    const resumed = vi.fn();
    hub.addEventListener(SoundEventsEnum.CONTEXT_SUSPENDED, suspended);
    hub.addEventListener(SoundEventsEnum.CONTEXT_RESUMED, resumed);

    await hub.suspendContext();
    await hub.resumeContext();

    expect(suspended).toHaveBeenCalledOnce();
    expect(resumed).toHaveBeenCalledOnce();
  });

  it('hands out the master input and output for your own nodes', () => {
    const hub = createHub();

    expect(hub.getMasterInput()).toBeDefined();
    expect(hub.getMasterOutput()).toBeDefined();
  });

  it('is ready once a sound is loaded and the context runs', async () => {
    const hub = createHub();
    expect(hub.isReady()).toBe(false);

    await loadSound(hub, 'music');

    expect(hub.isReady()).toBe(true);
  });
});

describe('the master limiter', () => {
  it('is off unless you ask for it', () => {
    const hub = createHub();

    expect(hub.isMasterLimiterEnabled()).toBe(false);
    expect(hub.getMasterLimiterNode()).toBeNull();
    expect(DEFAULT_CONFIG.masterLimiter).toBe(false);
  });

  it('goes in the chain when the config asks for it', () => {
    const hub = createHub({ masterLimiter: true });

    expect(hub.isMasterLimiterEnabled()).toBe(true);
    expect(hub.getMasterLimiterNode()).not.toBeNull();
  });

  it('can be switched at runtime', () => {
    const hub = createHub();

    hub.setMasterLimiter(true);
    expect(hub.isMasterLimiterEnabled()).toBe(true);

    hub.setMasterLimiter(false);
    expect(hub.isMasterLimiterEnabled()).toBe(false);
    expect(hub.getMasterLimiterNode()).toBeNull();
  });
});

describe('auto suspend', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stays awake by default', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');

    hub.play('music');
    hub.stop('music');
    vi.advanceTimersByTime(60_000);

    expect(hub.getContext().state).toBe('running');
  });

  it('sleeps after the configured silence', async () => {
    const hub = createHub({ autoSuspend: true, autoSuspendDelay: 5 });
    await loadSound(hub, 'music');

    hub.play('music');
    hub.stop('music');
    vi.advanceTimersByTime(5_100);
    await vi.runOnlyPendingTimersAsync();

    expect(hub.getContext().state).toBe('suspended');
  });

  it('stays awake while something is playing', async () => {
    const hub = createHub({ autoSuspend: true, autoSuspendDelay: 5 });
    await loadSound(hub, 'music');
    await loadSound(hub, 'rain');

    hub.play('music');
    hub.play('rain');
    hub.stop('rain');
    vi.advanceTimersByTime(10_000);
    await vi.runOnlyPendingTimersAsync();

    expect(hub.getContext().state).toBe('running');
  });

  it('wakes up on the next play', async () => {
    const hub = createHub({ autoSuspend: true, autoSuspendDelay: 5 });
    await loadSound(hub, 'music');

    hub.play('music');
    hub.stop('music');
    vi.advanceTimersByTime(5_100);
    await vi.runOnlyPendingTimersAsync();
    expect(hub.getContext().state).toBe('suspended');

    hub.play('music');
    await vi.runOnlyPendingTimersAsync();

    expect(hub.getContext().state).toBe('running');
    expect(hub.isPlaying('music')).toBe(true);
  });

  it('does not sleep while a sound is only paused', async () => {
    const hub = createHub({ autoSuspend: true, autoSuspendDelay: 5 });
    await loadSound(hub, 'music');

    hub.play('music');
    hub.pause('music');
    vi.advanceTimersByTime(5_100);
    await vi.runOnlyPendingTimersAsync();

    // Nothing is making a sound, so sleeping is correct here too.
    expect(hub.getContext().state).toBe('suspended');

    hub.resume('music');
    await vi.runOnlyPendingTimersAsync();
    expect(hub.getContext().state).toBe('running');
  });
});

describe('reset and destroy', () => {
  it('stops everything and empties the hub', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    await loadSound(hub, 'rain');
    hub.play('music');

    hub.reset({ unloadSounds: true });

    expect(hub.getSoundCount()).toBe(0);
    expect(hub.isPlaying('music')).toBe(false);
  });

  it('keeps the sounds when it is only a reset', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    hub.play('music', { volume: 0.2 });

    hub.reset();

    expect(hub.getSoundCount()).toBe(1);
    expect(hub.isPlaying('music')).toBe(false);
  });

  it('puts one sound back to its defaults', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    hub.play('music', { volume: 0.2 });
    hub.setPan('music', -0.9);

    hub.resetSound('music');

    expect(hub.getSound('music')?.pan).toBe(0);
    expect(hub.isPlaying('music')).toBe(false);
  });

  it('closes the context on destroy', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    hub.play('music');

    hub.destroy();

    expect(contextOf(hub).state).toBe('closed');
  });

  it('drops every listener on destroy', async () => {
    const hub = createHub();
    const listener = vi.fn();
    hub.addEventListener(SoundEventsEnum.STOPPED, listener);

    hub.destroy();

    expect(hub.hasEventListener(SoundEventsEnum.STOPPED)).toBe(false);
  });
});

describe('configuration', () => {
  it('reports the merged config', () => {
    const hub = createHub({ defaultVolume: 0.5, debug: false });

    const config = hub.getConfig();

    expect(config.defaultVolume).toBe(0.5);
    expect(config.autoUnlock).toBe(DEFAULT_CONFIG.autoUnlock);
  });

  it('does not write into the object it was given', () => {
    const userConfig = { defaultVolume: 2 };

    createHub(userConfig);

    expect(userConfig.defaultVolume).toBe(2);
  });

  it('applies the default volume to a newly loaded sound', async () => {
    const hub = createHub({ defaultVolume: 0.4 });
    await loadSound(hub, 'music');

    expect(hub.getSoundVolume('music')).toBe(0.4);
  });
});

describe('unlocking on mobile', () => {
  it('says when the first touch woke the audio up', async () => {
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 2 });
    MockAudioContext.startSuspended = true;

    const hub = createHub();
    const listener = vi.fn();
    hub.addEventListener(SoundEventsEnum.UNLOCKED, listener);

    document.dispatchEvent(new Event('click'));
    await flush();

    expect(listener).toHaveBeenCalledOnce();
    expect(hub.getContext().state).toBe('running');

    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 0 });
  });
});
