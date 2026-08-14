export interface RecordedEvent {
  /** Milliseconds since the first recorded note */
  at: number;
  noteId: string;
  type: 'on' | 'off';
}

export type RecorderState = 'idle' | 'armed' | 'recording' | 'playing';

/**
 * Records the note-on and note-off moments of a performance and replays them
 * with the same timing.
 *
 * The recorder is deliberately engine-agnostic: it stores note ids and
 * timestamps only, and hands them back through callbacks. Replaying therefore
 * goes through the exact same trigger path as playing by hand, so a recording
 * made on the piano can be played back on the synthesizer.
 */
export class PerformanceRecorder {
  private events: RecordedEvent[] = [];
  private startedAt = 0;
  private state: RecorderState = 'idle';
  private timers: number[] = [];
  private loopEnabled = false;

  onNoteOn: ((noteId: string) => void) | null = null;
  onNoteOff: ((noteId: string) => void) | null = null;
  onStateChange: ((state: RecorderState) => void) | null = null;
  /** Playback position as a 0 to 1 ratio, or -1 when nothing is playing. */
  onProgress: ((ratio: number) => void) | null = null;

  getState(): RecorderState {
    return this.state;
  }

  getEventCount(): number {
    return this.events.length;
  }

  /** Length of the recording in milliseconds, tail included. */
  getDuration(): number {
    if (this.events.length === 0) return 0;
    return this.events[this.events.length - 1].at + 600;
  }

  hasRecording(): boolean {
    return this.events.length > 0;
  }

  isLoopEnabled(): boolean {
    return this.loopEnabled;
  }

  setLoop(enabled: boolean): void {
    this.loopEnabled = enabled;
  }

  /**
   * Arms the recorder. The clock only starts on the first note, so there is no
   * silence in front of the recording no matter how long you think first.
   */
  arm(): void {
    this.stopPlayback();
    this.events = [];
    this.startedAt = 0;
    this.setState('armed');
  }

  stopRecording(): void {
    if (this.state !== 'armed' && this.state !== 'recording') return;
    this.setState('idle');
  }

  clear(): void {
    this.stopPlayback();
    this.events = [];
    this.startedAt = 0;
    this.setState('idle');
  }

  capture(noteId: string, type: 'on' | 'off'): void {
    if (this.state !== 'armed' && this.state !== 'recording') return;

    const now = performance.now();
    if (this.state === 'armed') {
      if (type === 'off') return; // do not open a recording with a stray key-up
      this.startedAt = now;
      this.setState('recording');
    }

    this.events.push({ at: now - this.startedAt, noteId, type });
  }

  /** Milliseconds recorded so far, for the live timer. */
  getElapsed(): number {
    if (this.state === 'recording') return performance.now() - this.startedAt;
    return this.getDuration();
  }

  play(): void {
    if (this.events.length === 0) return;
    this.stopPlayback();
    this.setState('playing');
    this.schedulePass();
  }

  stopPlayback(): void {
    this.timers.forEach(id => window.clearTimeout(id));
    this.timers = [];
    if (this.state === 'playing') {
      this.onProgress?.(-1);
      this.setState('idle');
    }
  }

  private schedulePass(): void {
    const duration = this.getDuration();
    const startedAt = performance.now();

    this.events.forEach(event => {
      const id = window.setTimeout(() => {
        if (event.type === 'on') this.onNoteOn?.(event.noteId);
        else this.onNoteOff?.(event.noteId);
      }, event.at);
      this.timers.push(id);
    });

    const tick = (): void => {
      if (this.state !== 'playing') return;
      this.onProgress?.(Math.min(1, (performance.now() - startedAt) / duration));
      const id = window.setTimeout(tick, 60);
      this.timers.push(id);
    };
    tick();

    const endId = window.setTimeout(() => {
      if (this.loopEnabled) {
        this.timers.forEach(t => window.clearTimeout(t));
        this.timers = [];
        this.schedulePass();
      } else {
        this.stopPlayback();
      }
    }, duration);
    this.timers.push(endId);
  }

  private setState(state: RecorderState): void {
    if (this.state === state) return;
    this.state = state;
    this.onStateChange?.(state);
  }
}
