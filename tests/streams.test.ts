import { describe, expect, it, vi } from 'vitest';
import { SoundEventsEnum, SoundState } from '../src/index';
import { createHub, loadSound } from './support/helpers';

describe('streams', () => {
  it('loads a long file on a media element', async () => {
    const hub = createHub();

    await hub.loadStream('podcast', '/audio/episode.mp3');

    expect(hub.isStream('podcast')).toBe(true);
    expect(hub.isSoundLoaded('podcast')).toBe(true);
    expect(hub.getLoadState('podcast')).toBe('loaded');
    expect(hub.getStreamElement('podcast')?.src).toContain('/audio/episode.mp3');
  });

  it('does not count as a buffered sound', async () => {
    const hub = createHub();

    await hub.loadStream('podcast', '/audio/episode.mp3');

    expect(hub.getBuffer('podcast')).toBeUndefined();
    expect(hub.isStream('podcast')).toBe(true);
  });

  it('plays, pauses and stops through the same methods', async () => {
    const hub = createHub();
    await hub.loadStream('podcast', '/audio/episode.mp3');

    hub.play('podcast');
    expect(hub.isPlaying('podcast')).toBe(true);

    hub.pause('podcast');
    expect(hub.isPaused('podcast')).toBe(true);

    hub.resume('podcast');
    expect(hub.isPlaying('podcast')).toBe(true);

    hub.stop('podcast');
    expect(hub.isStopped('podcast')).toBe(true);
  });

  it('reports its state like any other sound', async () => {
    const hub = createHub();
    await hub.loadStream('podcast', '/audio/episode.mp3');

    hub.play('podcast');

    expect(hub.getSoundState('podcast').state).toBe(SoundState.Playing);
    expect(hub.getDuration('podcast')).toBe(60);
  });

  it('seeks on the element', async () => {
    const hub = createHub();
    await hub.loadStream('podcast', '/audio/episode.mp3');

    hub.play('podcast');
    hub.seek('podcast', 30);

    expect(hub.getStreamElement('podcast')?.currentTime).toBe(30);
    expect(hub.getCurrentTime('podcast')).toBe(30);
  });

  it('keeps the volume on the gain node, not the element', async () => {
    const hub = createHub();
    await hub.loadStream('podcast', '/audio/episode.mp3', { volume: 0.5 });

    hub.setSoundVolume('podcast', 0.25);

    expect(hub.getVolume('podcast')).toBe(0.25);
    expect(hub.getStreamElement('podcast')?.volume).toBe(1);
  });

  it('mutes and unmutes', async () => {
    const hub = createHub();
    await hub.loadStream('podcast', '/audio/episode.mp3', { volume: 0.8 });

    hub.mute('podcast');
    expect(hub.getVolume('podcast')).toBe(0);

    hub.unmute('podcast');
    expect(hub.getVolume('podcast')).toBeCloseTo(0.8, 5);
  });

  it('sets the playback rate on the element', async () => {
    const hub = createHub();
    await hub.loadStream('podcast', '/audio/episode.mp3');

    hub.setPlaybackRate('podcast', 1.5);

    expect(hub.getStreamElement('podcast')?.playbackRate).toBe(1.5);
    expect(hub.getPlaybackRate('podcast')).toBe(1.5);
  });

  it('refuses sprites, because those need the samples in memory', async () => {
    const hub = createHub();
    await hub.loadStream('podcast', '/audio/episode.mp3');

    expect(() => hub.setSoundSprite('podcast', { intro: [0, 5] })).toThrow(/samples in memory/);
    expect(() => hub.playSprite('podcast', 'intro')).toThrow(/samples in memory/);
  });

  it('ignores an id that is already taken', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');

    await hub.loadStream('music', '/audio/episode.mp3');

    expect(hub.isStream('music')).toBe(false);
  });

  it('unloads and releases the element', async () => {
    const hub = createHub();
    await hub.loadStream('podcast', '/audio/episode.mp3');
    const listener = vi.fn();
    hub.addEventListener(SoundEventsEnum.UNLOADED, listener);

    hub.unloadSound('podcast');

    expect(hub.isStream('podcast')).toBe(false);
    expect(hub.getStreamElement('podcast')).toBeUndefined();
    expect(listener).toHaveBeenCalledOnce();
  });

  it('dispatches ended when the element reaches the end', async () => {
    const hub = createHub();
    await hub.loadStream('podcast', '/audio/episode.mp3');
    const listener = vi.fn();
    hub.addEventListener(SoundEventsEnum.ENDED, listener);

    hub.play('podcast');
    hub.getStreamElement('podcast')?.dispatchEvent(new Event('ended'));

    expect(listener).toHaveBeenCalledOnce();
    expect(hub.isPlaying('podcast')).toBe(false);
  });
});
