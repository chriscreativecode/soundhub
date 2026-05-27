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
}

const NOTES: NoteDefinition[] = [
  { id: 'piano-C4',  label: 'C4',  displayLabel: 'C',  sharp: false, url: c4,  key: 'a',          keyLabel: 'A' },
  { id: 'piano-Db4', label: 'C#4', displayLabel: 'C#', sharp: true,  url: db4, key: 'w',          keyLabel: 'W' },
  { id: 'piano-D4',  label: 'D4',  displayLabel: 'D',  sharp: false, url: d4,  key: 's',          keyLabel: 'S' },
  { id: 'piano-Eb4', label: 'D#4', displayLabel: 'D#', sharp: true,  url: eb4, key: 'e',          keyLabel: 'E' },
  { id: 'piano-E4',  label: 'E4',  displayLabel: 'E',  sharp: false, url: e4,  key: 'd',          keyLabel: 'D' },
  { id: 'piano-F4',  label: 'F4',  displayLabel: 'F',  sharp: false, url: f4,  key: 'f',          keyLabel: 'F' },
  { id: 'piano-Gb4', label: 'F#4', displayLabel: 'F#', sharp: true,  url: gb4, key: 't',          keyLabel: 'T' },
  { id: 'piano-G4',  label: 'G4',  displayLabel: 'G',  sharp: false, url: g4,  key: 'g',          keyLabel: 'G' },
  { id: 'piano-Ab4', label: 'G#4', displayLabel: 'G#', sharp: true,  url: ab4, key: 'y',          keyLabel: 'Y' },
  { id: 'piano-A4',  label: 'A4',  displayLabel: 'A',  sharp: false, url: a4,  key: 'h',          keyLabel: 'H' },
  { id: 'piano-Bb4', label: 'A#4', displayLabel: 'A#', sharp: true,  url: bb4, key: 'u',          keyLabel: 'U' },
  { id: 'piano-B4',  label: 'B4',  displayLabel: 'B',  sharp: false, url: b4,  key: 'j',          keyLabel: 'J' },
  { id: 'piano-C5',  label: 'C5',  displayLabel: 'C',  sharp: false, url: c5,  key: 'k',          keyLabel: 'K' },
  { id: 'piano-Db5', label: 'C#5', displayLabel: 'C#', sharp: true,  url: db5, key: 'o',          keyLabel: 'O' },
  { id: 'piano-D5',  label: 'D5',  displayLabel: 'D',  sharp: false, url: d5,  key: 'l',          keyLabel: 'L' },
  { id: 'piano-Eb5', label: 'D#5', displayLabel: 'D#', sharp: true,  url: eb5, key: 'p',          keyLabel: 'P' },
  { id: 'piano-E5',  label: 'E5',  displayLabel: 'E',  sharp: false, url: e5,  key: ';',          keyLabel: ';' },
  { id: 'piano-F5',  label: 'F5',  displayLabel: 'F',  sharp: false, url: f5,  key: "'",          keyLabel: "'" },
  { id: 'piano-Gb5', label: 'F#5', displayLabel: 'F#', sharp: true,  url: gb5, key: '[',          keyLabel: '[' },
  { id: 'piano-G5',  label: 'G5',  displayLabel: 'G',  sharp: false, url: g5,  key: 'z',          keyLabel: 'Z' },
  { id: 'piano-Ab5', label: 'G#5', displayLabel: 'G#', sharp: true,  url: ab5, key: ']',          keyLabel: ']' },
  { id: 'piano-A5',  label: 'A5',  displayLabel: 'A',  sharp: false, url: a5,  key: 'x',          keyLabel: 'X' },
  { id: 'piano-Bb5', label: 'A#5', displayLabel: 'A#', sharp: true,  url: bb5, key: 'v',          keyLabel: 'V' },
  { id: 'piano-B5',  label: 'B5',  displayLabel: 'B',  sharp: false, url: b5,  key: 'c',          keyLabel: 'C' },
];

const KEY_TO_NOTE = new Map<string, NoteDefinition>(NOTES.map(n => [n.key, n]));

export class PianoDemo {
  private soundManager: SoundManager;
  private pressedKeys = new Set<string>();
  private keyElements = new Map<string, HTMLElement>();
  private noteDurations = new Map<string, number>();
  private instanceCount = new Map<string, number>();

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
  }

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

    // Map each black key to its left offset (as index among white keys)
    // Pattern per octave: C#=between C&D, D#=between D&E, F#=between F&G, G#=between G&A, A#=between A&B
    // White key indices for octave 4: C4=0, D4=1, E4=2, F4=3, G4=4, A4=5, B4=6
    // White key indices for octave 5: C5=7, D5=8, E5=9, F5=10, G5=11, A5=12, B5=13
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

  private bindEvents(): void {
    // Mouse / touch on keys
    this.keyElements.forEach((el, noteId) => {
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.triggerNote(noteId, el);
      });
    });

    // Keyboard input
    document.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      const note = KEY_TO_NOTE.get(key);
      if (!note) return;
      e.preventDefault();
      this.pressedKeys.add(key);
      const el = this.keyElements.get(note.id);
      if (el) this.triggerNote(note.id, el);
    });

    document.addEventListener('keyup', (e) => {
      this.pressedKeys.delete(e.key.toLowerCase());
    });
  }

  private triggerNote(noteId: string, keyEl: HTMLElement): void {
    try {
      this.soundManager.play(noteId);
    } catch {
      return;
    }

    keyEl.classList.add('active');

    const duration = this.noteDurations.get(noteId) ?? 2;
    const count = (this.instanceCount.get(noteId) ?? 0) + 1;
    this.instanceCount.set(noteId, count);
    const instanceId = `${noteId}-${count}`;

    this.spawnNoteAnimation(noteId, keyEl, duration, instanceId);

    // Remove active class after a short visual press
    setTimeout(() => keyEl.classList.remove('active'), 120);

    // Listen for ENDED to clean up animation
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.id === noteId) {
        this.cleanupAnimation(instanceId);
        this.soundManager.removeEventListener(SoundEventsEnum.ENDED, handler);
      }
    };
    this.soundManager.addEventListener(SoundEventsEnum.ENDED, handler);

    // Fallback cleanup
    setTimeout(() => this.cleanupAnimation(instanceId), (duration + 0.5) * 1000);
  }

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
