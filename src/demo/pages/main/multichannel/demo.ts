import "../../../shared.css";
import "./demo.css";

declare function gtag(...args: any[]): void;
import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';

hljs.registerLanguage('typescript', typescript);

// @ts-ignore
import c4   from "../../../../sounds/piano/C4.mp3";
// @ts-ignore
import db4  from "../../../../sounds/piano/Db4.mp3";
// @ts-ignore
import d4   from "../../../../sounds/piano/D4.mp3";
// @ts-ignore
import eb4  from "../../../../sounds/piano/Eb4.mp3";
// @ts-ignore
import e4   from "../../../../sounds/piano/E4.mp3";
// @ts-ignore
import f4   from "../../../../sounds/piano/F4.mp3";
// @ts-ignore
import gb4  from "../../../../sounds/piano/Gb4.mp3";
// @ts-ignore
import g4   from "../../../../sounds/piano/G4.mp3";
// @ts-ignore
import ab4  from "../../../../sounds/piano/Ab4.mp3";
// @ts-ignore
import a4   from "../../../../sounds/piano/A4.mp3";
// @ts-ignore
import bb4  from "../../../../sounds/piano/Bb4.mp3";
// @ts-ignore
import b4   from "../../../../sounds/piano/B4.mp3";
// @ts-ignore
import c5   from "../../../../sounds/piano/C5.mp3";
// @ts-ignore
import db5  from "../../../../sounds/piano/Db5.mp3";
// @ts-ignore
import d5   from "../../../../sounds/piano/D5.mp3";
// @ts-ignore
import eb5  from "../../../../sounds/piano/Eb5.mp3";
// @ts-ignore
import e5   from "../../../../sounds/piano/E5.mp3";
// @ts-ignore
import f5   from "../../../../sounds/piano/F5.mp3";
// @ts-ignore
import gb5  from "../../../../sounds/piano/Gb5.mp3";
// @ts-ignore
import g5   from "../../../../sounds/piano/G5.mp3";
// @ts-ignore
import ab5  from "../../../../sounds/piano/Ab5.mp3";
// @ts-ignore
import a5   from "../../../../sounds/piano/A5.mp3";
// @ts-ignore
import bb5  from "../../../../sounds/piano/Bb5.mp3";
// @ts-ignore
import b5   from "../../../../sounds/piano/B5.mp3";

import { AudioControllerComponent } from '../../../components/audio-controller-component/audio-controller.component';
import { EqualizerComponent } from '../../../components/equalizer-component/equalizer.component';
import { SoundManager } from '../../../../sound-manager/sound-manager';
import { SoundManagerConfig } from '../../../../sound-manager/sound-manager-config';
import { SoundEventsEnum } from '../../../../sound-manager/sound-events.enum';
import { LocalStorageManagerManager } from '../../../services/local-storage-manager';

interface NoteDefinition {
  id: string;
  label: string;
  displayLabel: string;
  sharp: boolean;
  url: string;
  key: string;
  keyLabel: string;
  frequency: number;
}

const NOTES: NoteDefinition[] = [
  { id: 'piano-C4',  label: 'C4',  displayLabel: 'C',  sharp: false, url: c4,  key: 'a',          keyLabel: 'A', frequency: 261.63 },
  { id: 'piano-Db4', label: 'C#4', displayLabel: 'C#', sharp: true,  url: db4, key: 'w',          keyLabel: 'W', frequency: 277.18 },
  { id: 'piano-D4',  label: 'D4',  displayLabel: 'D',  sharp: false, url: d4,  key: 's',          keyLabel: 'S', frequency: 293.66 },
  { id: 'piano-Eb4', label: 'D#4', displayLabel: 'D#', sharp: true,  url: eb4, key: 'e',          keyLabel: 'E', frequency: 311.13 },
  { id: 'piano-E4',  label: 'E4',  displayLabel: 'E',  sharp: false, url: e4,  key: 'd',          keyLabel: 'D', frequency: 329.63 },
  { id: 'piano-F4',  label: 'F4',  displayLabel: 'F',  sharp: false, url: f4,  key: 'f',          keyLabel: 'F', frequency: 349.23 },
  { id: 'piano-Gb4', label: 'F#4', displayLabel: 'F#', sharp: true,  url: gb4, key: 't',          keyLabel: 'T', frequency: 369.99 },
  { id: 'piano-G4',  label: 'G4',  displayLabel: 'G',  sharp: false, url: g4,  key: 'g',          keyLabel: 'G', frequency: 392.00 },
  { id: 'piano-Ab4', label: 'G#4', displayLabel: 'G#', sharp: true,  url: ab4, key: 'y',          keyLabel: 'Y', frequency: 415.30 },
  { id: 'piano-A4',  label: 'A4',  displayLabel: 'A',  sharp: false, url: a4,  key: 'h',          keyLabel: 'H', frequency: 440.00 },
  { id: 'piano-Bb4', label: 'A#4', displayLabel: 'A#', sharp: true,  url: bb4, key: 'u',          keyLabel: 'U', frequency: 466.16 },
  { id: 'piano-B4',  label: 'B4',  displayLabel: 'B',  sharp: false, url: b4,  key: 'j',          keyLabel: 'J', frequency: 493.88 },
  { id: 'piano-C5',  label: 'C5',  displayLabel: 'C',  sharp: false, url: c5,  key: 'k',          keyLabel: 'K', frequency: 523.25 },
  { id: 'piano-Db5', label: 'C#5', displayLabel: 'C#', sharp: true,  url: db5, key: 'o',          keyLabel: 'O', frequency: 554.37 },
  { id: 'piano-D5',  label: 'D5',  displayLabel: 'D',  sharp: false, url: d5,  key: 'l',          keyLabel: 'L', frequency: 587.33 },
  { id: 'piano-Eb5', label: 'D#5', displayLabel: 'D#', sharp: true,  url: eb5, key: 'p',          keyLabel: 'P', frequency: 622.25 },
  { id: 'piano-E5',  label: 'E5',  displayLabel: 'E',  sharp: false, url: e5,  key: ';',          keyLabel: ';', frequency: 659.25 },
  { id: 'piano-F5',  label: 'F5',  displayLabel: 'F',  sharp: false, url: f5,  key: "'",          keyLabel: "'", frequency: 698.46 },
  { id: 'piano-Gb5', label: 'F#5', displayLabel: 'F#', sharp: true,  url: gb5, key: '[',          keyLabel: '[', frequency: 739.99 },
  { id: 'piano-G5',  label: 'G5',  displayLabel: 'G',  sharp: false, url: g5,  key: 'z',          keyLabel: 'Z', frequency: 783.99 },
  { id: 'piano-Ab5', label: 'G#5', displayLabel: 'G#', sharp: true,  url: ab5, key: ']',          keyLabel: ']', frequency: 830.61 },
  { id: 'piano-A5',  label: 'A5',  displayLabel: 'A',  sharp: false, url: a5,  key: 'x',          keyLabel: 'X', frequency: 880.00 },
  { id: 'piano-Bb5', label: 'A#5', displayLabel: 'A#', sharp: true,  url: bb5, key: 'v',          keyLabel: 'V', frequency: 932.33 },
  { id: 'piano-B5',  label: 'B5',  displayLabel: 'B',  sharp: false, url: b5,  key: 'c',          keyLabel: 'C', frequency: 987.77 },
];

const KEY_TO_NOTE = new Map<string, NoteDefinition>(NOTES.map(n => [n.key, n]));

type SoundEngineType = 'piano' | 'synthesizer';

// ── Synthesis engine ──────────────────────────────────────────────────────────

interface ActiveSynthVoice {
  oscillator: OscillatorNode;
  gainNode: GainNode;
  noteId: string;
  startedAt: number;
}

interface SynthAnimState {
  el: HTMLElement;
  noteId: string;
  instanceId: string;
  startedAt: number;
  released: boolean;
  releasedAt: number;
  rafId: number;
}

class SynthEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private outputGain: GainNode;
  private activeVoices = new Map<string, ActiveSynthVoice>();
  private volume = 1;

  /**
   * A sawtooth at full amplitude peaks at 0 dBFS, while the sampled piano notes
   * peak around -21 dBFS. Without this trim the synthesizer came out roughly ten
   * times louder than the piano. Kept separate from masterGain so the volume
   * slider still spans its full range on top of it.
   */
  private static readonly OUTPUT_TRIM = 0.12;

  // ADSR in seconds
  private attack = 0.02;
  private decay = 0.08;
  private sustain = 0.7;
  private release = 0.4;
  private waveform: OscillatorType = 'sawtooth';

  /**
   * @param destination Entry point of the SoundManager master chain. The synth used
   *   to connect straight to ctx.destination, which bypassed master volume, mute,
   *   panning and the limiter, so it was the one source on this page that could
   *   still clip and that the master controls did not affect.
   */
  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = this.volume;

    this.outputGain = ctx.createGain();
    this.outputGain.gain.value = SynthEngine.OUTPUT_TRIM;

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

  noteOn(noteId: string, frequency: number): void {
    // Stop existing voice for this note if still active
    this.noteOff(noteId);

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = this.waveform;
    osc.frequency.setValueAtTime(frequency, now);

    // ADSR envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + this.attack);
    gain.gain.setTargetAtTime(this.sustain, now + this.attack, this.decay);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);

    this.activeVoices.set(noteId, {
      oscillator: osc,
      gainNode: gain,
      noteId,
      startedAt: now,
    });
  }

  noteOff(noteId: string): void {
    const voice = this.activeVoices.get(noteId);
    if (!voice) return;

    const now = this.ctx.currentTime;
    const { oscillator, gainNode } = voice;

    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(0, now + this.release);

    oscillator.stop(now + this.release + 0.05);

    // Clean up after release
    setTimeout(() => {
      try { oscillator.disconnect(); } catch { /* already disconnected */ }
      try { gainNode.disconnect(); } catch { /* already disconnected */ }
    }, (this.release + 0.1) * 1000);

    this.activeVoices.delete(noteId);
  }

  stopAll(): void {
    this.activeVoices.forEach((_voice, noteId) => {
      this.noteOff(noteId);
    });
  }

  destroy(): void {
    this.stopAll();
    this.masterGain.disconnect();
    this.outputGain.disconnect();
  }
}

// ── Piano Demo ───────────────────────────────────────────────────────────────

export class PianoDemo {
  private soundManager: SoundManager;
  private synthEngine: SynthEngine;
  private pressedKeys = new Set<string>();
  private keyElements = new Map<string, HTMLElement>();
  private noteDurations = new Map<string, number>();
  private instanceCount = new Map<string, number>();
  private currentEngine: SoundEngineType = 'piano';
  private globalVolume = 1;
  private soundSelect: HTMLSelectElement | null = null;
  private volumeSliderTrack: HTMLElement | null = null;
  private volumeSliderFill: HTMLElement | null = null;
  private volumeSliderThumb: HTMLElement | null = null;
  private volumeValueDisplay: HTMLElement | null = null;
  private volumeSliderContainer: HTMLElement | null = null;
  private isDraggingSlider = false;
  private draggedNotes = new Set<string>();
  private activeSynthAnims = new Map<string, SynthAnimState>();
  private synthNoteToAnimInstance = new Map<string, string>();
  private soundInstanceToAnim = new Map<string, string>(); // SoundManager instanceId → demo animation instanceId
  private equalizer: EqualizerComponent | null = null;

  constructor() {
    const config: SoundManagerConfig = {
      createNewInstance: true,
      autoMuteOnHidden: true,
      autoResumeOnFocus: true,
      loopSounds: false,
      trackProgress: true,
      debug: false,
      defaultVolume: 1,
      // Every key press adds another instance at full volume. Four or five notes
      // together sum past full scale and the destination hard-clips them, which
      // is audible as crackle. The limiter holds those peaks back instead.
      masterLimiter: true,
    };
    this.soundManager = new SoundManager(config);
    // Route the synth through the master chain so it shares the limiter, master
    // volume, mute and panning with the sampled piano
    this.synthEngine = new SynthEngine(
      this.soundManager.getContext(),
      this.soundManager.getMasterInput()
    );
    this.initAudioController();
    this.initEqualizer();
    this.initTheme();
    this.init();
  }

  private initAudioController(): void {
    const controllerEl = document.getElementById('multichannelAudioController');
    if (controllerEl) {
      new AudioControllerComponent(controllerEl);
    }
  }

  private initEqualizer(): void {
    const controllerEl = document.getElementById('multichannelAudioController');
    if (controllerEl) {
      const audioCtx = this.soundManager.getContext();
      const analyser = audioCtx.createAnalyser();
      // The synth now runs through the master chain too, so tapping the master
      // output alone covers both engines. Tapping the synth separately would
      // count it twice in the visualisation.
      this.soundManager.getMasterOutput().connect(analyser);
      this.equalizer = new EqualizerComponent(controllerEl, analyser);
    }
  }

  private initTheme(): void {
    const body = document.body;
    const toggle = document.getElementById('themeToggle') as HTMLInputElement;
    const stored = LocalStorageManagerManager.getItem('sound-manager-ts-demo-theme');
    if (!stored) {
      LocalStorageManagerManager.setItem('sound-manager-ts-demo-theme',
        window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
    const isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    body.classList.toggle('dark-theme', isDark);
    if (toggle) toggle.checked = isDark;
    if (toggle) {
      toggle.addEventListener('change', function () {
        body.classList.toggle('dark-theme', this.checked);
        LocalStorageManagerManager.setItem('sound-manager-ts-demo-theme', this.checked ? 'dark' : 'light');
      });
    }
  }

  private async init(): Promise<void> {
    const container = document.getElementById('pianoContainer')!;
    container.innerHTML = `
      <div class="piano-loading control-group">
        <div class="piano-loading-inner">
          <span class="spinner"></span>
          <span>Loading piano samples…</span>
        </div>
      </div>
    `;

    await this.soundManager.loadSounds(NOTES.map(n => ({ id: n.id, url: n.url })));

    NOTES.forEach(n => {
      const dur = this.soundManager.getDuration(n.id);
      this.noteDurations.set(n.id, dur ?? 2);
      this.instanceCount.set(n.id, 0);
    });

    container.innerHTML = '';
    this.buildUI(container);
    this.bindEvents();
  }

  private buildUI(container: HTMLElement): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'control-group piano-wrapper';
    wrapper.innerHTML = `
      <div class="piano-controls-bar">
        <div style="display:flex;align-items:center;gap:6px;">
          <label class="sound-select-label" for="soundSelect">Sound:</label>
          <select class="sound-select" id="soundSelect">
            <option value="piano">🎹 Piano</option>
            <option value="synthesizer">🎛️ Synthesizer</option>
          </select>
        </div>
        <div class="volume-slider-container">
          <span class="volume-slider-label">Volume</span>
          <div class="volume-slider-track" id="volumeSliderTrack">
            <div class="volume-slider-fill" id="volumeSliderFill"></div>
            <div class="volume-slider-thumb" id="volumeSliderThumb"></div>
          </div>
          <span class="volume-slider-value" id="volumeSliderValue">100%</span>
        </div>
      </div>
      <div class="piano-hint">
        <span class="piano-hint-label">Keyboard shortcuts</span>
        <div class="piano-hint-keys">
          <span class="hint-row"><span class="hint-chip white-chip">A S D F G H J</span> white keys octave 4</span>
          <span class="hint-row"><span class="hint-chip black-chip">W E T Y U</span> black keys octave 4</span>
          <span class="hint-row"><span class="hint-chip white-chip">K L ; ' Z X C</span> white keys octave 5</span>
          <span class="hint-row"><span class="hint-chip black-chip">O P [ ] V</span> black keys octave 5</span>
        </div>
      </div>
      <div class="piano-stage">
        <div class="piano-keyboard" id="pianoKeyboard"></div>
      </div>
    `;
    container.appendChild(wrapper);

    // Populate info panel with explanation and code snippet
    this.buildInfoPanel();

    const keyboard = wrapper.querySelector<HTMLElement>('#pianoKeyboard')!;
    this.buildKeyboard(keyboard);

    // Cache DOM references for controls
    this.soundSelect = wrapper.querySelector<HTMLSelectElement>('#soundSelect')!;
    this.volumeSliderTrack = wrapper.querySelector<HTMLElement>('#volumeSliderTrack')!;
    this.volumeSliderFill = wrapper.querySelector<HTMLElement>('#volumeSliderFill')!;
    this.volumeSliderThumb = wrapper.querySelector<HTMLElement>('#volumeSliderThumb')!;
    this.volumeValueDisplay = wrapper.querySelector<HTMLElement>('#volumeSliderValue')!;
    this.volumeSliderContainer = wrapper.querySelector<HTMLElement>('.volume-slider-container')!;

    // Update slider visual
    this.updateSliderVisual();

    // Bind sound selector
    this.soundSelect.addEventListener('change', () => {
      this.switchEngine(this.soundSelect!.value as SoundEngineType);
    });
  }

  // ── Volume slider ────────────────────────────────────────────────────────

  private updateSliderVisual(): void {
    if (!this.volumeSliderFill || !this.volumeSliderThumb || !this.volumeValueDisplay) return;
    const percent = Math.round(this.globalVolume * 100);
    this.volumeSliderFill.style.width = `${percent}%`;
    this.volumeSliderThumb.style.left = `${percent}%`;
    this.volumeValueDisplay.textContent = `${percent}%`;
  }

  private sliderPositionToVolume(trackLeft: number, trackWidth: number, clientX: number): number {
    const relativeX = clientX - trackLeft;
    // Left of track = volume 0, right = volume 1
    return Math.max(0, Math.min(1, relativeX / trackWidth));
  }

  private setVolume(vol: number): void {
    this.globalVolume = Math.max(0, Math.min(1, Math.round(vol * 10000) / 10000));
    this.soundManager.setGlobalVolume(this.globalVolume);
    // Scale synth volume to 60% so it sits better relative to piano samples
    this.synthEngine.setVolume(Math.round(this.globalVolume * 0.6 * 10000) / 10000);
    this.updateSliderVisual();
  }

  private onSliderPointerDown(e: PointerEvent): void {
    e.preventDefault();
    this.isDraggingSlider = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    // Immediately update volume to click position
    if (this.volumeSliderTrack) {
      const rect = this.volumeSliderTrack.getBoundingClientRect();
      const vol = this.sliderPositionToVolume(rect.left, rect.width, e.clientX);
      this.setVolume(vol);
    }
  }

  private onSliderPointerMove(e: PointerEvent): void {
    if (!this.isDraggingSlider || !this.volumeSliderTrack) return;
    const rect = this.volumeSliderTrack.getBoundingClientRect();
    const vol = this.sliderPositionToVolume(rect.left, rect.width, e.clientX);
    this.setVolume(vol);
  }

  private onSliderPointerUp(_e: PointerEvent): void {
    this.isDraggingSlider = false;
  }

  private onSliderWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.02 : 0.02;
    this.setVolume(this.globalVolume + delta);
  }

  // ── Engine switching ─────────────────────────────────────────────────────

  private switchEngine(engine: SoundEngineType): void {
    if (engine === this.currentEngine) return;
    // Stop all currently playing sounds
    if (this.currentEngine === 'piano') {
      this.soundManager.stopAllSounds();
    } else {
      this.synthEngine.stopAll();
    }
    // Clear active key states
    this.keyElements.forEach(el => el.classList.remove('active'));
    this.draggedNotes.clear();
    this.currentEngine = engine;
    gtag('event', 'piano_engine_switch', { engine: engine, demo: 'multichannel' });
    // Blur the dropdown so keyboard events reach the piano again
    this.soundSelect?.blur();
  }

  // ── Info panel ───────────────────────────────────────────────────────────

  private buildInfoPanel(): void {
    const infoPanel = document.getElementById('pianoInfo');
    if (!infoPanel) return;

    const codeSnippet = `// 1️⃣ Create SoundManager with multichannel config
const manager = new SoundManager({
  createNewInstance: true, // each play() creates a new independent instance

  // 🔊 Why masterLimiter matters here:
  // Every key press adds another instance playing at full volume. Audio signals
  // add up, so five notes together reach roughly five times full scale. The
  // output can only carry up to 1.0, so everything above that gets chopped off
  // — you hear that as crackle, worst on the sharp attack of each note.
  //
  // The limiter sits last in the chain and holds those peaks back instead of
  // letting them clip. Below the threshold nothing is touched, so single notes
  // sound exactly the same. It is off by default; turn it on whenever sounds
  // can overlap.
  masterLimiter: true,
});

// Toggle it at runtime to hear the difference (playback is not interrupted):
// manager.setMasterLimiter(false);
//
// Read how hard it is working, in dB of gain reduction:
// manager.getMasterLimiterNode()?.reduction;

// 2️⃣ Load all piano samples
await manager.loadSounds([
  { id: 'piano-C4', url: 'C4.mp3' },
  { id: 'piano-D4', url: 'D4.mp3' },
  // ... more notes
]);

// Track which sound instance belongs to which animation element
const instanceMap = new Map();

// 3️⃣ Play a note — play() returns a Sound with a unique id per instance,
//    so pressing the same key twice gives two independent instances
function onKeyPress(noteId: string): void {
  const instance = manager.play(noteId);
  if (instance) {
    const animEl = spawnNoteAnimation(noteId); // create floating ♪ element
    instanceMap.set(instance.id, animEl);
  }
}

// 4️⃣ Listen to PROGRESS — use event.instanceId (not soundId!)
//    so each instance drives its own animation independently
manager.addEventListener(
  SoundEventsEnum.PROGRESS,
  (event) => {
    if (!event.instanceId) return;
    const animEl = instanceMap.get(event.instanceId);
    if (animEl) {
      updateAnimation(animEl, event.progress); // progress: 0.0 → 1.0
    }
  }
);

// 5️⃣ Listen to ENDED — clean up only the finished instance's animation
manager.addEventListener(
  SoundEventsEnum.ENDED,
  (event) => {
    if (!event.instanceId) return;
    const animEl = instanceMap.get(event.instanceId);
    if (animEl) {
      cleanupAnimation(animEl);
      instanceMap.delete(event.instanceId);
    }
  }
);`;

    infoPanel.innerHTML = `
      <h3>🎹 Multichannel Audio</h3>
      <p>
        This piano uses <strong>multichannel audio</strong> via the
        <code>createNewInstance: true</code> option. Each keystroke
        starts a <em>new sound instance</em>, allowing you to hear multiple
        notes simultaneously without cutting off the previous one.
        This makes it sound like a real instrument.
      </p>
      <p>
        With the <code>SoundEventsEnum.PROGRESS</code> event you can track
        in real-time how far a sound is through playback (ratio from 0 to 1).
        This allows you to synchronize animations like the floating notes
        live with the playback position of the sound.
      </p>
      <p>
        The <code>SoundEventsEnum.ENDED</code> event indicates when
        a note has completely finished, so you can clean up the animation
        properly.
      </p>
      <div class="info-code-block">
        <pre><code class="language-typescript">${this.escapeHtml(codeSnippet)}</code></pre>
      </div>
    `;

    const codeEl = infoPanel.querySelector<HTMLElement>('pre code');
    if (codeEl) hljs.highlightElement(codeEl);
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#039;');
  }

  // ── Keyboard building ────────────────────────────────────────────────────

  private buildKeyboard(keyboard: HTMLElement): void {
    const whiteNotes = NOTES.filter(n => !n.sharp);
    const blackNotes = NOTES.filter(n => n.sharp);

    // White keys container
    const whiteContainer = document.createElement('div');
    whiteContainer.className = 'piano-white-keys';

    whiteNotes.forEach(note => {
      const key = document.createElement('div');
      key.className = 'piano-key piano-key--white';
      key.dataset.noteId = note.id;
      key.innerHTML = `
        <span class="key-shortcut">${note.keyLabel}</span>
        <span class="key-label">${note.displayLabel}<sub>${note.label.slice(-1)}</sub></span>
      `;
      whiteContainer.appendChild(key);
      this.keyElements.set(note.id, key);
    });

    keyboard.appendChild(whiteContainer);

    // Black keys — positioned absolutely over the white keys
    const blackContainer = document.createElement('div');
    blackContainer.className = 'piano-black-keys';

    const blackOffsets: Record<string, number> = {
      'piano-Db4': 0.65,
      'piano-Eb4': 1.65,
      'piano-Gb4': 3.65,
      'piano-Ab4': 4.65,
      'piano-Bb4': 5.65,
      'piano-Db5': 7.65,
      'piano-Eb5': 8.65,
      'piano-Gb5': 10.65,
      'piano-Ab5': 11.65,
      'piano-Bb5': 12.65,
    };

    blackNotes.forEach(note => {
      const key = document.createElement('div');
      key.className = 'piano-key piano-key--black';
      key.dataset.noteId = note.id;
      const offset = blackOffsets[note.id] ?? 0;
      key.style.setProperty('--black-offset', String(offset));
      key.innerHTML = `
        <span class="key-shortcut">${note.keyLabel}</span>
        <span class="key-label">${note.displayLabel}</span>
      `;
      blackContainer.appendChild(key);
      this.keyElements.set(note.id, key);
    });

    keyboard.appendChild(blackContainer);
  }

  // ── Events ───────────────────────────────────────────────────────────────

  private bindEvents(): void {
    // Mouse / touch on keys
    this.keyElements.forEach((el, noteId) => {
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.draggedNotes.add(noteId);
        this.triggerNoteStart(noteId, el);
      });
      el.addEventListener('pointerenter', (e) => {
        if (!(e.buttons & 1)) return;
        if (this.draggedNotes.has(noteId)) return;
        this.draggedNotes.add(noteId);
        this.triggerNoteStart(noteId, el);
      });
      el.addEventListener('pointerup', (e) => {
        e.preventDefault();
        this.draggedNotes.delete(noteId);
        this.triggerNoteEnd(noteId, el);
      });
      el.addEventListener('pointerleave', () => {
        this.draggedNotes.delete(noteId);
        this.triggerNoteEnd(noteId, el);
      });
    });

    // Global pointerup to catch mouse release outside the keyboard
    document.addEventListener('pointerup', () => {
      this.draggedNotes.forEach((noteId) => {
        const el = this.keyElements.get(noteId);
        if (el) this.triggerNoteEnd(noteId, el);
      });
      this.draggedNotes.clear();
    });

    // Keyboard input
    document.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.target === this.soundSelect) return;
      const key = e.key.toLowerCase();
      const note = KEY_TO_NOTE.get(key);
      if (!note) return;
      e.preventDefault();
      this.pressedKeys.add(key);
      const el = this.keyElements.get(note.id);
      if (el) this.triggerNoteStart(note.id, el);
    });

    document.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      this.pressedKeys.delete(key);
      const note = KEY_TO_NOTE.get(key);
      if (!note) return;
      const el = this.keyElements.get(note.id);
      if (el) this.triggerNoteEnd(note.id, el);
    });

    // Volume slider events
    if (this.volumeSliderTrack) {
      this.volumeSliderTrack.addEventListener('pointerdown', this.onSliderPointerDown.bind(this));
      this.volumeSliderTrack.addEventListener('pointermove', this.onSliderPointerMove.bind(this));
      this.volumeSliderTrack.addEventListener('pointerup', this.onSliderPointerUp.bind(this));
      this.volumeSliderTrack.addEventListener('pointercancel', this.onSliderPointerUp.bind(this));
    }
    if (this.volumeSliderContainer) {
      this.volumeSliderContainer.addEventListener('wheel', this.onSliderWheel.bind(this), { passive: false });
    }

    // Global PROGRESS event — dispatch to the correct animation instance using the instanceId mapping
    this.soundManager.addEventListener(SoundEventsEnum.PROGRESS, (soundEvent) => {
      if (soundEvent.instanceId && soundEvent.progress !== undefined) {
        const animInstanceId = this.soundInstanceToAnim.get(soundEvent.instanceId);
        if (animInstanceId) {
          this.updateNoteAnimationProgress(animInstanceId, soundEvent.progress);
        }
      }
    });

    // Global ENDED event — clean up the mapped animation
    this.soundManager.addEventListener(SoundEventsEnum.ENDED, (soundEvent) => {
      if (soundEvent.instanceId) {
        const animInstanceId = this.soundInstanceToAnim.get(soundEvent.instanceId);
        if (animInstanceId) {
          this.cleanupAnimation(animInstanceId);
          this.soundInstanceToAnim.delete(soundEvent.instanceId);
        }
      }
    });
  }

  // ── Note triggering ──────────────────────────────────────────────────────

  private triggerNoteStart(noteId: string, keyEl: HTMLElement): void {
    if (this.currentEngine === 'piano') {
      let soundInstance: import('../../../../sound-manager/sound.interface').Sound | undefined;
      try {
        soundInstance = this.soundManager.play(noteId);
      } catch {
        return;
      }

      if (soundInstance) {
        const count = (this.instanceCount.get(noteId) ?? 0) + 1;
        this.instanceCount.set(noteId, count);
        const animInstanceId = `${noteId}-${count}`;
        this.soundInstanceToAnim.set(soundInstance.id, animInstanceId);
        this.spawnNoteAnimation(noteId, keyEl, animInstanceId);

        // Safety fallback: cleanup after duration + buffer
        const duration = this.noteDurations.get(noteId) ?? 2;
        setTimeout(() => {
          if (this.soundInstanceToAnim.has(soundInstance!.id)) {
            this.cleanupAnimation(animInstanceId);
            this.soundInstanceToAnim.delete(soundInstance!.id);
          }
        }, (duration + 0.5) * 1000);
      }
    } else {
      const note = NOTES.find(n => n.id === noteId);
      if (!note) return;
      this.synthEngine.noteOn(noteId, note.frequency);

      // Synthesizer: spawn animation that tracks hold duration
      const instanceId = `synth-${noteId}-${Date.now()}`;
      this.spawnNoteAnimation(noteId, keyEl, instanceId);
      this.synthNoteToAnimInstance.set(noteId, instanceId);

      // Register for hold-tracking via requestAnimationFrame
      const el = document.getElementById(`anim-${instanceId}`);
      if (el) {
        this.startSynthAnimLoop(instanceId, el);
      }
    }

    keyEl.classList.add('active');
  }

  private triggerNoteEnd(noteId: string, keyEl: HTMLElement): void {
    // Remove active class immediately
    keyEl.classList.remove('active');

    if (this.currentEngine === 'synthesizer') {
      this.synthEngine.noteOff(noteId);
      // Release the visual animation for this note
      const animInstId = this.synthNoteToAnimInstance.get(noteId);
      if (animInstId) {
        this.releaseSynthAnimation(animInstId);
        this.synthNoteToAnimInstance.delete(noteId);
      }
    }
    // For piano, note plays out on its own — but remove visual immediately
  }

  // ── Animation helpers ────────────────────────────────────────────────────

  private startSynthAnimLoop(instanceId: string, el: HTMLElement): void {
    const startedAt = performance.now();
    const state: SynthAnimState = {
      el,
      noteId: '',
      instanceId,
      startedAt,
      released: false,
      releasedAt: 0,
      rafId: 0,
    };
    this.activeSynthAnims.set(instanceId, state);

    const tick = (now: number): void => {
      const st = this.activeSynthAnims.get(instanceId);
      if (!st) return;

      const SYNTH_HOLD_HEIGHT = -84;   // max height reached during hold (60% of full -140)
      const SYNTH_FULL_HEIGHT = -140;  // full release height
      const HOLD_RISE_DURATION = 400;  // ms to reach hold height after attack

      if (!st.released) {
        // During hold: slowly rise to hold height (simulating sustain phase)
        const elapsed = now - st.startedAt;
        const t = Math.min(elapsed / HOLD_RISE_DURATION, 1);
        const yOffset = SYNTH_HOLD_HEIGHT * t;
        const opacity = 1 - t * 0.15; // slight fade during hold
        el.style.transform = `translateX(-50%) translateY(${yOffset}px)`;
        el.style.opacity = `${Math.max(0.7, Math.min(1, opacity))}`;
        st.rafId = requestAnimationFrame(tick);
      } else {
        // During release: move from current position to full height + fade out
        const releaseElapsed = now - st.releasedAt;
        const RELEASE_DURATION = 400; // ms — matches synth engine release time
        const t = Math.min(releaseElapsed / RELEASE_DURATION, 1);

        // Interpolate from hold height to full height
        const yOffset = SYNTH_HOLD_HEIGHT + (SYNTH_FULL_HEIGHT - SYNTH_HOLD_HEIGHT) * t;
        const opacity = 0.85 - t * 0.85; // fade from 0.85 to 0
        el.style.transform = `translateX(-50%) translateY(${yOffset}px)`;
        el.style.opacity = `${Math.max(0, Math.min(1, opacity))}`;

        if (t >= 1) {
          // Animation complete clean up
          el.style.transition = 'opacity 0.2s ease-out';
          el.style.opacity = '0';
          setTimeout(() => el.remove(), 250);
          this.activeSynthAnims.delete(instanceId);
          return;
        }
        st.rafId = requestAnimationFrame(tick);
      }
    };

    state.rafId = requestAnimationFrame(tick);
  }

  private releaseSynthAnimation(instanceId: string): void {
    const st = this.activeSynthAnims.get(instanceId);
    if (!st || st.released) return;

    st.released = true;
    st.releasedAt = performance.now();
  }

  private spawnNoteAnimation(noteId: string, keyEl: HTMLElement, instanceId: string): void {
    const note = NOTES.find(n => n.id === noteId);
    if (!note) return;

    const stage = document.querySelector<HTMLElement>('.piano-stage');
    if (!stage) return;

    const keyRect = keyEl.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();

    const anim = document.createElement('div');
    anim.className = 'note-anim';
    anim.id = `anim-${instanceId}`;
    anim.style.left = `${keyRect.left - stageRect.left + keyRect.width / 2}px`;
    anim.style.top = `${keyRect.top - stageRect.top}px`;
    anim.innerHTML = `<span class="note-anim-icon">♪</span><span class="note-anim-label">${note.label}</span>`;

    stage.appendChild(anim);
  }

  private updateNoteAnimationProgress(instanceId: string, progress: number): void {
    const el = document.getElementById(`anim-${instanceId}`);
    if (!el) return;

    // Two-phase animation matching the synthesizer hold/release feel:
    // First 60% of audio → hold phase: rise to -84px with minimal fade
    // Last 40% of audio  → release phase: continue to -140px and fade out
    const HOLD_THRESHOLD = 0.6;
    const HOLD_HEIGHT = -84;
    const FULL_HEIGHT = -140;

    let yOffset: number;
    let opacity: number;

    if (progress <= HOLD_THRESHOLD) {
      // Hold phase: 0 → -84px, opacity stays near 1.0 (slight fade to 0.85)
      const t = progress / HOLD_THRESHOLD;
      yOffset = HOLD_HEIGHT * t;
      opacity = 1 - t * 0.15;
    } else {
      // Release phase: -84 → -140px, fade from 0.85 → 0
      const t = (progress - HOLD_THRESHOLD) / (1 - HOLD_THRESHOLD);
      yOffset = HOLD_HEIGHT + (FULL_HEIGHT - HOLD_HEIGHT) * t;
      opacity = 0.85 - t * 0.85;
    }

    el.style.transform = `translateX(-50%) translateY(${yOffset}px)`;
    el.style.opacity = `${Math.max(0, Math.min(1, opacity))}`;
  }

  private cleanupAnimation(instanceId: string): void {
    const el = document.getElementById(`anim-${instanceId}`);
    if (!el) return;
    // Fade out quickly before removing
    el.style.transition = 'opacity 0.3s ease-out';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 350);
  }
}