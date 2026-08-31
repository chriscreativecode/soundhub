import { afterEach, beforeEach, vi } from 'vitest';
import { MockAudioContext, installWebAudioMock, playableMimeTypes } from './web-audio-mock';

installWebAudioMock();

beforeEach(() => {
  // The banner every hub prints on construction would drown the test output.
  vi.spyOn(console, 'info').mockImplementation(() => undefined);

  playableMimeTypes.clear();
  playableMimeTypes.add('audio/mpeg');
  playableMimeTypes.add('audio/wav; codecs="1"');
  MockAudioContext.instances.length = 0;
  MockAudioContext.startSuspended = false;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
