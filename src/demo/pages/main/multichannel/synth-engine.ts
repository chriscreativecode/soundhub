export interface AdsrEnvelope {
  /** seconds */
  attack: number;
  /** seconds */
  decay: number;
  /** 0 to 1 */
  sustain: number;
  /** seconds */
  release: number;
}

interface ActiveSynthVoice {
  oscillator: OscillatorNode;
  gainNode: GainNode;
  noteId: string;
  /** true once the key is up but the sustain pedal is still holding the voice */
  pedalled: boolean;
}

/**
 * A small subtractive synth used as the second engine on this page.
 *
 * It deliberately does not go through SoundManager's sample pipeline: it shows
 * that anything you generate yourself can still be routed into the master chain
 * with `getMasterInput()`, so master volume, mute, panning and the limiter apply
 * to it exactly like a loaded sample.
 */
export class SynthEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private outputGain: GainNode;
  private activeVoices = new Map<string, ActiveSynthVoice>();
  private volume = 1;
  private sustain = false;

  /**
   * A sawtooth at full amplitude peaks at 0 dBFS, while the sampled piano notes
   * peak around -21 dBFS. Without this trim the synthesizer came out roughly ten
   * times louder than the piano. Kept separate from masterGain so the volume
   * slider still spans its full range on top of it, and adjustable so the page
   * can show what happens once a source really is loud enough to clip.
   */
  static readonly DEFAULT_OUTPUT_TRIM = 0.12;
  private outputTrim = SynthEngine.DEFAULT_OUTPUT_TRIM;

  private envelope: AdsrEnvelope = { attack: 0.02, decay: 0.08, sustain: 0.7, release: 0.4 };
  private waveform: OscillatorType = 'sawtooth';

  /** Called whenever the number of sounding voices changes. */
  onVoiceCountChange: ((count: number) => void) | null = null;
  /**
   * Called the moment a voice starts its release ramp, so a matching animation
   * can fade out over the same time. Fires on pedal release too, which is why
   * the caller should not release its animation from the key-up handler.
   */
  onVoiceReleased: ((noteId: string, releaseSeconds: number) => void) | null = null;

  /**
   * @param destination Entry point of the SoundManager master chain.
   */
  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = this.volume;

    this.outputGain = ctx.createGain();
    this.outputGain.gain.value = this.outputTrim;

    this.masterGain.connect(this.outputGain);
    this.outputGain.connect(destination);
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, Math.round(vol * 10000) / 10000));
    this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
  }

  getVolume(): number {
    return this.volume;
  }

  /**
   * Output level of the whole synth, before the master chain. Turning it up is
   * how this page produces a source hot enough to reach the limiter.
   */
  setOutputTrim(trim: number): void {
    this.outputTrim = Math.max(0.01, Math.min(1, trim));
    this.outputGain.gain.setTargetAtTime(this.outputTrim, this.ctx.currentTime, 0.02);
  }

  getOutputTrim(): number {
    return this.outputTrim;
  }

  setWaveform(waveform: OscillatorType): void {
    this.waveform = waveform;
    // Running voices switch shape immediately, which makes the picker audible
    // while you hold a chord.
    this.activeVoices.forEach(voice => { voice.oscillator.type = waveform; });
  }

  getWaveform(): OscillatorType {
    return this.waveform;
  }

  setEnvelope(partial: Partial<AdsrEnvelope>): void {
    this.envelope = { ...this.envelope, ...partial };
  }

  getEnvelope(): AdsrEnvelope {
    return { ...this.envelope };
  }

  getVoiceCount(): number {
    return this.activeVoices.size;
  }

  /**
   * With the pedal down a released key keeps sounding until the pedal comes up.
   */
  setSustain(enabled: boolean): void {
    if (this.sustain === enabled) return;
    this.sustain = enabled;
    if (enabled) return;

    this.activeVoices.forEach((voice, noteId) => {
      if (voice.pedalled) this.releaseVoice(noteId);
    });
  }

  noteOn(noteId: string, frequency: number): void {
    // Retrigger: a key pressed again while still ringing starts over
    this.releaseVoice(noteId, true);

    const now = this.ctx.currentTime;
    const { attack, decay, sustain } = this.envelope;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = this.waveform;
    osc.frequency.setValueAtTime(frequency, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + attack);
    gain.gain.setTargetAtTime(sustain, now + attack, Math.max(decay, 0.001));

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);

    this.activeVoices.set(noteId, { oscillator: osc, gainNode: gain, noteId, pedalled: false });
    this.onVoiceCountChange?.(this.activeVoices.size);
  }

  noteOff(noteId: string): void {
    const voice = this.activeVoices.get(noteId);
    if (!voice) return;

    if (this.sustain) {
      voice.pedalled = true;
      return;
    }
    this.releaseVoice(noteId);
  }

  stopAll(): void {
    Array.from(this.activeVoices.keys()).forEach(noteId => this.releaseVoice(noteId));
  }

  destroy(): void {
    this.stopAll();
    this.masterGain.disconnect();
    this.outputGain.disconnect();
  }

  /**
   * @param silent Skip the release callback, used when a retrigger will
   *   immediately create a replacement voice for the same note.
   */
  private releaseVoice(noteId: string, silent = false): void {
    const voice = this.activeVoices.get(noteId);
    if (!voice) return;

    const now = this.ctx.currentTime;
    const { oscillator, gainNode } = voice;
    const release = Math.max(this.envelope.release, 0.02);

    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(0, now + release);
    oscillator.stop(now + release + 0.05);

    window.setTimeout(() => {
      try { oscillator.disconnect(); } catch { /* already disconnected */ }
      try { gainNode.disconnect(); } catch { /* already disconnected */ }
    }, (release + 0.1) * 1000);

    this.activeVoices.delete(noteId);
    this.onVoiceCountChange?.(this.activeVoices.size);
    if (!silent) this.onVoiceReleased?.(noteId, release);
  }
}
