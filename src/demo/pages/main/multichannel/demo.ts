import "../../../shared.css";
import "./demo.css";

declare function gtag(...args: any[]): void;
import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';

hljs.registerLanguage('typescript', typescript);

import { AudioControllerComponent } from '../../../components/audio-controller-component/audio-controller.component';
import { EqualizerComponent } from '../../../components/equalizer-component/equalizer.component';
import { autoRangeProgress } from '../../../components/shared/range-input-utils';
import { SoundManager } from '../../../../sound-manager/sound-manager';
import { SoundManagerConfig } from '../../../../sound-manager/sound-manager-config';
import { SoundEventsEnum } from '../../../../sound-manager/sound-events.enum';
import { LocalStorageManagerManager } from '../../../services/local-storage-manager';

import { CHORDS, KEY_TO_NOTE, MELODIES, Melody, NOTE_BY_ID, NOTES, NoteDefinition } from './piano-data';
import { AdsrEnvelope, SynthEngine } from './synth-engine';
import { PerformanceRecorder, RecorderState } from './performance-recorder';

type SoundEngineType = 'piano' | 'synthesizer';

/** How long a sample takes to damp when the sustain pedal is up. */
const DAMPER_SECONDS = 0.22;

/**
 * Level meter scale. The samples peak at about -21 dBFS each, so a single note
 * lands halfway up and it takes a real cluster to reach the limiter. The
 * threshold matches the one SoundManager sets on its master limiter.
 */
const METER_FLOOR_DB = -48;
const METER_TOP_DB = 6;
const LIMITER_THRESHOLD_DB = -3;

/** Floating note travel, in pixels above the key. */
const NOTE_HOLD_HEIGHT = -84;
const NOTE_FULL_HEIGHT = -140;
const NOTE_HOLD_THRESHOLD = 0.6;
const SYNTH_HOLD_RISE_MS = 400;

const WAVEFORMS: Array<{ value: OscillatorType; label: string; path: string }> = [
  { value: 'sawtooth', label: 'Saw',      path: 'M1 15 L9 3 L9 15 L17 3 L17 15 L25 3 L25 15' },
  { value: 'square',   label: 'Square',   path: 'M1 15 L1 3 L7 3 L7 15 L13 15 L13 3 L19 3 L19 15 L25 15 L25 3' },
  { value: 'sine',     label: 'Sine',     path: 'M1 9 Q4 1 7 9 T13 9 T19 9 T25 9' },
  { value: 'triangle', label: 'Triangle', path: 'M1 15 L5 3 L9 15 L13 3 L17 15 L21 3 L25 15' },
];

interface SynthAnimState {
  el: HTMLElement;
  startedAt: number;
  released: boolean;
  releasedAt: number;
  releaseMs: number;
  rafId: number;
}

export class PianoDemo {
  private readonly soundManager: SoundManager;
  private readonly synthEngine: SynthEngine;
  private readonly recorder = new PerformanceRecorder();
  private equalizer: EqualizerComponent | null = null;
  private levelAnalyser: AnalyserNode | null = null;
  private levelBuffer: Float32Array<ArrayBuffer> | null = null;

  private currentEngine: SoundEngineType = 'piano';
  private globalVolume = 1;

  /** Pedal state kept per engine: a piano rings out by default, a synth does not. */
  private sustainLatched: Record<SoundEngineType, boolean> = { piano: true, synthesizer: false };
  private pedalDown = false;

  private readonly keyElements = new Map<string, HTMLElement>();
  private readonly heldKeyboardKeys = new Set<string>();
  private readonly pointerNotes = new Set<string>();

  /** Live SoundManager instances: instance id to the animation it drives. */
  private readonly sampleInstances = new Map<string, { noteId: string; animId: string }>();
  /** Newest live instance per note, so a key-up can damp the right one. */
  private readonly lastInstanceByNote = new Map<string, string>();
  private readonly synthAnims = new Map<string, SynthAnimState>();
  private animCounter = 0;

  private peakVoices = 0;
  private totalNotes = 0;

  private melodyTimers: number[] = [];
  private melodyPlaying = false;

  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Cached elements, all resolved once the console is built
  private stage: HTMLElement | null = null;
  private voiceCountEl: HTMLElement | null = null;
  private voiceDots: HTMLElement[] = [];
  private voicePeakEl: HTMLElement | null = null;
  private noteTotalEl: HTMLElement | null = null;
  private headroomFill: HTMLElement | null = null;
  private headroomValue: HTMLElement | null = null;
  private reductionFill: HTMLElement | null = null;
  private reductionValue: HTMLElement | null = null;
  private limiterSwitch: HTMLButtonElement | null = null;
  private sustainSwitch: HTMLButtonElement | null = null;
  private volumeInput: HTMLInputElement | null = null;
  private volumeReadout: HTMLElement | null = null;
  private melodySelect: HTMLSelectElement | null = null;
  private melodyButton: HTMLButtonElement | null = null;
  private melodyBlurb: HTMLElement | null = null;
  private recordButton: HTMLButtonElement | null = null;
  private recPlayButton: HTMLButtonElement | null = null;
  private recLoopButton: HTMLButtonElement | null = null;
  private recClearButton: HTMLButtonElement | null = null;
  private recStatus: HTMLElement | null = null;
  private recProgress: HTMLElement | null = null;
  private envelopePath: SVGPathElement | null = null;

  constructor() {
    const config: SoundManagerConfig = {
      createNewInstance: true,
      autoMuteOnHidden: true,
      autoResumeOnFocus: true,
      loopSounds: false,
      trackProgress: true,
      debug: false,
      defaultVolume: 1,
      // Instances add up rather than take turns. The piano samples are quiet
      // enough that even all 24 at once stop near -7 dBFS, but the synth engine
      // on this page can be driven well past full scale, and then the limiter is
      // the only thing between a chord and a hard-clipped output.
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
    this.initAnalysers();
    this.initTheme();
    this.initRecorder();
    void this.init();
  }

  // ── Bootstrapping ────────────────────────────────────────────────────────

  private initAudioController(): void {
    const controllerEl = document.getElementById('multichannelAudioController');
    if (controllerEl) new AudioControllerComponent(controllerEl);
  }

  private initAnalysers(): void {
    const audioCtx = this.soundManager.getContext();
    const controllerEl = document.getElementById('multichannelAudioController');

    if (controllerEl) {
      const analyser = audioCtx.createAnalyser();
      // The synth runs through the master chain too, so tapping the master
      // output alone covers both engines.
      this.soundManager.getMasterOutput().connect(analyser);
      this.equalizer = new EqualizerComponent(controllerEl, analyser);
    }

    // getMasterOutput() sits before the limiter, so this meter shows the level
    // that would have clipped if the limiter were not there.
    this.levelAnalyser = audioCtx.createAnalyser();
    this.levelAnalyser.fftSize = 1024;
    this.levelBuffer = new Float32Array(this.levelAnalyser.fftSize) as Float32Array<ArrayBuffer>;
    this.soundManager.getMasterOutput().connect(this.levelAnalyser);
  }

  private initTheme(): void {
    const body = document.body;
    const toggle = document.getElementById('themeToggle') as HTMLInputElement | null;
    const stored = LocalStorageManagerManager.getItem('sound-manager-ts-demo-theme');
    if (!stored) {
      LocalStorageManagerManager.setItem('sound-manager-ts-demo-theme',
        window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
    const isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    body.classList.toggle('dark-theme', isDark);
    if (toggle) {
      toggle.checked = isDark;
      toggle.addEventListener('change', () => {
        body.classList.toggle('dark-theme', toggle.checked);
        LocalStorageManagerManager.setItem('sound-manager-ts-demo-theme', toggle.checked ? 'dark' : 'light');
      });
    }
  }

  private initRecorder(): void {
    this.recorder.onNoteOn = (noteId) => this.triggerNoteStart(noteId, false);
    this.recorder.onNoteOff = (noteId) => this.triggerNoteEnd(noteId, false);
    this.recorder.onStateChange = () => this.renderRecorderState();
    this.recorder.onProgress = (ratio) => {
      if (!this.recProgress) return;
      this.recProgress.style.transform = `scaleX(${ratio < 0 ? 0 : ratio.toFixed(3)})`;
    };
  }

  private async init(): Promise<void> {
    const container = document.getElementById('pianoConsole')!;
    container.innerHTML = this.loadingMarkup();

    await this.soundManager.loadSounds(NOTES.map(n => ({ id: n.id, url: n.url })));

    container.classList.remove('is-loading');
    container.innerHTML = this.consoleMarkup();
    this.cacheElements(container);
    this.buildKeyboard(container.querySelector<HTMLElement>('#pianoKeyboard')!);
    this.bindEvents(container);
    this.renderEngineLab();
    this.buildInfoPanel();
    this.renderRecorderState();
    this.renderMelodyBlurb();
    this.startMeterLoop();
  }

  private loadingMarkup(): string {
    const bars = Array.from({ length: 14 }, (_, i) =>
      `<span class="skeleton-key" style="--i:${i}"></span>`).join('');
    return `
      <div class="console-loading" role="status" aria-live="polite">
        <p class="console-loading-text"><span class="spinner" aria-hidden="true"></span> Loading 24 piano samples</p>
        <div class="skeleton-keys" aria-hidden="true">${bars}</div>
      </div>
    `;
  }

  // ── Markup ───────────────────────────────────────────────────────────────

  private consoleMarkup(): string {
    const voiceDots = Array.from({ length: 16 }, () => '<i></i>').join('');
    const pads = CHORDS.map(chord => `
      <button type="button" class="pad" data-chord="${chord.id}">
        <span class="pad-label">${chord.label}</span>
        <span class="pad-spelling">${chord.spelling}</span>
      </button>`).join('');
    const melodyOptions = MELODIES.map(m =>
      `<option value="${m.id}">${m.title} &middot; ${m.composer}</option>`).join('');

    return `
      <div class="deck">
        <div class="deck-group">
          <span class="deck-label" id="engineLabel">Engine</span>
          <div class="segmented" role="radiogroup" aria-labelledby="engineLabel">
            <button type="button" class="segmented-option is-active" role="radio" aria-checked="true" data-engine="piano">Piano</button>
            <button type="button" class="segmented-option" role="radio" aria-checked="false" data-engine="synthesizer">Synth</button>
          </div>
        </div>

        <div class="deck-group deck-group--volume">
          <label class="deck-label" for="masterVolume">Volume</label>
          <input type="range" id="masterVolume" min="0" max="1" step="0.01" value="1" aria-describedby="masterVolumeValue">
          <output class="deck-readout" id="masterVolumeValue" for="masterVolume">100%</output>
        </div>

        <div class="deck-group deck-group--actions">
          <button type="button" class="switch is-on" id="sustainSwitch" role="switch" aria-checked="true">
            <span class="switch-track" aria-hidden="true"><span class="switch-knob"></span></span>
            <span class="switch-text">Sustain pedal</span>
            <kbd class="switch-kbd">Space</kbd>
          </button>
          <button type="button" class="ghost-button" id="panicButton">
            ${this.icon('stop')} Stop everything <kbd>Esc</kbd>
          </button>
        </div>
      </div>

      <div class="monitor">
        <div class="monitor-cell monitor-cell--voices">
          <span class="monitor-label">Voices sounding</span>
          <div class="monitor-line">
            <span class="monitor-value" id="voiceCount">0</span>
            <span class="voice-dots" id="voiceDots" aria-hidden="true">${voiceDots}</span>
          </div>
        </div>
        <div class="monitor-cell">
          <span class="monitor-label">Most at once</span>
          <span class="monitor-value" id="voicePeak">0</span>
        </div>
        <div class="monitor-cell">
          <span class="monitor-label">Notes played</span>
          <span class="monitor-value" id="noteTotal">0</span>
        </div>
        <div class="monitor-cell monitor-cell--meter">
          <span class="monitor-label">Level before limiter <em class="monitor-inline" id="headroomValue">silent</em></span>
          <div class="meter meter--headroom" title="Peak level reaching the limiter. The shaded band is above its -3 dB threshold, the line is 0 dBFS.">
            <span class="meter-band" aria-hidden="true"></span>
            <div class="meter-fill" id="headroomFill"></div>
            <span class="meter-zero" aria-hidden="true"></span>
          </div>
        </div>
        <div class="monitor-cell monitor-cell--meter">
          <span class="monitor-label">Gain reduction <em class="monitor-inline" id="reductionValue">0.0 dB</em></span>
          <div class="meter meter--reduction">
            <div class="meter-fill" id="reductionFill"></div>
          </div>
          <button type="button" class="switch switch--compact is-on" id="limiterSwitch" role="switch" aria-checked="true">
            <span class="switch-track" aria-hidden="true"><span class="switch-knob"></span></span>
            <span class="switch-text">masterLimiter</span>
          </button>
        </div>
      </div>

      <div class="instrument">
        <div class="piano-stage" id="pianoStage">
          <div class="case-plate" aria-hidden="true">
            <span class="case-brand">Sound Manager TS</span>
            <span class="case-engine" id="caseEngine">Sampled piano</span>
          </div>
          <div class="keybed">
            <div class="piano-felt" aria-hidden="true"></div>
            <div class="piano-keyboard" id="pianoKeyboard" role="group" aria-label="Two octave piano keyboard"></div>
          </div>
        </div>
      </div>
      <p class="instrument-hint">
        <span class="hint-narrow">Swipe the keyboard sideways to reach the second octave. </span>
        Play with your computer keyboard: the letter on each key is the one to press.
        The lower letter row is octave 4, the row above it holds its black keys, and the pattern repeats for octave 5.
      </p>

      <div class="console-bottom">
        <section class="bay bay--pads">
          <h2 class="bay-title">Chord pads</h2>
          <p class="bay-note">One tap starts three or four instances in the same tick.</p>
          <div class="pad-grid">${pads}</div>
        </section>

        <section class="bay bay--transport">
          <h2 class="bay-title">Play a piece</h2>
          <div class="transport-row">
            <select class="field-select" id="melodySelect" aria-label="Piece to play">${melodyOptions}</select>
            <button type="button" class="primary-button" id="melodyPlay">${this.icon('play')} Play</button>
          </div>
          <p class="bay-note" id="melodyBlurb"></p>

          <h2 class="bay-title">Record yourself</h2>
          <div class="transport-row">
            <button type="button" class="ghost-button ghost-button--record" id="recordButton">${this.icon('record')} Record</button>
            <button type="button" class="ghost-button" id="recPlayButton" disabled>${this.icon('play')} Play</button>
            <button type="button" class="ghost-button" id="recLoopButton" aria-pressed="false" disabled>${this.icon('loop')} Loop</button>
            <button type="button" class="ghost-button" id="recClearButton" disabled>${this.icon('trash')} Clear</button>
          </div>
          <p class="bay-note rec-status" id="recStatus"></p>
          <div class="rec-track" aria-hidden="true"><div class="rec-track-fill" id="recProgress"></div></div>
        </section>
      </div>
    `;
  }

  private cacheElements(root: HTMLElement): void {
    const $ = <T extends HTMLElement>(sel: string): T | null => root.querySelector<T>(sel);

    this.stage = $('#pianoStage');
    this.voiceCountEl = $('#voiceCount');
    this.voiceDots = Array.from(root.querySelectorAll<HTMLElement>('#voiceDots i'));
    this.voicePeakEl = $('#voicePeak');
    this.noteTotalEl = $('#noteTotal');
    this.headroomFill = $('#headroomFill');
    this.headroomValue = $('#headroomValue');
    this.reductionFill = $('#reductionFill');
    this.reductionValue = $('#reductionValue');
    this.limiterSwitch = $<HTMLButtonElement>('#limiterSwitch');
    this.sustainSwitch = $<HTMLButtonElement>('#sustainSwitch');
    this.volumeInput = $<HTMLInputElement>('#masterVolume');
    this.volumeReadout = $('#masterVolumeValue');
    this.melodySelect = $<HTMLSelectElement>('#melodySelect');
    this.melodyButton = $<HTMLButtonElement>('#melodyPlay');
    this.melodyBlurb = $('#melodyBlurb');
    this.recordButton = $<HTMLButtonElement>('#recordButton');
    this.recPlayButton = $<HTMLButtonElement>('#recPlayButton');
    this.recLoopButton = $<HTMLButtonElement>('#recLoopButton');
    this.recClearButton = $<HTMLButtonElement>('#recClearButton');
    this.recStatus = $('#recStatus');
    this.recProgress = $('#recProgress');

    if (this.volumeInput) autoRangeProgress(this.volumeInput);
  }

  private buildKeyboard(keyboard: HTMLElement): void {
    const whiteContainer = document.createElement('div');
    whiteContainer.className = 'piano-white-keys';

    const blackContainer = document.createElement('div');
    blackContainer.className = 'piano-black-keys';

    NOTES.forEach(note => {
      const key = document.createElement('button');
      key.type = 'button';
      key.className = `piano-key piano-key--${note.sharp ? 'black' : 'white'}`;
      key.dataset.noteId = note.id;
      key.tabIndex = -1;
      key.setAttribute('aria-label', `${note.label}, key ${note.keyLabel}`);
      key.innerHTML = `
        <span class="key-shortcut" aria-hidden="true">${note.keyLabel}</span>
        <span class="key-label" aria-hidden="true">${note.displayLabel}${note.sharp ? '' : `<sub>${note.octave}</sub>`}</span>
      `;

      if (note.sharp) {
        key.style.setProperty('--black-offset', String(note.blackOffset ?? 0));
        blackContainer.appendChild(key);
      } else {
        whiteContainer.appendChild(key);
      }
      this.keyElements.set(note.id, key);
    });

    keyboard.appendChild(whiteContainer);
    keyboard.appendChild(blackContainer);
  }

  // ── Events ───────────────────────────────────────────────────────────────

  private bindEvents(root: HTMLElement): void {
    this.keyElements.forEach((el, noteId) => {
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
        if (this.pointerNotes.has(noteId)) return;
        this.pointerNotes.add(noteId);
        this.triggerNoteStart(noteId, true);
      });
      // Dragging across the keyboard glissandos, like a real one
      el.addEventListener('pointerenter', (e) => {
        if (!(e.buttons & 1) || this.pointerNotes.has(noteId)) return;
        this.pointerNotes.add(noteId);
        this.triggerNoteStart(noteId, true);
      });
      el.addEventListener('pointerleave', () => {
        if (!this.pointerNotes.delete(noteId)) return;
        this.triggerNoteEnd(noteId, true);
      });
    });

    document.addEventListener('pointerup', () => {
      this.pointerNotes.forEach(noteId => this.triggerNoteEnd(noteId, true));
      this.pointerNotes.clear();
    });
    document.addEventListener('pointercancel', () => {
      this.pointerNotes.forEach(noteId => this.triggerNoteEnd(noteId, true));
      this.pointerNotes.clear();
    });

    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));
    // A key held while the tab loses focus would otherwise stay stuck down
    window.addEventListener('blur', () => this.releaseAllHeldKeys());

    root.querySelectorAll<HTMLButtonElement>('[data-engine]').forEach(button => {
      button.addEventListener('click', () => {
        this.switchEngine(button.dataset.engine as SoundEngineType);
        button.blur();
      });
    });

    this.volumeInput?.addEventListener('input', () => {
      this.setVolume(Number(this.volumeInput!.value));
    });

    this.sustainSwitch?.addEventListener('click', () => {
      this.sustainLatched[this.currentEngine] = !this.sustainLatched[this.currentEngine];
      this.applySustain();
    });

    this.limiterSwitch?.addEventListener('click', () => {
      const next = !this.soundManager.isMasterLimiterEnabled();
      this.soundManager.setMasterLimiter(next);
      this.renderLimiterSwitch();
      gtag('event', 'piano_limiter_toggle', { enabled: next, demo: 'multichannel' });
    });

    root.querySelector('#panicButton')?.addEventListener('click', () => this.panic());

    root.querySelectorAll<HTMLButtonElement>('[data-chord]').forEach(pad => {
      pad.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.playChord(pad.dataset.chord!);
        pad.classList.add('is-hit');
        window.setTimeout(() => pad.classList.remove('is-hit'), 220);
      });
    });

    this.melodySelect?.addEventListener('change', () => this.renderMelodyBlurb());
    this.melodyButton?.addEventListener('click', () => {
      if (this.melodyPlaying) this.stopMelody();
      else this.playMelody();
      this.melodyButton?.blur();
    });

    this.recordButton?.addEventListener('click', () => {
      const state = this.recorder.getState();
      if (state === 'armed' || state === 'recording') this.recorder.stopRecording();
      else this.recorder.arm();
      this.recordButton?.blur();
    });
    this.recPlayButton?.addEventListener('click', () => {
      if (this.recorder.getState() === 'playing') this.recorder.stopPlayback();
      else this.recorder.play();
      this.recPlayButton?.blur();
    });
    this.recLoopButton?.addEventListener('click', () => {
      this.recorder.setLoop(!this.recorder.isLoopEnabled());
      this.renderRecorderState();
      this.recLoopButton?.blur();
    });
    this.recClearButton?.addEventListener('click', () => {
      this.recorder.clear();
      this.renderRecorderState();
    });

    this.soundManager.addEventListener(SoundEventsEnum.PROGRESS, (event) => {
      if (!event.instanceId || event.progress === undefined) return;
      const entry = this.sampleInstances.get(event.instanceId);
      if (entry) this.updateNoteAnimationProgress(entry.animId, event.progress);
    });

    const endInstance = (instanceId?: string): void => {
      if (!instanceId) return;
      const entry = this.sampleInstances.get(instanceId);
      if (!entry) return;
      this.cleanupAnimation(entry.animId);
      this.sampleInstances.delete(instanceId);
      if (this.lastInstanceByNote.get(entry.noteId) === instanceId) {
        this.lastInstanceByNote.delete(entry.noteId);
      }
      this.renderVoices();
    };
    this.soundManager.addEventListener(SoundEventsEnum.ENDED, (e) => endInstance(e.instanceId));
    this.soundManager.addEventListener(SoundEventsEnum.STOPPED, (e) => endInstance(e.instanceId ?? e.soundId));

    this.synthEngine.onVoiceCountChange = () => this.renderVoices();
    this.synthEngine.onVoiceReleased = (noteId, releaseSeconds) => {
      this.releaseSynthAnimation(noteId, releaseSeconds * 1000);
    };
  }

  private onKeyDown(e: KeyboardEvent): void {
    const target = e.target;
    if (target instanceof HTMLElement && (target.matches('input, select, textarea') || target.isContentEditable)) return;

    if (e.code === 'Space') {
      e.preventDefault();
      if (e.repeat || this.pedalDown) return;
      this.pedalDown = true;
      this.applySustain();
      return;
    }

    if (e.key === 'Escape') {
      this.panic();
      return;
    }

    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;

    const note = KEY_TO_NOTE.get(e.key.toLowerCase());
    if (!note) return;
    e.preventDefault();
    if (this.heldKeyboardKeys.has(note.key)) return;
    this.heldKeyboardKeys.add(note.key);
    this.triggerNoteStart(note.id, true);
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      this.pedalDown = false;
      this.applySustain();
      return;
    }
    const note = KEY_TO_NOTE.get(e.key.toLowerCase());
    if (!note || !this.heldKeyboardKeys.delete(note.key)) return;
    this.triggerNoteEnd(note.id, true);
  }

  private releaseAllHeldKeys(): void {
    this.heldKeyboardKeys.forEach(key => {
      const note = KEY_TO_NOTE.get(key);
      if (note) this.triggerNoteEnd(note.id, true);
    });
    this.heldKeyboardKeys.clear();
    this.pointerNotes.forEach(noteId => this.triggerNoteEnd(noteId, true));
    this.pointerNotes.clear();
    if (this.pedalDown) {
      this.pedalDown = false;
      this.applySustain();
    }
  }

  // ── Note triggering ──────────────────────────────────────────────────────

  /**
   * @param record Whether this note should end up in the recorder. Notes coming
   *   out of the recorder itself pass false, so playback cannot re-record itself.
   */
  private triggerNoteStart(noteId: string, record: boolean): void {
    const note = NOTE_BY_ID.get(noteId);
    if (!note) return;

    const keyEl = this.keyElements.get(noteId);
    if (record) this.recorder.capture(noteId, 'on');

    if (this.currentEngine === 'piano') {
      this.startSampleNote(note, keyEl);
    } else {
      this.startSynthNote(note, keyEl);
    }

    this.totalNotes += 1;
    if (this.noteTotalEl) this.noteTotalEl.textContent = String(this.totalNotes);
    keyEl?.classList.add('is-active');
  }

  private triggerNoteEnd(noteId: string, record: boolean): void {
    const keyEl = this.keyElements.get(noteId);
    keyEl?.classList.remove('is-active');
    if (record) this.recorder.capture(noteId, 'off');

    if (this.currentEngine === 'synthesizer') {
      this.synthEngine.noteOff(noteId);
      return;
    }

    // Sample engine: with the pedal up the note is damped instead of ringing on
    if (this.isSustainActive()) return;
    const instanceId = this.lastInstanceByNote.get(noteId);
    if (instanceId) this.soundManager.fadeOut(instanceId, DAMPER_SECONDS, undefined, 0, true);
  }

  private startSampleNote(note: NoteDefinition, keyEl: HTMLElement | undefined): void {
    let instance;
    try {
      instance = this.soundManager.play(note.id);
    } catch {
      return;
    }
    if (!instance) return;

    const animId = `anim-${++this.animCounter}`;
    this.sampleInstances.set(instance.id, { noteId: note.id, animId });
    this.lastInstanceByNote.set(note.id, instance.id);
    if (keyEl) this.spawnNoteAnimation(note, keyEl, animId);
    this.renderVoices();

    // Safety net: if the ENDED event never lands, the animation still goes away
    const duration = this.soundManager.getDuration(note.id) || 3;
    window.setTimeout(() => {
      if (!this.sampleInstances.has(instance.id)) return;
      this.cleanupAnimation(animId);
      this.sampleInstances.delete(instance.id);
      if (this.lastInstanceByNote.get(note.id) === instance.id) {
        this.lastInstanceByNote.delete(note.id);
      }
      this.renderVoices();
    }, (duration + 0.6) * 1000);
  }

  private startSynthNote(note: NoteDefinition, keyEl: HTMLElement | undefined): void {
    this.synthEngine.noteOn(note.id, note.frequency);
    if (!keyEl) return;

    // One animation per note: a retrigger replaces the previous one
    const existing = this.synthAnims.get(note.id);
    if (existing) {
      cancelAnimationFrame(existing.rafId);
      existing.el.remove();
      this.synthAnims.delete(note.id);
    }
    const animId = `anim-${++this.animCounter}`;
    const el = this.spawnNoteAnimation(note, keyEl, animId);
    if (el) this.startSynthAnimLoop(note.id, el);
  }

  private playChord(chordId: string): void {
    const chord = CHORDS.find(c => c.id === chordId);
    if (!chord) return;

    chord.notes.forEach(noteId => this.triggerNoteStart(noteId, true));
    this.flashKeys(chord.notes);

    if (this.currentEngine === 'synthesizer') {
      // A pad has no key-up of its own, so give the chord a fixed length
      window.setTimeout(() => chord.notes.forEach(n => this.triggerNoteEnd(n, true)), 900);
    } else if (!this.isSustainActive()) {
      window.setTimeout(() => chord.notes.forEach(n => this.triggerNoteEnd(n, true)), 900);
    }
    gtag('event', 'piano_chord_pad', { chord: chordId, demo: 'multichannel' });
  }

  private flashKeys(noteIds: string[]): void {
    noteIds.forEach(noteId => {
      const el = this.keyElements.get(noteId);
      if (!el) return;
      el.classList.add('is-active');
      window.setTimeout(() => {
        if (!this.pointerNotes.has(noteId)) el.classList.remove('is-active');
      }, 220);
    });
  }

  private panic(): void {
    this.stopMelody();
    this.recorder.stopPlayback();
    this.soundManager.stopAllSounds();
    this.synthEngine.stopAll();
    this.sampleInstances.forEach(entry => this.cleanupAnimation(entry.animId));
    this.sampleInstances.clear();
    this.lastInstanceByNote.clear();
    this.keyElements.forEach(el => el.classList.remove('is-active'));
    this.pointerNotes.clear();
    this.heldKeyboardKeys.clear();
    this.renderVoices();
  }

  // ── Engine, volume, sustain ──────────────────────────────────────────────

  private switchEngine(engine: SoundEngineType): void {
    if (!engine || engine === this.currentEngine) return;

    this.panic();
    this.currentEngine = engine;
    this.peakVoices = 0;

    document.querySelectorAll<HTMLButtonElement>('[data-engine]').forEach(button => {
      const active = button.dataset.engine === engine;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-checked', String(active));
    });
    const caseEngine = document.getElementById('caseEngine');
    if (caseEngine) caseEngine.textContent = engine === 'piano' ? 'Sampled piano' : 'Subtractive synth';

    this.applySustain();
    this.renderVoices();
    this.renderEngineLab();
    gtag('event', 'piano_engine_switch', { engine, demo: 'multichannel' });
  }

  private setVolume(vol: number): void {
    this.globalVolume = Math.max(0, Math.min(1, Math.round(vol * 10000) / 10000));
    this.soundManager.setGlobalVolume(this.globalVolume);
    // Scale synth volume to 60% so it sits better relative to piano samples
    this.synthEngine.setVolume(Math.round(this.globalVolume * 0.6 * 10000) / 10000);
    if (this.volumeReadout) this.volumeReadout.textContent = `${Math.round(this.globalVolume * 100)}%`;
  }

  private isSustainActive(): boolean {
    return this.sustainLatched[this.currentEngine] || this.pedalDown;
  }

  private applySustain(): void {
    const active = this.isSustainActive();
    this.synthEngine.setSustain(active);

    if (!this.sustainSwitch) return;
    this.sustainSwitch.classList.toggle('is-on', active);
    this.sustainSwitch.classList.toggle('is-pedalled', this.pedalDown && !this.sustainLatched[this.currentEngine]);
    this.sustainSwitch.setAttribute('aria-checked', String(active));
  }

  // ── Melody playback ──────────────────────────────────────────────────────

  private currentMelody(): Melody {
    return MELODIES.find(m => m.id === this.melodySelect?.value) ?? MELODIES[0];
  }

  private renderMelodyBlurb(): void {
    if (this.melodyBlurb) this.melodyBlurb.textContent = this.currentMelody().blurb;
  }

  private playMelody(): void {
    const melody = this.currentMelody();
    this.stopMelody();
    this.melodyPlaying = true;
    this.renderMelodyButton();

    let offset = 0;
    melody.steps.forEach(step => {
      const at = offset;
      const id = window.setTimeout(() => {
        step.notes.forEach(noteId => this.triggerNoteStart(noteId, false));
        this.flashKeys(step.notes);
        if (this.currentEngine === 'synthesizer' || !this.isSustainActive()) {
          const off = window.setTimeout(
            () => step.notes.forEach(noteId => this.triggerNoteEnd(noteId, false)),
            Math.max(80, step.step * 0.9)
          );
          this.melodyTimers.push(off);
        }
      }, at);
      this.melodyTimers.push(id);
      offset += step.step;
    });

    const endId = window.setTimeout(() => {
      this.melodyPlaying = false;
      this.renderMelodyButton();
    }, offset);
    this.melodyTimers.push(endId);
    gtag('event', 'piano_melody_play', { melody: melody.id, demo: 'multichannel' });
  }

  private stopMelody(): void {
    this.melodyTimers.forEach(id => window.clearTimeout(id));
    this.melodyTimers = [];
    if (!this.melodyPlaying) return;
    this.melodyPlaying = false;
    this.renderMelodyButton();
  }

  private renderMelodyButton(): void {
    if (!this.melodyButton) return;
    this.melodyButton.innerHTML = this.melodyPlaying
      ? `${this.icon('stop')} Stop`
      : `${this.icon('play')} Play`;
    this.melodyButton.classList.toggle('is-playing', this.melodyPlaying);
  }

  // ── Recorder UI ──────────────────────────────────────────────────────────

  private renderRecorderState(): void {
    const state: RecorderState = this.recorder.getState();
    const has = this.recorder.hasRecording();
    const recording = state === 'armed' || state === 'recording';

    if (this.recordButton) {
      this.recordButton.innerHTML = recording
        ? `${this.icon('record')} Stop recording`
        : `${this.icon('record')} Record`;
      this.recordButton.classList.toggle('is-armed', recording);
    }
    if (this.recPlayButton) {
      this.recPlayButton.disabled = !has || recording;
      this.recPlayButton.innerHTML = state === 'playing'
        ? `${this.icon('stop')} Stop`
        : `${this.icon('play')} Play`;
    }
    if (this.recLoopButton) {
      this.recLoopButton.disabled = !has;
      this.recLoopButton.classList.toggle('is-on', this.recorder.isLoopEnabled());
      this.recLoopButton.setAttribute('aria-pressed', String(this.recorder.isLoopEnabled()));
    }
    if (this.recClearButton) this.recClearButton.disabled = !has || recording;
    if (this.recProgress && state !== 'playing') this.recProgress.style.transform = 'scaleX(0)';

    if (this.recStatus) {
      if (state === 'armed') {
        this.recStatus.textContent = 'Armed. The clock starts on your first note.';
      } else if (state === 'recording') {
        this.recStatus.textContent = 'Recording your notes.';
      } else if (state === 'playing') {
        this.recStatus.textContent = `Playing back ${this.recorder.getEventCount()} events.`;
      } else if (has) {
        const seconds = (this.recorder.getDuration() / 1000).toFixed(1);
        this.recStatus.textContent = `${this.recorder.getEventCount()} events, ${seconds}s. Switch engine and play it back on the other one.`;
      } else {
        this.recStatus.textContent = 'Nothing recorded yet.';
      }
      this.recStatus.classList.toggle('is-live', recording);
    }
  }

  // ── Engine lab panel ─────────────────────────────────────────────────────

  private renderEngineLab(): void {
    const lab = document.getElementById('engineLab');
    if (!lab) return;

    if (this.currentEngine === 'piano') {
      const longest = Math.max(...NOTES.map(n => this.soundManager.getDuration(n.id) || 0));
      lab.innerHTML = `
        <h2 class="bay-title">Sample engine</h2>
        <p class="lab-text">
          Twenty-four recorded piano notes, one file per pitch. Every key press calls
          <code>play()</code> again, and because <code>createNewInstance</code> is on you get a
          fresh instance with its own gain node instead of restarting the one that is already ringing.
        </p>
        <dl class="lab-stats">
          <div><dt>Samples</dt><dd>${NOTES.length}</dd></div>
          <div><dt>Range</dt><dd>C4 to B5</dd></div>
          <div><dt>Longest</dt><dd>${longest.toFixed(1)}s</dd></div>
        </dl>
        <p class="lab-text lab-text--muted">
          With the sustain pedal off, releasing a key calls <code>fadeOut()</code> on that one
          instance over ${DAMPER_SECONDS}s, the way a damper falls back onto the string.
        </p>
      `;
      return;
    }

    const env = this.synthEngine.getEnvelope();
    const waveButtons = WAVEFORMS.map(w => `
      <button type="button" class="wave-option${w.value === this.synthEngine.getWaveform() ? ' is-active' : ''}" data-wave="${w.value}">
        <svg viewBox="0 0 26 18" aria-hidden="true"><path d="${w.path}" /></svg>
        <span>${w.label}</span>
      </button>`).join('');

    lab.innerHTML = `
      <h2 class="bay-title">Synth engine</h2>
      <p class="lab-text">
        Oscillators built on the spot, routed into <code>getMasterInput()</code> so they pass
        through the same master volume, mute, panning and limiter as the samples.
      </p>
      <div class="wave-picker" role="group" aria-label="Waveform">${waveButtons}</div>
      <svg class="envelope-view" viewBox="0 0 240 72" aria-hidden="true">
        <path class="envelope-grid" d="M0 71 H240" />
        <path class="envelope-line" id="envelopePath" d="" />
      </svg>
      <div class="adsr">
        ${this.adsrRow('attack', 'Attack', env.attack, 0.001, 1, 0.001)}
        ${this.adsrRow('decay', 'Decay', env.decay, 0.005, 1.5, 0.005)}
        ${this.adsrRow('sustain', 'Sustain', env.sustain, 0, 1, 0.01)}
        ${this.adsrRow('release', 'Release', env.release, 0.02, 2, 0.01)}
      </div>

      <div class="lab-divider"></div>
      <div class="adsr">
        <div class="adsr-row">
          <label for="synthTrim">Output</label>
          <input type="range" id="synthTrim" min="0.02" max="1" step="0.01" value="${this.synthEngine.getOutputTrim()}">
          <output id="synthTrimValue">${this.formatDb(this.synthEngine.getOutputTrim())}</output>
        </div>
      </div>
      <p class="lab-text lab-text--muted">
        Oscillators are loud where samples are quiet. Turn this up, hold a handful of keys and the
        summed level walks into the limiter, which is the one thing the piano samples never manage.
        Keep your own volume low the first time you switch the limiter off up there.
      </p>
    `;

    this.envelopePath = lab.querySelector<SVGPathElement>('#envelopePath');
    this.drawEnvelope();

    lab.querySelectorAll<HTMLButtonElement>('[data-wave]').forEach(button => {
      button.addEventListener('click', () => {
        this.synthEngine.setWaveform(button.dataset.wave as OscillatorType);
        lab.querySelectorAll('[data-wave]').forEach(b => b.classList.remove('is-active'));
        button.classList.add('is-active');
      });
    });

    const sliders = Array.from(lab.querySelectorAll<HTMLInputElement>('.adsr input[type="range"]'));
    autoRangeProgress(...sliders);
    sliders.forEach(slider => {
      const part = slider.dataset.adsr as keyof AdsrEnvelope | undefined;
      if (!part) return;
      slider.addEventListener('input', () => {
        const value = Number(slider.value);
        this.synthEngine.setEnvelope({ [part]: value } as Partial<AdsrEnvelope>);
        const readout = lab.querySelector<HTMLElement>(`#adsr-${part}-value`);
        if (readout) readout.textContent = this.formatAdsr(part, value);
        this.drawEnvelope();
      });
    });

    const trim = lab.querySelector<HTMLInputElement>('#synthTrim');
    const trimValue = lab.querySelector<HTMLElement>('#synthTrimValue');
    trim?.addEventListener('input', () => {
      const value = Number(trim.value);
      this.synthEngine.setOutputTrim(value);
      if (trimValue) trimValue.textContent = this.formatDb(value);
    });
  }

  private adsrRow(
    part: keyof AdsrEnvelope, label: string, value: number,
    min: number, max: number, step: number
  ): string {
    return `
      <div class="adsr-row">
        <label for="adsr-${part}">${label}</label>
        <input type="range" id="adsr-${part}" data-adsr="${part}" min="${min}" max="${max}" step="${step}" value="${value}">
        <output id="adsr-${part}-value">${this.formatAdsr(part, value)}</output>
      </div>
    `;
  }

  private formatAdsr(part: keyof AdsrEnvelope, value: number): string {
    return part === 'sustain' ? value.toFixed(2) : `${value.toFixed(2)}s`;
  }

  private formatDb(gain: number): string {
    return `${(20 * Math.log10(gain)).toFixed(1)} dB`;
  }

  /** Draws the current ADSR shape at a fixed one-second-per-72px scale. */
  private drawEnvelope(): void {
    if (!this.envelopePath) return;
    const { attack, decay, sustain, release } = this.synthEngine.getEnvelope();
    const W = 240;
    const H = 72;
    const total = attack + decay + 0.4 + release;
    const x = (seconds: number): number => (seconds / total) * W;
    const y = (level: number): number => H - 1 - level * (H - 6);

    const xa = x(attack);
    const xd = x(attack + decay);
    const xs = x(attack + decay + 0.4);
    this.envelopePath.setAttribute(
      'd',
      `M0 ${y(0)} L${xa.toFixed(1)} ${y(1)} L${xd.toFixed(1)} ${y(sustain)} L${xs.toFixed(1)} ${y(sustain)} L${W} ${y(0)}`
    );
  }

  // ── Meters ───────────────────────────────────────────────────────────────

  private startMeterLoop(): void {
    this.renderLimiterSwitch();
    this.renderVoices();

    const tick = (): void => {
      this.updateLevelMeters();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  private updateLevelMeters(): void {
    if (this.levelAnalyser && this.levelBuffer && this.headroomFill && this.headroomValue) {
      this.levelAnalyser.getFloatTimeDomainData(this.levelBuffer);
      let peak = 0;
      for (let i = 0; i < this.levelBuffer.length; i++) {
        const abs = Math.abs(this.levelBuffer[i]);
        if (abs > peak) peak = abs;
      }
      const db = 20 * Math.log10(Math.max(peak, 1e-6));
      // Anything under the scale is the graph's own noise floor, not a note
      const audible = db > METER_FLOOR_DB;
      const ratio = audible ? Math.min(1, (db - METER_FLOOR_DB) / (METER_TOP_DB - METER_FLOOR_DB)) : 0;
      this.headroomFill.style.width = `${(ratio * 100).toFixed(1)}%`;
      this.headroomFill.classList.toggle('is-over', db > 0);
      this.headroomFill.classList.toggle('is-close', db > LIMITER_THRESHOLD_DB && db <= 0);
      this.headroomValue.textContent = audible ? `${db.toFixed(1)} dB` : 'silent';
    }

    if (this.reductionFill && this.reductionValue) {
      const limiter = this.soundManager.getMasterLimiterNode();
      if (!limiter) {
        this.reductionFill.style.width = '0%';
        this.reductionValue.textContent = 'off';
      } else {
        // The node reports a fraction of a dB even in silence, which would read
        // as if it were already working
        const raw = Math.abs(limiter.reduction);
        const reduction = raw < 0.15 ? 0 : raw;
        this.reductionFill.style.width = `${Math.min(100, (reduction / 12) * 100).toFixed(1)}%`;
        this.reductionValue.textContent = `${reduction.toFixed(1)} dB`;
      }
    }
  }

  private renderLimiterSwitch(): void {
    if (!this.limiterSwitch) return;
    const on = this.soundManager.isMasterLimiterEnabled();
    this.limiterSwitch.classList.toggle('is-on', on);
    this.limiterSwitch.setAttribute('aria-checked', String(on));
    this.limiterSwitch.closest('.monitor-cell')?.classList.toggle('is-off', !on);
  }

  private renderVoices(): void {
    const count = this.currentEngine === 'piano'
      ? this.sampleInstances.size
      : this.synthEngine.getVoiceCount();

    if (count > this.peakVoices) {
      this.peakVoices = count;
      if (this.voicePeakEl) this.voicePeakEl.textContent = String(count);
    }
    if (this.voiceCountEl) this.voiceCountEl.textContent = String(count);
    this.voiceDots.forEach((dot, i) => dot.classList.toggle('is-lit', i < count));
  }

  // ── Floating note animations ─────────────────────────────────────────────

  private spawnNoteAnimation(note: NoteDefinition, keyEl: HTMLElement, animId: string): HTMLElement | null {
    if (!this.stage) return null;

    const keyRect = keyEl.getBoundingClientRect();
    const stageRect = this.stage.getBoundingClientRect();

    const anim = document.createElement('div');
    anim.className = 'note-anim';
    anim.id = animId;
    anim.style.left = `${keyRect.left - stageRect.left + keyRect.width / 2}px`;
    anim.style.top = `${keyRect.top - stageRect.top}px`;
    anim.innerHTML = `<span class="note-anim-icon" aria-hidden="true">&#9834;</span><span class="note-anim-label">${note.label}</span>`;

    this.stage.appendChild(anim);
    return anim;
  }

  private updateNoteAnimationProgress(animId: string, progress: number): void {
    const el = document.getElementById(animId);
    if (!el) return;
    if (this.reducedMotion) {
      el.style.opacity = `${Math.max(0, 1 - progress)}`;
      return;
    }

    let yOffset: number;
    let opacity: number;
    if (progress <= NOTE_HOLD_THRESHOLD) {
      const t = progress / NOTE_HOLD_THRESHOLD;
      yOffset = NOTE_HOLD_HEIGHT * t;
      opacity = 1 - t * 0.15;
    } else {
      const t = (progress - NOTE_HOLD_THRESHOLD) / (1 - NOTE_HOLD_THRESHOLD);
      yOffset = NOTE_HOLD_HEIGHT + (NOTE_FULL_HEIGHT - NOTE_HOLD_HEIGHT) * t;
      opacity = 0.85 - t * 0.85;
    }

    el.style.setProperty('--note-y', `${yOffset.toFixed(1)}px`);
    el.style.opacity = `${Math.max(0, Math.min(1, opacity))}`;
  }

  private startSynthAnimLoop(noteId: string, el: HTMLElement): void {
    const state: SynthAnimState = {
      el,
      startedAt: performance.now(),
      released: false,
      releasedAt: 0,
      releaseMs: 400,
      rafId: 0,
    };
    this.synthAnims.set(noteId, state);

    const tick = (now: number): void => {
      const st = this.synthAnims.get(noteId);
      if (!st || st.el !== el) return;

      if (!st.released) {
        const t = this.reducedMotion ? 1 : Math.min((now - st.startedAt) / SYNTH_HOLD_RISE_MS, 1);
        el.style.setProperty('--note-y', `${(NOTE_HOLD_HEIGHT * t).toFixed(1)}px`);
        el.style.opacity = `${Math.max(0.7, 1 - t * 0.15)}`;
        st.rafId = requestAnimationFrame(tick);
        return;
      }

      const t = Math.min((now - st.releasedAt) / st.releaseMs, 1);
      const yOffset = NOTE_HOLD_HEIGHT + (NOTE_FULL_HEIGHT - NOTE_HOLD_HEIGHT) * t;
      el.style.setProperty('--note-y', `${(this.reducedMotion ? NOTE_HOLD_HEIGHT : yOffset).toFixed(1)}px`);
      el.style.opacity = `${Math.max(0, 0.85 - t * 0.85)}`;

      if (t >= 1) {
        el.remove();
        this.synthAnims.delete(noteId);
        return;
      }
      st.rafId = requestAnimationFrame(tick);
    };

    state.rafId = requestAnimationFrame(tick);
  }

  private releaseSynthAnimation(noteId: string, releaseMs: number): void {
    const st = this.synthAnims.get(noteId);
    if (!st || st.released) return;
    st.released = true;
    st.releasedAt = performance.now();
    st.releaseMs = Math.max(120, releaseMs);
  }

  private cleanupAnimation(animId: string): void {
    const el = document.getElementById(animId);
    if (!el) return;
    el.style.transition = 'opacity 0.3s ease-out';
    el.style.opacity = '0';
    window.setTimeout(() => el.remove(), 350);
  }

  // ── Info panel ───────────────────────────────────────────────────────────

  private buildInfoPanel(): void {
    const infoPanel = document.getElementById('pianoInfo');
    if (!infoPanel) return;

    const codeSnippet = `// 1. A manager configured for overlapping sounds
const manager = new SoundManager({
  createNewInstance: true, // every play() returns its own independent instance

  // Why masterLimiter matters here:
  // Instances do not take turns, they add up. Every voice you add moves the
  // summed peak up, and the output can only carry up to 1.0: everything above
  // that gets chopped off, which you hear as crackle on the attack of a note.
  // How many voices it takes depends on how hot your samples are, so it is not
  // a number you can hard-code.
  //
  // The limiter sits last in the chain and holds those peaks back instead.
  // Below its threshold nothing is touched, so single notes sound identical.
  masterLimiter: true,
});

// 2. Load every sample up front
await manager.loadSounds([
  { id: 'piano-C4', url: 'C4.mp3' },
  { id: 'piano-D4', url: 'D4.mp3' },
  // ... 22 more
]);

// 3. play() hands back a Sound whose id is unique per instance, so the same
//    key pressed twice gives two instances that ring on independently.
const liveNotes = new Map<string, HTMLElement>();

function noteOn(noteId: string): void {
  const instance = manager.play(noteId);
  if (!instance) return;
  liveNotes.set(instance.id, spawnFloatingNote(noteId));
}

// 4. Releasing a key damps only that instance, the way a piano damper does.
function noteOff(noteId: string, instanceId: string): void {
  manager.fadeOut(instanceId, 0.22, undefined, 0, /* stopAfterFade */ true);
}

// 5. PROGRESS carries instanceId, so each instance drives its own animation.
manager.addEventListener(SoundEventsEnum.PROGRESS, (event) => {
  if (!event.instanceId) return;
  const el = liveNotes.get(event.instanceId);
  if (el) moveFloatingNote(el, event.progress); // 0.0 to 1.0
});

// 6. ENDED and STOPPED clean up the instance that actually finished.
[SoundEventsEnum.ENDED, SoundEventsEnum.STOPPED].forEach((type) => {
  manager.addEventListener(type, (event) => {
    if (!event.instanceId) return;
    liveNotes.get(event.instanceId)?.remove();
    liveNotes.delete(event.instanceId);
  });
});

// 7. The limiter is live: flip it while playing and read how hard it works.
manager.setMasterLimiter(false);
const reductionInDb = manager.getMasterLimiterNode()?.reduction ?? 0;

// 8. Anything you generate yourself can join the same master chain.
const osc = manager.getContext().createOscillator();
osc.connect(manager.getMasterInput()); // master volume, mute, pan, limiter`;

    infoPanel.innerHTML = `
      <div class="info-prose">
        <h2>What this page is showing</h2>
        <p>
          The piano runs on <strong>multichannel playback</strong>: <code>createNewInstance: true</code>
          makes every keystroke start a <em>new sound instance</em> instead of restarting the one that
          is already ringing. That is why a chord sounds like a chord and why the voice counter above
          the keyboard climbs while you play.
        </p>
        <h3>What stacking voices costs</h3>
        <p>
          Instances do not take turns, they add up, and the <strong>level before limiter</strong>
          meter is that sum. These samples are recorded politely, about -21 dBFS each, so one note
          lands halfway up the scale. Three notes reach roughly -14 dB, eight around -12 dB, and the
          full 24 note cluster stops near -7 dB. The shaded band is above the limiter's -3 dB
          threshold and the line is 0 dBFS, where the output starts cutting peaks off.
        </p>
        <h3>Making the limiter earn its keep</h3>
        <p>
          With samples this quiet the limiter never has to act, which is exactly the point of it
          being opt-in. To hear it work, switch to the synth: oscillators are loud where samples are
          quiet. Turn its <strong>Output</strong> up, hold a handful of keys, and the level walks into
          the shaded band while <strong>gain reduction</strong> shows how many dB are being held back.
          Flip <code>masterLimiter</code> off at that moment and the same notes start to crackle,
          because everything past 0 dBFS is simply chopped off. The switch rewires the master chain
          live, so nothing stops playing while you compare.
        </p>
        <h3>Per instance events</h3>
        <p>
          <code>PROGRESS</code> and <code>ENDED</code> both carry an <code>instanceId</code>, so each
          floating note follows its own sample rather than all notes of the same pitch sharing one
          animation. Releasing a key calls <code>fadeOut()</code> on that single instance.
        </p>
      </div>
      <div class="info-code-block">
        <pre><code class="language-typescript">${this.escapeHtml(codeSnippet)}</code></pre>
      </div>
    `;

    const codeEl = infoPanel.querySelector<HTMLElement>('pre code');
    if (codeEl) hljs.highlightElement(codeEl);
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ── Icons ────────────────────────────────────────────────────────────────

  private icon(name: 'play' | 'stop' | 'record' | 'loop' | 'trash'): string {
    const paths: Record<string, string> = {
      play: '<path d="M5 3.5 19 12 5 20.5Z" fill="currentColor" stroke="none"/>',
      stop: '<rect x="5" y="5" width="14" height="14" rx="2.5" fill="currentColor" stroke="none"/>',
      record: '<circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"/>',
      loop: '<path d="M4 9h13a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3H4m0-6 3-3M4 9l3 3"/>',
      trash: '<path d="M4 7h16M9.5 7V5h5v2m-8 0 1 12h7l1-12"/>',
    };
    return `<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  }
}
