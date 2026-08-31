import { vi } from 'vitest';
import { SoundHub } from '../../src/index';
import type { SoundHubConfig } from '../../src/index';
import { MockAudioBufferSourceNode, MockAudioContext } from './web-audio-mock';

/**
 * A hub on the mock context, with the format cache cleared so a test can decide
 * which formats this browser plays.
 */
export function createHub(config: SoundHubConfig = {}): SoundHub {
  (SoundHub as unknown as { formatSupport: Map<string, boolean> }).formatSupport.clear();
  return new SoundHub(config);
}

export function contextOf(hub: SoundHub): MockAudioContext {
  return hub.getContext() as unknown as MockAudioContext;
}

/**
 * Answer every audio request with `seconds` worth of bytes. decodeAudioData in
 * the mock turns one kilobyte into one second, which keeps the arithmetic in
 * the tests readable.
 */
export function mockAudioFetch(options: { seconds?: number; contentType?: string } = {}) {
  const { seconds = 2, contentType = 'audio/mpeg' } = options;
  const requests: { url: string; init?: RequestInit }[] = [];

  const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const href = typeof url === 'string' ? url : url.toString();
    requests.push({ url: href, init });

    const bytes = new ArrayBuffer(seconds * 1000);
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': contentType, 'content-length': String(bytes.byteLength) }),
      arrayBuffer: async () => bytes,
    } as unknown as Response;
  });

  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, requests };
}

/** Answer every audio request with a failure, to test the error paths. */
export function mockFailingFetch(message = 'Network down') {
  const fetchMock = vi.fn(async () => {
    throw new Error(message);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** The live source node of a sound, so a test can end it or inspect start(). */
export function sourceOf(hub: SoundHub, id: string): MockAudioBufferSourceNode {
  const source = hub.getSource(id);
  if (!source) throw new Error(`Sound ${id} has no live source`);
  return source as unknown as MockAudioBufferSourceNode;
}

/** What the browser does when a buffer runs out. */
export function endSound(hub: SoundHub, id: string): void {
  sourceOf(hub, id).fireEnded();
}

/** Load a sound through the real loading path, on a mocked fetch. */
export async function loadSound(hub: SoundHub, id: string, url = `/audio/${id}.mp3`, seconds = 2): Promise<void> {
  mockAudioFetch({ seconds });
  await hub.loadSound(id, url);
}

export const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
