/**
 * A Web Audio API stand-in for jsdom.
 *
 * jsdom gives us a document and a window but no audio, so the tests need
 * something to run the graph against. This is deliberately dumb: nodes remember
 * what they were connected to and audio params remember their value. It makes
 * no sound and it does no scheduling.
 *
 * Two things it does model on purpose, because the library depends on them:
 * `currentTime` moves only when a test moves it, and a buffer source refuses a
 * second start(), the way the real one does.
 */

export class MockAudioParam {
  public value: number;
  public readonly automation: { method: string; value: number; time: number }[] = [];

  constructor(value = 0) {
    this.value = value;
  }

  setValueAtTime(value: number, time: number): this {
    this.value = value;
    this.automation.push({ method: 'setValueAtTime', value, time });
    return this;
  }

  linearRampToValueAtTime(value: number, time: number): this {
    this.value = value;
    this.automation.push({ method: 'linearRampToValueAtTime', value, time });
    return this;
  }

  exponentialRampToValueAtTime(value: number, time: number): this {
    this.value = value;
    this.automation.push({ method: 'exponentialRampToValueAtTime', value, time });
    return this;
  }

  setTargetAtTime(value: number, time: number): this {
    this.value = value;
    this.automation.push({ method: 'setTargetAtTime', value, time });
    return this;
  }

  cancelScheduledValues(time: number): this {
    this.automation.push({ method: 'cancelScheduledValues', value: this.value, time });
    return this;
  }
}

export class MockAudioNode {
  public readonly outputs: MockAudioNode[] = [];
  public readonly inputs: MockAudioNode[] = [];
  public disconnectCount = 0;

  constructor(public readonly context: MockAudioContext, public readonly nodeType: string) {}

  connect<T extends MockAudioNode>(destination: T): T {
    this.outputs.push(destination);
    destination.inputs.push(this);
    return destination;
  }

  disconnect(): void {
    this.disconnectCount += 1;
    this.outputs.forEach((target) => {
      const index = target.inputs.indexOf(this);
      if (index !== -1) target.inputs.splice(index, 1);
    });
    this.outputs.length = 0;
  }

  /** Whether this node reaches the given one, directly or through the chain. */
  reaches(target: MockAudioNode, seen = new Set<MockAudioNode>()): boolean {
    if (this === target) return true;
    if (seen.has(this)) return false;
    seen.add(this);
    return this.outputs.some((node) => node.reaches(target, seen));
  }
}

export class MockGainNode extends MockAudioNode {
  public readonly gain = new MockAudioParam(1);
  constructor(context: MockAudioContext) {
    super(context, 'gain');
  }
}

export class MockStereoPannerNode extends MockAudioNode {
  public readonly pan = new MockAudioParam(0);
  constructor(context: MockAudioContext) {
    super(context, 'stereoPanner');
  }
}

export class MockPannerNode extends MockAudioNode {
  public readonly positionX = new MockAudioParam(0);
  public readonly positionY = new MockAudioParam(0);
  public readonly positionZ = new MockAudioParam(0);
  public readonly orientationX = new MockAudioParam(1);
  public readonly orientationY = new MockAudioParam(0);
  public readonly orientationZ = new MockAudioParam(0);
  public panningModel = 'equalpower';
  public distanceModel = 'inverse';
  public refDistance = 1;
  public maxDistance = 10000;
  public rolloffFactor = 1;
  public coneInnerAngle = 360;
  public coneOuterAngle = 360;
  public coneOuterGain = 0;

  constructor(context: MockAudioContext) {
    super(context, 'panner');
  }
}

export class MockDynamicsCompressorNode extends MockAudioNode {
  public readonly threshold = new MockAudioParam(-24);
  public readonly knee = new MockAudioParam(30);
  public readonly ratio = new MockAudioParam(12);
  public readonly attack = new MockAudioParam(0.003);
  public readonly release = new MockAudioParam(0.25);
  public readonly reduction = 0;

  constructor(context: MockAudioContext) {
    super(context, 'compressor');
  }
}

export class MockConstantSourceNode extends MockAudioNode {
  public readonly offset = new MockAudioParam(1);
  public started = false;
  public stopped = false;

  constructor(context: MockAudioContext) {
    super(context, 'constantSource');
  }

  start(): void {
    this.started = true;
  }

  stop(): void {
    this.stopped = true;
  }
}

export class MockAudioBuffer {
  constructor(
    public readonly numberOfChannels: number,
    public readonly length: number,
    public readonly sampleRate: number
  ) {}

  get duration(): number {
    return this.length / this.sampleRate;
  }

  getChannelData(): Float32Array {
    return new Float32Array(this.length);
  }
}

export class MockAudioBufferSourceNode extends MockAudioNode {
  public buffer: MockAudioBuffer | null = null;
  public loop = false;
  public loopStart = 0;
  public loopEnd = 0;
  public readonly playbackRate = new MockAudioParam(1);
  public readonly detune = new MockAudioParam(0);
  public onended: (() => void) | null = null;

  public startCalls: { when: number; offset?: number; duration?: number }[] = [];
  public stopCalls: number[] = [];

  constructor(context: MockAudioContext) {
    super(context, 'bufferSource');
  }

  start(when = 0, offset?: number, duration?: number): void {
    if (this.startCalls.length) {
      throw new DOMException('cannot call start more than once', 'InvalidStateError');
    }
    this.startCalls.push({ when, offset, duration });
  }

  stop(when = 0): void {
    if (!this.startCalls.length) {
      throw new DOMException('cannot call stop without calling start first', 'InvalidStateError');
    }
    this.stopCalls.push(when);
  }

  /** What the browser does when the buffer runs out. Tests call this by hand. */
  fireEnded(): void {
    this.onended?.();
  }
}

class MockAudioListener {
  public readonly positionX = new MockAudioParam(0);
  public readonly positionY = new MockAudioParam(0);
  public readonly positionZ = new MockAudioParam(0);
  public readonly forwardX = new MockAudioParam(0);
  public readonly forwardY = new MockAudioParam(0);
  public readonly forwardZ = new MockAudioParam(-1);
  public readonly upX = new MockAudioParam(0);
  public readonly upY = new MockAudioParam(1);
  public readonly upZ = new MockAudioParam(0);
}

export class MockAudioContext {
  /** Mobile browsers hand you a suspended context. Tests can ask for that. */
  public static startSuspended = false;

  public state: AudioContextState = MockAudioContext.startSuspended ? 'suspended' : 'running';
  public sampleRate = 44100;
  public readonly destination: MockAudioNode;
  public readonly listener = new MockAudioListener();
  public readonly createdSources: MockAudioBufferSourceNode[] = [];

  /** Every context the tests made, so afterEach can assert they were closed. */
  public static readonly instances: MockAudioContext[] = [];

  private time = 0;

  constructor() {
    this.destination = new MockAudioNode(this, 'destination');
    MockAudioContext.instances.push(this);
  }

  get currentTime(): number {
    return this.time;
  }

  /** Move the clock. Nothing in Web Audio does this for us in a test. */
  advance(seconds: number): void {
    this.time += seconds;
  }

  createGain(): MockGainNode {
    return new MockGainNode(this);
  }

  createStereoPanner(): MockStereoPannerNode {
    return new MockStereoPannerNode(this);
  }

  createPanner(): MockPannerNode {
    return new MockPannerNode(this);
  }

  createDynamicsCompressor(): MockDynamicsCompressorNode {
    return new MockDynamicsCompressorNode(this);
  }

  createConstantSource(): MockConstantSourceNode {
    return new MockConstantSourceNode(this);
  }

  createBufferSource(): MockAudioBufferSourceNode {
    const source = new MockAudioBufferSourceNode(this);
    this.createdSources.push(source);
    return source;
  }

  createBuffer(channels: number, length: number, sampleRate: number): MockAudioBuffer {
    return new MockAudioBuffer(channels, length, sampleRate);
  }

  createMediaElementSource(): MockAudioNode {
    return new MockAudioNode(this, 'mediaElementSource');
  }

  decodeAudioData(data: ArrayBuffer): Promise<MockAudioBuffer> {
    // The byte length decides the length, so a test can make a long sound.
    const seconds = Math.max(1, Math.round(data.byteLength / 1000));
    return Promise.resolve(new MockAudioBuffer(2, seconds * this.sampleRate, this.sampleRate));
  }

  suspend(): Promise<void> {
    this.state = 'suspended';
    return Promise.resolve();
  }

  resume(): Promise<void> {
    this.state = 'running';
    return Promise.resolve();
  }

  close(): Promise<void> {
    this.state = 'closed';
    return Promise.resolve();
  }
}

/** Formats this fake browser claims to play. Tests can swap the set. */
export const playableMimeTypes = new Set(['audio/mpeg', 'audio/wav; codecs="1"']);

/**
 * Put the fakes on the window. jsdom has an HTMLAudioElement but none of its
 * media methods are implemented, so those get a stand-in too.
 */
export function installWebAudioMock(): void {
  const globals = globalThis as unknown as Record<string, unknown>;

  globals.AudioContext = MockAudioContext;
  globals.AudioListener = MockAudioListener;
  globals.PannerNode = MockPannerNode;
  globals.AudioBuffer = MockAudioBuffer;
  globals.AudioBufferSourceNode = MockAudioBufferSourceNode;
  globals.GainNode = MockGainNode;
  globals.StereoPannerNode = MockStereoPannerNode;

  if (typeof window !== 'undefined') {
    Object.assign(window, {
      AudioContext: MockAudioContext,
      AudioListener: MockAudioListener,
      PannerNode: MockPannerNode,
    });
  }

  Object.defineProperty(HTMLMediaElement.prototype, 'canPlayType', {
    configurable: true,
    writable: true,
    value: (type: string) => (playableMimeTypes.has(type) ? 'probably' : ''),
  });

  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    writable: true,
    value(this: HTMLMediaElement) {
      Object.defineProperty(this, 'paused', { configurable: true, value: false });
      return Promise.resolve();
    },
  });

  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    writable: true,
    value(this: HTMLMediaElement) {
      Object.defineProperty(this, 'paused', { configurable: true, value: true });
    },
  });

  // jsdom parses the src but never loads anything, so nothing would ever report
  // its metadata and loadStream would wait forever.
  Object.defineProperty(HTMLMediaElement.prototype, 'load', {
    configurable: true,
    writable: true,
    value(this: HTMLMediaElement) {
      setTimeout(() => this.dispatchEvent(new Event('loadedmetadata')), 0);
    },
  });

  Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
    configurable: true,
    get(this: HTMLMediaElement & { mockDuration?: number }) {
      return this.mockDuration ?? 60;
    },
  });

  Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
    configurable: true,
    get(this: HTMLMediaElement & { mockCurrentTime?: number }) {
      return this.mockCurrentTime ?? 0;
    },
    set(this: HTMLMediaElement & { mockCurrentTime?: number }, value: number) {
      this.mockCurrentTime = value;
    },
  });
}
