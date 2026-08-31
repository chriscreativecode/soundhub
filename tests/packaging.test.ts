import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { describe, expect, it, vi } from 'vitest';
import { SoundEventsEnum, SoundHub } from '../src/index';
import { contextOf, createHub, loadSound } from './support/helpers';

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf-8');

const packageJson = JSON.parse(read('../package.json'));

describe('what the package promises', () => {
  it('keeps the version in the banner in step with package.json', () => {
    // Two places, updated by hand, and only one of them is obvious at release
    // time. The console banner claimed 6.1.0 for a while after 6.2.0 shipped.
    const source = read('../src/core/sound-hub.ts');
    const inBanner = /private VERSION = "([^"]+)"/.exec(source)?.[1];

    expect(inBanner).toBe(packageJson.version);
  });

  it('exports its own package.json, so tools can read the version', () => {
    expect(packageJson.exports['./package.json']).toBe('./package.json');
  });

  it('exports types, an ES build and a UMD build from the root', () => {
    expect(packageJson.exports['.']).toEqual({
      types: './dist/types/index.d.ts',
      import: './dist/soundhub.es.js',
      require: './dist/soundhub.umd.js',
    });
  });

  it('ships the files those entry points point at', () => {
    expect(packageJson.files).toEqual(
      expect.arrayContaining(['dist/soundhub.es.js', 'dist/soundhub.umd.js', 'dist/types'])
    );
  });

  it('runs the tests and the build before publishing', () => {
    expect(packageJson.scripts.prepublishOnly).toContain('test');
    expect(packageJson.scripts.prepublishOnly).toContain('build');
  });

  it('has no runtime dependencies', () => {
    expect(packageJson.dependencies).toBeUndefined();
  });
});

describe('the progress event', () => {
  it('carries the whole state, so a seek bar does not have to ask for it', async () => {
    const hub = createHub();
    await loadSound(hub, 'music', '/audio/music.mp3', 10);
    const listener = vi.fn();
    hub.addEventListener(SoundEventsEnum.PROGRESS, listener, { soundId: 'music' });

    hub.play('music', { trackProgress: true });
    contextOf(hub).advance(2.5);
    await vi.waitFor(() => expect(listener).toHaveBeenCalled());

    const event = listener.mock.calls.at(-1)?.[0];
    expect(event.state).toMatchObject({
      progress: expect.any(Number),
      currentTime: expect.any(Number),
      duration: 10,
      playbackRate: expect.any(Number),
      volume: expect.any(Number),
      pan: expect.any(Number),
    });
    expect(event.state.state).toBe('playing');
  });

  it('carries it for a stream as well', async () => {
    const hub = createHub();
    await hub.loadStream('podcast', '/audio/episode.mp3');
    const listener = vi.fn();
    hub.addEventListener(SoundEventsEnum.PROGRESS, listener, { soundId: 'podcast' });

    hub.play('podcast');
    await vi.waitFor(() => expect(listener).toHaveBeenCalled());

    expect(listener.mock.calls.at(-1)?.[0].state).toMatchObject({ duration: 60 });
  });
});

describe('the event bus', () => {
  it('has the number of event types the README claims', () => {
    // The README says 38. If that number moves, the sentence moves with it.
    expect(Object.keys(SoundEventsEnum)).toHaveLength(38);
  });

  it('exposes the same methods the interface declares', () => {
    const declared = read('../src/core/sound-hub.interface.ts')
      .split('\n')
      .map((line) => /^ {2}([a-zA-Z]+)\(/.exec(line)?.[1])
      .filter((name): name is string => Boolean(name));

    const hub = new SoundHub({});
    const missing = declared.filter((name) => typeof (hub as never as Record<string, unknown>)[name] !== 'function');

    expect(missing).toEqual([]);
  });
});
