import { describe, expect, it, vi } from 'vitest';
import { SoundEventsEnum, SoundHub } from '../src/index';
import { createHub, mockAudioFetch, mockFailingFetch } from './support/helpers';
import { playableMimeTypes } from './support/web-audio-mock';

describe('loading a sound', () => {
  it('decodes the file and reports it as loaded', async () => {
    const hub = createHub();
    mockAudioFetch({ seconds: 3 });

    await hub.loadSound('music', '/audio/music.mp3');

    expect(hub.isSoundLoaded('music')).toBe(true);
    expect(hub.getLoadState('music')).toBe('loaded');
    expect(hub.getDuration('music')).toBe(3);
    expect(hub.getSoundCount()).toBe(1);
  });

  it('dispatches loading before loaded', async () => {
    const hub = createHub();
    mockAudioFetch();
    const seen: string[] = [];
    hub.addEventListener(SoundEventsEnum.LOADING, (event) => seen.push(`loading:${event.soundId}`));
    hub.addEventListener(SoundEventsEnum.LOADED, (event) => seen.push(`loaded:${event.soundId}`));

    await hub.loadSound('music', '/audio/music.mp3');

    expect(seen).toEqual(['loading:music', 'loaded:music']);
  });

  it('loads a batch and keeps every id addressable', async () => {
    const hub = createHub();
    mockAudioFetch();

    await hub.loadSounds([
      { id: 'music', url: '/audio/music.mp3' },
      { id: 'laser', url: '/audio/laser.mp3' },
    ]);

    expect(hub.getSoundIds().sort()).toEqual(['laser', 'music']);
  });

  it('skips an id that is already loaded', async () => {
    const hub = createHub();
    const { fetchMock } = mockAudioFetch();

    await hub.loadSound('music', '/audio/music.mp3');
    await hub.loadSound('music', '/audio/other.mp3');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('marks a sound as error when the fetch fails', async () => {
    const hub = createHub({ fetchRetries: 0, html5AudioFallback: false });
    mockFailingFetch();

    await expect(hub.loadSound('music', '/audio/music.mp3')).rejects.toThrow();

    expect(hub.getLoadState('music')).toBe('error');
    expect(hub.isSoundLoaded('music')).toBe(false);
  });

  it('sends the configured headers on every request', async () => {
    const hub = createHub({ fetchHeaders: { Authorization: 'Bearer token' } });
    const { requests } = mockAudioFetch();

    await hub.loadSound('music', '/audio/music.mp3');

    const headers = requests[0].init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer token');
  });

  it('rejects a response that is not audio', async () => {
    const hub = createHub({ fetchRetries: 0, html5AudioFallback: false });
    mockAudioFetch({ contentType: 'text/html' });

    await expect(hub.loadSound('music', '/audio/music.mp3')).rejects.toThrow();
    expect(hub.getLoadState('music')).toBe('error');
  });
});

describe('picking a format', () => {
  it('knows what the browser plays', () => {
    createHub();
    expect(SoundHub.canPlay('mp3')).toBe(true);
    expect(SoundHub.canPlay('.mp3')).toBe(true);
    expect(SoundHub.canPlay('wav')).toBe(true);
    expect(SoundHub.canPlay('opus')).toBe(false);
    expect(SoundHub.getSupportedFormats()).toContain('mp3');
    expect(SoundHub.getSupportedFormats()).not.toContain('opus');
  });

  it('fetches the first url the browser can play and nothing else', async () => {
    const hub = createHub();
    const { requests } = mockAudioFetch();

    await hub.loadSound('theme', ['/audio/theme.opus', '/audio/theme.ogg', '/audio/theme.mp3']);

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('/audio/theme.mp3');
  });

  it('picks opus when the browser grew support for it', async () => {
    playableMimeTypes.add('audio/ogg; codecs="opus"');
    const hub = createHub();
    const { requests } = mockAudioFetch();

    await hub.loadSound('theme', ['/audio/theme.opus', '/audio/theme.mp3']);

    expect(requests[0].url).toBe('/audio/theme.opus');
  });

  it('ignores a query string when reading the extension', async () => {
    const hub = createHub();
    const { requests } = mockAudioFetch();

    await hub.loadSound('theme', ['/audio/theme.ogg?v=2', '/audio/theme.mp3?v=2']);

    expect(requests[0].url).toBe('/audio/theme.mp3?v=2');
  });

  it('falls back to the first url when no extension is recognised', async () => {
    const hub = createHub();
    const { requests } = mockAudioFetch();

    await hub.loadSound('signed', ['/cdn/abc123', '/cdn/def456']);

    expect(requests[0].url).toBe('/cdn/abc123');
  });

  it('remembers every url it was given', async () => {
    const hub = createHub();
    mockAudioFetch();

    await hub.loadSound('theme', ['/audio/theme.opus', '/audio/theme.mp3']);

    expect(hub.getSoundUrls('theme')).toEqual(['/audio/theme.opus', '/audio/theme.mp3']);
  });
});

describe('deferred loading', () => {
  it('registers a sound without fetching it', async () => {
    const hub = createHub();
    const { fetchMock } = mockAudioFetch();

    hub.registerSound('boss', ['/audio/boss.opus', '/audio/boss.mp3']);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(hub.getLoadState('boss')).toBe('unloaded');
    expect(hub.isSoundLoaded('boss')).toBe(false);
    expect(hub.getSoundUrls('boss')).toEqual(['/audio/boss.opus', '/audio/boss.mp3']);
  });

  it('loads a registered sound without repeating the url', async () => {
    const hub = createHub();
    const { requests } = mockAudioFetch();
    hub.registerSounds([{ id: 'boss', url: ['/audio/boss.opus', '/audio/boss.mp3'] }]);

    await hub.loadSound('boss');

    expect(requests[0].url).toBe('/audio/boss.mp3');
    expect(hub.getLoadState('boss')).toBe('loaded');
  });

  it('refuses to load an id it has never heard of', async () => {
    const hub = createHub();
    mockAudioFetch();

    await expect(hub.loadSound('ghost')).rejects.toThrow(/No url for sound ghost/);
  });

  it('reports unloaded for an unknown id', () => {
    const hub = createHub();
    expect(hub.getLoadState('ghost')).toBe('unloaded');
  });

  it('keeps the url after unloading, so it can be loaded again', async () => {
    const hub = createHub();
    mockAudioFetch();
    await hub.loadSound('boss', '/audio/boss.mp3');

    hub.unloadSound('boss');
    expect(hub.getLoadState('boss')).toBe('unloaded');
    expect(hub.getSoundUrls('boss')).toEqual(['/audio/boss.mp3']);

    await hub.loadSound('boss');
    expect(hub.getLoadState('boss')).toBe('loaded');
  });

  it('forgets the url after removeSound', async () => {
    const hub = createHub();
    mockAudioFetch();
    await hub.loadSound('boss', '/audio/boss.mp3');

    hub.removeSound('boss');

    expect(hub.getSoundUrls('boss')).toEqual([]);
    await expect(hub.loadSound('boss')).rejects.toThrow(/No url/);
  });
});

describe('unloading', () => {
  it('drops the sound and its buffer', async () => {
    const hub = createHub();
    mockAudioFetch();
    await hub.loadSound('music', '/audio/music.mp3');

    hub.unloadSound('music');

    expect(hub.hasSound('music')).toBe(false);
    expect(hub.getSoundCount()).toBe(0);
    expect(hub.getBuffer('music')).toBeUndefined();
  });

  it('dispatches unloaded', async () => {
    const hub = createHub();
    mockAudioFetch();
    await hub.loadSound('music', '/audio/music.mp3');
    const listener = vi.fn();
    hub.addEventListener(SoundEventsEnum.UNLOADED, listener);

    hub.unloadSound('music');

    expect(listener).toHaveBeenCalledOnce();
  });
});
