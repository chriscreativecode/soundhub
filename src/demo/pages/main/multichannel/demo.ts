import "../../../shared.css";
import "./demo.css";

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

class SynthEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private activeVoices = new Map<string, ActiveSynthVoice>();
  private volume = 1;

  // ADSR in seconds
  private attack = 0.02;
  private decay = 0.08;
  private sustain = 0.7;
  private release = 0.4;
  private waveform: OscillatorType = 'sawtooth';

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(ctx.destination);
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
  private volumeKnob: HTMLElement | null = null;
  private volumeKnobIndicator: HTMLElement | null = null;
  private volumeValueDisplay: HTMLElement | null = null;
  private volumeKnobContainer: HTMLElement | null = null;
  private isDraggingKnob = false;

  constructor() {
    const config: SoundManagerConfig = {
      createNewInstance: true,
      autoMuteOnHidden: true,
      autoResumeOnFocus: true,
      loopSounds: false,
      trackProgress: false,
      debug: false,
      defaultVolume: 1,
    };
    this.soundManager = new SoundManager(config);
    this.synthEngine = new SynthEngine(this.soundManager.getContext());
    this.initTheme();
    this.init();
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
        <div class="volume-knob-container">
          <span class="volume-knob-label">Volume</span>
          <div class="volume-knob" id="volumeKnob">
            <div class="volume-knob-indicator" id="volumeKnobIndicator"></div>
            <div class="volume-knob-dot"></div>
          </div>
          <span class="volume-knob-value" id="volumeKnobValue">100%</span>
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

    const keyboard = wrapper.querySelector<HTMLElement>('#pianoKeyboard')!;
    this.buildKeyboard(keyboard);

    // Cache DOM references for controls
    this.soundSelect = wrapper.querySelector<HTMLSelectElement>('#soundSelect')!;
    this.volumeKnob = wrapper.querySelector<HTMLElement>('#volumeKnob')!;
    this.volumeKnobIndicator = wrapper.querySelector<HTMLElement>('#volumeKnobIndicator')!;
    this.volumeValueDisplay = wrapper.querySelector<HTMLElement>('#volumeKnobValue')!;
    this.volumeKnobContainer = wrapper.querySelector<HTMLElement>('.volume-knob-container')!;

    // Update knob visual
    this.updateKnobVisual();

    // Bind sound selector
    this.soundSelect.addEventListener('change', () => {
      this.switchEngine(this.soundSelect!.value as SoundEngineType);
    });
  }

  // ── Volume knob ──────────────────────────────────────────────────────────

  private updateKnobVisual(): void {
    if (!this.volumeKnobIndicator || !this.volumeValueDisplay) return;
    // Map volume 0..1 to angle -135..135 degrees (270° range)
    const angle = this.globalVolume * 270 - 135;
    this.volumeKnobIndicator.style.transform = `translate(-50%, -100%) rotate(${angle}deg)`;
    this.volumeValueDisplay.textContent = `${Math.round(this.globalVolume * 100)}%`;
  }

  private setVolume(vol: number): void {
    this.globalVolume = Math.max(0, Math.min(1, Math.round(vol * 10000) / 10000));
    this.soundManager.setGlobalVolume(this.globalVolume);
    this.synthEngine.setVolume(this.globalVolume);
    this.updateKnobVisual();
  }

  private onKnobPointerDown(e: PointerEvent): void {
    e.preventDefault();
    this.isDraggingKnob = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  private onKnobPointerMove(e: PointerEvent): void {
    if (!this.isDraggingKnob || !this.volumeKnob) return;
    const rect = this.volumeKnob.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    // Normalize delta to -1..1 range per 200px of vertical movement
    const delta = -(e.clientY - centerY) / 200;
    // Volume changes need fine control — use small steps
    this.setVolume(this.globalVolume + delta * 0.3);
  }

  private onKnobPointerUp(_e: PointerEvent): void {
    this.isDraggingKnob = false;
  }

  private onKnobWheel(e: WheelEvent): void {
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
    this.currentEngine = engine;
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
        this.triggerNoteStart(noteId, el);
      });
      el.addEventListener('pointerup', (e) => {
        e.preventDefault();
        this.triggerNoteEnd(noteId, el);
      });
      el.addEventListener('pointerleave', (e) => {
        // Only stop if pointer is captured (touch scenarios)
        if ((e.buttons & 1) === 0) {
          this.triggerNoteEnd(noteId, el);
        }
      });
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

    // Volume knob events
    if (this.volumeKnob) {
      this.volumeKnob.addEventListener('pointerdown', this.onKnobPointerDown.bind(this));
      this.volumeKnob.addEventListener('pointermove', this.onKnobPointerMove.bind(this));
      this.volumeKnob.addEventListener('pointerup', this.onKnobPointerUp.bind(this));
      this.volumeKnob.addEventListener('pointercancel', this.onKnobPointerUp.bind(this));
    }
    if (this.volumeKnobContainer) {
      this.volumeKnobContainer.addEventListener('wheel', this.onKnobWheel.bind(this), { passive: false });
    }
  }

  // ── Note triggering ──────────────────────────────────────────────────────

  private triggerNoteStart(noteId: string, keyEl: HTMLElement): void {
    if (this.currentEngine === 'piano') {
      try {
        this.soundManager.play(noteId);
      } catch {
        return;
      }
    } else {
      const note = NOTES.find(n => n.id === noteId);
      if (!note) return;
      this.synthEngine.noteOn(noteId, note.frequency);
    }

    keyEl.classList.add('active');

    // Note animation and cleanup logic (piano only: samples have a duration)
    if (this.currentEngine === 'piano') {
      const duration = this.noteDurations.get(noteId) ?? 2;
      const count = (this.instanceCount.get(noteId) ?? 0) + 1;
      this.instanceCount.set(noteId, count);
      const instanceId = `${noteId}-${count}`;

      this.spawnNoteAnimation(noteId, keyEl, duration, instanceId);

      const handler = (soundEvent: import('../../../../sound-manager/sound-event.interface').SoundEvent) => {
        if (soundEvent.soundId === noteId) {
          this.cleanupAnimation(instanceId);
          this.soundManager.removeEventListener(SoundEventsEnum.ENDED, handler);
        }
      };
      this.soundManager.addEventListener(SoundEventsEnum.ENDED, handler);
      setTimeout(() => this.cleanupAnimation(instanceId), (duration + 0.5) * 1000);
    } else {
      // Synthesizer: spawn a short animation
      this.spawnNoteAnimation(noteId, keyEl, 1.5, `synth-${noteId}-${Date.now()}`);
      setTimeout(() => {
        // Cleanup animation after a reasonable time
        const anims = document.querySelectorAll('[id^="anim-synth-"]');
        anims.forEach(a => ((a as HTMLElement).style.opacity = '0'));
        setTimeout(() => anims.forEach(a => a.remove()), 400);
      }, 1200);
    }
  }

  private triggerNoteEnd(noteId: string, keyEl: HTMLElement): void {
    // Remove active class immediately
    keyEl.classList.remove('active');

    if (this.currentEngine === 'synthesizer') {
      this.synthEngine.noteOff(noteId);
    }
    // For piano, note plays out on its own — but remove visual immediately
  }

  // ── Animation helpers ────────────────────────────────────────────────────

  private spawnNoteAnimation(noteId: string, keyEl: HTMLElement, duration: number, instanceId: string): void {
    const note = NOTES.find(n => n.id === noteId);
    if (!note) return;

    const stage = document.querySelector<HTMLElement>('.piano-stage');
    if (!stage) return;

    const keyRect = keyEl.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();

    const anim = document.createElement('div');
    anim.className = 'note-anim';
    anim.id = `anim-${instanceId}`;
    anim.style.setProperty('--duration', `${Math.min(duration, 4)}s`);
    anim.style.left = `${keyRect.left - stageRect.left + keyRect.width / 2}px`;
    anim.style.top = `${keyRect.top - stageRect.top}px`;
    anim.innerHTML = `<span class="note-anim-icon">♪</span><span class="note-anim-label">${note.label}</span>`;

    stage.appendChild(anim);
  }

  private cleanupAnimation(instanceId: string): void {
    const el = document.getElementById(`anim-${instanceId}`);
    if (el) el.remove();
  }
}