import { describe, expect, it, vi } from 'vitest';
import { SoundEventsEnum, SoundState } from '../src/index';
import { contextOf, createHub, endSound, loadSound, sourceOf } from './support/helpers';

describe('play', () => {
  it('starts a loaded sound', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');

    const sound = hub.play('music');

    expect(sound?.id).toBe('music');
    expect(hub.isPlaying('music')).toBe(true);
    expect(hub.isPaused('music')).toBe(false);
    expect(hub.isStopped('music')).toBe(false);
    expect(sourceOf(hub, 'music').startCalls).toHaveLength(1);
  });

  it('dispatches started with the id', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    const listener = vi.fn();
    hub.addEventListener(SoundEventsEnum.STARTED, listener);

    hub.play('music');

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0].soundId).toBe('music');
  });

  it('restarts instead of stacking when it is played again', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');

    hub.play('music');
    const first = sourceOf(hub, 'music');
    hub.play('music');
    const second = sourceOf(hub, 'music');

    expect(second).not.toBe(first);
    expect(hub.getSoundIds()).toEqual(['music']);
  });

  it('reports an error for an unknown id instead of throwing', async () => {
    const hub = createHub();
    const listener = vi.fn();
    hub.addEventListener(SoundEventsEnum.ERROR, listener);

    expect(() => hub.play('ghost')).not.toThrow();
    expect(listener).toHaveBeenCalled();
    expect(hub.getLastError()).toBeInstanceOf(Error);
  });

  it('honours the volume, rate and loop given to play', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');

    hub.play('music', { volume: 0.25, playbackRate: 1.5, loop: true });

    expect(hub.getSoundVolume('music')).toBe(0.25);
    expect(hub.getPlaybackRate('music')).toBe(1.5);
    expect(hub.getLoop('music')).toBe(true);
  });

  it('starts at the requested offset', async () => {
    const hub = createHub();
    await loadSound(hub, 'music', '/audio/music.mp3', 10);

    hub.play('music', { startTime: 4 });

    expect(sourceOf(hub, 'music').startCalls[0].offset).toBe(4);
    expect(hub.getCurrentTime('music')).toBeCloseTo(4, 5);
  });
});

describe('pause, resume and stop', () => {
  it('pauses where it was and resumes from there', async () => {
    const hub = createHub();
    await loadSound(hub, 'music', '/audio/music.mp3', 10);
    const context = contextOf(hub);

    hub.play('music');
    context.advance(3);
    hub.pause('music');

    expect(hub.isPaused('music')).toBe(true);
    expect(hub.isPlaying('music')).toBe(false);
    expect(hub.getCurrentTime('music')).toBeCloseTo(3, 5);

    hub.resume('music');

    expect(hub.isPlaying('music')).toBe(true);
    expect(sourceOf(hub, 'music').startCalls[0].offset).toBeCloseTo(3, 5);
  });

  it('does nothing when pausing a sound that is not playing', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    const listener = vi.fn();
    hub.addEventListener(SoundEventsEnum.PAUSED, listener);

    hub.pause('music');

    expect(listener).not.toHaveBeenCalled();
  });

  it('stops and rewinds', async () => {
    const hub = createHub();
    await loadSound(hub, 'music', '/audio/music.mp3', 10);
    const context = contextOf(hub);

    hub.play('music');
    context.advance(4);
    hub.stop('music');

    expect(hub.isStopped('music')).toBe(true);
    expect(hub.getCurrentTime('music')).toBe(0);
    expect(hub.getProgress('music')).toBe(0);
  });

  it('dispatches stopped once', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    const listener = vi.fn();
    hub.addEventListener(SoundEventsEnum.STOPPED, listener);

    hub.play('music');
    hub.stop('music');

    expect(listener).toHaveBeenCalledOnce();
  });

  it('stops, pauses and resumes everything at once', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    await loadSound(hub, 'rain');

    hub.play('music');
    hub.play('rain');
    hub.pauseAllSounds();

    expect(hub.isPaused('music')).toBe(true);
    expect(hub.isPaused('rain')).toBe(true);

    hub.resumeAllSounds();
    expect(hub.isPlaying('music')).toBe(true);
    expect(hub.isPlaying('rain')).toBe(true);

    hub.stopAllSounds();
    expect(hub.isStopped('music')).toBe(true);
    expect(hub.isStopped('rain')).toBe(true);
  });
});

describe('seeking', () => {
  it('moves the playhead', async () => {
    const hub = createHub();
    await loadSound(hub, 'music', '/audio/music.mp3', 20);

    hub.play('music');
    hub.seek('music', 12);

    expect(hub.getCurrentTime('music')).toBeCloseTo(12, 5);
    expect(hub.getProgress('music')).toBeCloseTo(0.6, 5);
    expect(hub.getProgressPercentage('music')).toBeCloseTo(60, 5);
  });

  it('clamps a seek past the end', async () => {
    const hub = createHub();
    await loadSound(hub, 'music', '/audio/music.mp3', 10);

    hub.play('music');
    hub.seek('music', 999);

    expect(hub.getCurrentTime('music')).toBeLessThanOrEqual(10);
  });

  it('dispatches seeked', async () => {
    const hub = createHub();
    await loadSound(hub, 'music', '/audio/music.mp3', 10);
    const listener = vi.fn();
    hub.addEventListener(SoundEventsEnum.SEEKED, listener);

    hub.play('music');
    hub.seek('music', 5);

    expect(listener).toHaveBeenCalled();
  });
});

describe('reaching the end', () => {
  it('goes back to stopped and dispatches ended', async () => {
    const hub = createHub();
    await loadSound(hub, 'music', '/audio/music.mp3', 2);
    const listener = vi.fn();
    hub.addEventListener(SoundEventsEnum.ENDED, listener);

    hub.play('music');
    endSound(hub, 'music');

    expect(listener).toHaveBeenCalledOnce();
    expect(hub.getSoundState('music').state).toBe(SoundState.Stopped);
  });

  it('loops instead of ending when loop is on', async () => {
    const hub = createHub();
    await loadSound(hub, 'music', '/audio/music.mp3', 2);
    const ended = vi.fn();
    const looped = vi.fn();
    hub.addEventListener(SoundEventsEnum.ENDED, ended);
    hub.addEventListener(SoundEventsEnum.LOOP_COMPLETED, looped);

    hub.play('music', { loop: true });
    endSound(hub, 'music');

    expect(looped).toHaveBeenCalledOnce();
    expect(ended).not.toHaveBeenCalled();
    expect(hub.isPlaying('music')).toBe(true);
  });

  it('stops after maxLoops', async () => {
    const hub = createHub();
    await loadSound(hub, 'music', '/audio/music.mp3', 2);
    const looped = vi.fn();
    hub.addEventListener(SoundEventsEnum.LOOP_COMPLETED, looped);

    hub.play('music', { loop: true, maxLoops: 2 });
    endSound(hub, 'music');
    endSound(hub, 'music');

    expect(looped).toHaveBeenCalledOnce();
    expect(hub.isPlaying('music')).toBe(false);
  });
});

describe('playback rate', () => {
  it('sets and reads the rate', async () => {
    const hub = createHub();
    await loadSound(hub, 'music', '/audio/music.mp3', 10);

    hub.play('music');
    hub.setPlaybackRate('music', 2);

    expect(hub.getPlaybackRate('music')).toBe(2);
    expect(sourceOf(hub, 'music').playbackRate.value).toBe(2);
  });

  it('dispatches playback_rate_changed', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    const listener = vi.fn();
    hub.addEventListener(SoundEventsEnum.PLAYBACK_RATE_CHANGED, listener);

    hub.play('music');
    hub.setPlaybackRate('music', 0.5);

    expect(listener).toHaveBeenCalled();
  });
});

describe('state for the UI', () => {
  it('reports one object with everything a player needs', async () => {
    const hub = createHub();
    await loadSound(hub, 'music', '/audio/music.mp3', 10);
    const context = contextOf(hub);

    hub.play('music', { volume: 0.5 });
    context.advance(2.5);

    const state = hub.getSoundState('music');
    expect(state.state).toBe(SoundState.Playing);
    expect(state.duration).toBe(10);
    expect(state.currentTime).toBeCloseTo(2.5, 5);
    expect(state.progress).toBeCloseTo(0.25, 5);
    expect(state.volume).toBe(0.5);
  });

  it('reports a neutral state for an unknown id instead of throwing', () => {
    const hub = createHub();

    const state = hub.getSoundState('ghost');

    expect(state.state).toBe(SoundState.Stopped);
    expect(state.progress).toBe(0);
    expect(hub.isPlaying('ghost')).toBe(false);
  });
});
