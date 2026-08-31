import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHub, loadSound } from './support/helpers';

type Handler = ((details: { seekOffset?: number; seekTime?: number }) => void) | null;

/**
 * jsdom has no Media Session, so this stands in for the operating system's
 * media controls: it remembers the metadata, the state and every button that
 * was wired up.
 */
function installMediaSession() {
  const handlers = new Map<string, Handler>();
  const session = {
    metadata: null as unknown,
    playbackState: 'none',
    setActionHandler: vi.fn((action: string, handler: Handler) => {
      handlers.set(action, handler);
    }),
    setPositionState: vi.fn(),
  };

  Object.defineProperty(navigator, 'mediaSession', { configurable: true, value: session });
  Object.defineProperty(globalThis, 'MediaMetadata', {
    configurable: true,
    writable: true,
    value: class {
      constructor(public readonly init: Record<string, unknown>) {}
    },
  });

  return { session, handlers };
}

describe('media session', () => {
  let session: ReturnType<typeof installMediaSession>['session'];
  let handlers: ReturnType<typeof installMediaSession>['handlers'];

  beforeEach(() => {
    ({ session, handlers } = installMediaSession());
  });

  it('puts the metadata on the lock screen', async () => {
    const hub = createHub();
    await hub.loadStream('podcast', '/audio/episode.mp3');

    hub.setMediaSession('podcast', {
      title: 'Episode 42',
      artist: 'The Podcast',
      artwork: [{ src: '/cover.png', sizes: '512x512', type: 'image/png' }],
    });

    expect((session.metadata as { init: Record<string, unknown> }).init).toMatchObject({
      title: 'Episode 42',
      artist: 'The Podcast',
    });
  });

  it('wires up the hardware buttons', async () => {
    const hub = createHub();
    await hub.loadStream('podcast', '/audio/episode.mp3');

    hub.setMediaSession('podcast');

    expect(handlers.get('play')).toBeTypeOf('function');
    expect(handlers.get('pause')).toBeTypeOf('function');
    expect(handlers.get('seekbackward')).toBeTypeOf('function');
    expect(handlers.get('seekforward')).toBeTypeOf('function');
    expect(handlers.get('seekto')).toBeTypeOf('function');
  });

  it('leaves the track buttons dark unless you supply them', async () => {
    const hub = createHub();
    await hub.loadStream('podcast', '/audio/episode.mp3');

    hub.setMediaSession('podcast');
    expect(handlers.get('nexttrack')).toBeNull();

    const onNextTrack = vi.fn();
    hub.setMediaSession('podcast', { onNextTrack });
    handlers.get('nexttrack')?.({});
    expect(onNextTrack).toHaveBeenCalledOnce();
  });

  it('plays and pauses from the lock screen', async () => {
    const hub = createHub();
    await hub.loadStream('podcast', '/audio/episode.mp3');
    hub.setMediaSession('podcast');

    handlers.get('play')?.({});
    expect(hub.isPlaying('podcast')).toBe(true);

    handlers.get('pause')?.({});
    expect(hub.isPaused('podcast')).toBe(true);

    handlers.get('play')?.({});
    expect(hub.isPlaying('podcast')).toBe(true);
  });

  it('skips back fifteen and forward thirty by default', async () => {
    const hub = createHub();
    await hub.loadStream('podcast', '/audio/episode.mp3');
    hub.setMediaSession('podcast');

    // The mock episode is 60 seconds, and a seek is clamped to the duration.
    hub.play('podcast');
    hub.seek('podcast', 20);

    handlers.get('seekforward')?.({});
    expect(hub.getCurrentTime('podcast')).toBe(50);

    handlers.get('seekbackward')?.({});
    expect(hub.getCurrentTime('podcast')).toBe(35);
  });

  it('takes the offsets it is given', async () => {
    const hub = createHub();
    await hub.loadStream('podcast', '/audio/episode.mp3');
    hub.setMediaSession('podcast', { seekBackwardOffset: 5, seekForwardOffset: 10 });

    hub.play('podcast');
    hub.seek('podcast', 50);

    handlers.get('seekforward')?.({});
    expect(hub.getCurrentTime('podcast')).toBe(60);

    handlers.get('seekbackward')?.({});
    expect(hub.getCurrentTime('podcast')).toBe(55);
  });

  it('follows the scrubber', async () => {
    const hub = createHub();
    await hub.loadStream('podcast', '/audio/episode.mp3');
    hub.setMediaSession('podcast');
    hub.play('podcast');

    handlers.get('seekto')?.({ seekTime: 42 });

    expect(hub.getCurrentTime('podcast')).toBe(42);
  });

  it('keeps the playback state in step', async () => {
    const hub = createHub();
    await hub.loadStream('podcast', '/audio/episode.mp3');
    hub.setMediaSession('podcast');

    hub.play('podcast');
    expect(session.playbackState).toBe('playing');

    hub.pause('podcast');
    expect(session.playbackState).toBe('paused');
  });

  it('works for a buffered sound too', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');

    hub.setMediaSession('music', { title: 'A short one' });
    hub.play('music');

    expect(session.playbackState).toBe('playing');
  });

  it('takes it off again', async () => {
    const hub = createHub();
    await hub.loadStream('podcast', '/audio/episode.mp3');
    hub.setMediaSession('podcast');

    hub.clearMediaSession();

    expect(session.metadata).toBeNull();
    expect(session.playbackState).toBe('none');
  });
});
