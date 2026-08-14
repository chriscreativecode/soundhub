// @ts-ignore
import c4 from "../../../../sounds/piano/C4.mp3";
// @ts-ignore
import db4 from "../../../../sounds/piano/Db4.mp3";
// @ts-ignore
import d4 from "../../../../sounds/piano/D4.mp3";
// @ts-ignore
import eb4 from "../../../../sounds/piano/Eb4.mp3";
// @ts-ignore
import e4 from "../../../../sounds/piano/E4.mp3";
// @ts-ignore
import f4 from "../../../../sounds/piano/F4.mp3";
// @ts-ignore
import gb4 from "../../../../sounds/piano/Gb4.mp3";
// @ts-ignore
import g4 from "../../../../sounds/piano/G4.mp3";
// @ts-ignore
import ab4 from "../../../../sounds/piano/Ab4.mp3";
// @ts-ignore
import a4 from "../../../../sounds/piano/A4.mp3";
// @ts-ignore
import bb4 from "../../../../sounds/piano/Bb4.mp3";
// @ts-ignore
import b4 from "../../../../sounds/piano/B4.mp3";
// @ts-ignore
import c5 from "../../../../sounds/piano/C5.mp3";
// @ts-ignore
import db5 from "../../../../sounds/piano/Db5.mp3";
// @ts-ignore
import d5 from "../../../../sounds/piano/D5.mp3";
// @ts-ignore
import eb5 from "../../../../sounds/piano/Eb5.mp3";
// @ts-ignore
import e5 from "../../../../sounds/piano/E5.mp3";
// @ts-ignore
import f5 from "../../../../sounds/piano/F5.mp3";
// @ts-ignore
import gb5 from "../../../../sounds/piano/Gb5.mp3";
// @ts-ignore
import g5 from "../../../../sounds/piano/G5.mp3";
// @ts-ignore
import ab5 from "../../../../sounds/piano/Ab5.mp3";
// @ts-ignore
import a5 from "../../../../sounds/piano/A5.mp3";
// @ts-ignore
import bb5 from "../../../../sounds/piano/Bb5.mp3";
// @ts-ignore
import b5 from "../../../../sounds/piano/B5.mp3";

export interface NoteDefinition {
  /** SoundManager id of the sample */
  id: string;
  /** Scientific pitch name, e.g. "C#4" */
  label: string;
  /** Pitch class without the octave, e.g. "C#" */
  displayLabel: string;
  /** Octave digit as a string, so it can be rendered as a subscript */
  octave: string;
  sharp: boolean;
  url: string;
  /** Lowercase key of the computer keyboard that triggers this note */
  key: string;
  /** How that key is printed on the piano key */
  keyLabel: string;
  frequency: number;
  /**
   * Only for black keys: horizontal position expressed in white-key widths.
   * 0.65 means "0.65 white keys from the left edge of the keyboard".
   */
  blackOffset?: number;
}

/**
 * Two octaves, C4 to B5.
 *
 * The computer keyboard follows the layout every tracker and soft-synth uses:
 * the lower letter row is octave 4 and the row above it holds that octave's
 * black keys, then the same shape repeats one row up for octave 5. The keys you
 * press therefore sit in the same pattern as the keys you see.
 */
export const NOTES: NoteDefinition[] = [
  { id: 'piano-C4',  label: 'C4',  displayLabel: 'C',  octave: '4', sharp: false, url: c4,  key: 'z', keyLabel: 'Z', frequency: 261.63 },
  { id: 'piano-Db4', label: 'C#4', displayLabel: 'C#', octave: '4', sharp: true,  url: db4, key: 's', keyLabel: 'S', frequency: 277.18, blackOffset: 0.65 },
  { id: 'piano-D4',  label: 'D4',  displayLabel: 'D',  octave: '4', sharp: false, url: d4,  key: 'x', keyLabel: 'X', frequency: 293.66 },
  { id: 'piano-Eb4', label: 'D#4', displayLabel: 'D#', octave: '4', sharp: true,  url: eb4, key: 'd', keyLabel: 'D', frequency: 311.13, blackOffset: 1.65 },
  { id: 'piano-E4',  label: 'E4',  displayLabel: 'E',  octave: '4', sharp: false, url: e4,  key: 'c', keyLabel: 'C', frequency: 329.63 },
  { id: 'piano-F4',  label: 'F4',  displayLabel: 'F',  octave: '4', sharp: false, url: f4,  key: 'v', keyLabel: 'V', frequency: 349.23 },
  { id: 'piano-Gb4', label: 'F#4', displayLabel: 'F#', octave: '4', sharp: true,  url: gb4, key: 'g', keyLabel: 'G', frequency: 369.99, blackOffset: 3.65 },
  { id: 'piano-G4',  label: 'G4',  displayLabel: 'G',  octave: '4', sharp: false, url: g4,  key: 'b', keyLabel: 'B', frequency: 392.00 },
  { id: 'piano-Ab4', label: 'G#4', displayLabel: 'G#', octave: '4', sharp: true,  url: ab4, key: 'h', keyLabel: 'H', frequency: 415.30, blackOffset: 4.65 },
  { id: 'piano-A4',  label: 'A4',  displayLabel: 'A',  octave: '4', sharp: false, url: a4,  key: 'n', keyLabel: 'N', frequency: 440.00 },
  { id: 'piano-Bb4', label: 'A#4', displayLabel: 'A#', octave: '4', sharp: true,  url: bb4, key: 'j', keyLabel: 'J', frequency: 466.16, blackOffset: 5.65 },
  { id: 'piano-B4',  label: 'B4',  displayLabel: 'B',  octave: '4', sharp: false, url: b4,  key: 'm', keyLabel: 'M', frequency: 493.88 },
  { id: 'piano-C5',  label: 'C5',  displayLabel: 'C',  octave: '5', sharp: false, url: c5,  key: 'q', keyLabel: 'Q', frequency: 523.25 },
  { id: 'piano-Db5', label: 'C#5', displayLabel: 'C#', octave: '5', sharp: true,  url: db5, key: '2', keyLabel: '2', frequency: 554.37, blackOffset: 7.65 },
  { id: 'piano-D5',  label: 'D5',  displayLabel: 'D',  octave: '5', sharp: false, url: d5,  key: 'w', keyLabel: 'W', frequency: 587.33 },
  { id: 'piano-Eb5', label: 'D#5', displayLabel: 'D#', octave: '5', sharp: true,  url: eb5, key: '3', keyLabel: '3', frequency: 622.25, blackOffset: 8.65 },
  { id: 'piano-E5',  label: 'E5',  displayLabel: 'E',  octave: '5', sharp: false, url: e5,  key: 'e', keyLabel: 'E', frequency: 659.25 },
  { id: 'piano-F5',  label: 'F5',  displayLabel: 'F',  octave: '5', sharp: false, url: f5,  key: 'r', keyLabel: 'R', frequency: 698.46 },
  { id: 'piano-Gb5', label: 'F#5', displayLabel: 'F#', octave: '5', sharp: true,  url: gb5, key: '5', keyLabel: '5', frequency: 739.99, blackOffset: 10.65 },
  { id: 'piano-G5',  label: 'G5',  displayLabel: 'G',  octave: '5', sharp: false, url: g5,  key: 't', keyLabel: 'T', frequency: 783.99 },
  { id: 'piano-Ab5', label: 'G#5', displayLabel: 'G#', octave: '5', sharp: true,  url: ab5, key: '6', keyLabel: '6', frequency: 830.61, blackOffset: 11.65 },
  { id: 'piano-A5',  label: 'A5',  displayLabel: 'A',  octave: '5', sharp: false, url: a5,  key: 'y', keyLabel: 'Y', frequency: 880.00 },
  { id: 'piano-Bb5', label: 'A#5', displayLabel: 'A#', octave: '5', sharp: true,  url: bb5, key: '7', keyLabel: '7', frequency: 932.33, blackOffset: 12.65 },
  { id: 'piano-B5',  label: 'B5',  displayLabel: 'B',  octave: '5', sharp: false, url: b5,  key: 'u', keyLabel: 'U', frequency: 987.77 },
];

export const NOTE_BY_ID = new Map<string, NoteDefinition>(NOTES.map(n => [n.id, n]));
export const KEY_TO_NOTE = new Map<string, NoteDefinition>(NOTES.map(n => [n.key, n]));

// ── Chord pads ───────────────────────────────────────────────────────────────

export interface ChordDefinition {
  id: string;
  /** Chord symbol shown on the pad */
  label: string;
  /** Note names printed under the symbol */
  spelling: string;
  notes: string[];
}

/**
 * One pad fires three or four notes in the same tick, so a single click is
 * already a polyphony test: without createNewInstance only the last note of the
 * chord would survive.
 */
export const CHORDS: ChordDefinition[] = [
  { id: 'C',     label: 'C',     spelling: 'C E G',     notes: ['piano-C4', 'piano-E4', 'piano-G4'] },
  { id: 'Dm',    label: 'Dm',    spelling: 'D F A',     notes: ['piano-D4', 'piano-F4', 'piano-A4'] },
  { id: 'Em',    label: 'Em',    spelling: 'E G B',     notes: ['piano-E4', 'piano-G4', 'piano-B4'] },
  { id: 'F',     label: 'F',     spelling: 'F A C',     notes: ['piano-F4', 'piano-A4', 'piano-C5'] },
  { id: 'G',     label: 'G',     spelling: 'G B D',     notes: ['piano-G4', 'piano-B4', 'piano-D5'] },
  { id: 'Am',    label: 'Am',    spelling: 'A C E',     notes: ['piano-A4', 'piano-C5', 'piano-E5'] },
  { id: 'G7',    label: 'G7',    spelling: 'G B D F',   notes: ['piano-G4', 'piano-B4', 'piano-D5', 'piano-F5'] },
  { id: 'Cmaj7', label: 'Cmaj7', spelling: 'C E G B',   notes: ['piano-C4', 'piano-E4', 'piano-G4', 'piano-B4'] },
];

// ── Demo melodies ────────────────────────────────────────────────────────────

export interface MelodyStep {
  /** Notes that start together on this step */
  notes: string[];
  /** Milliseconds until the next step starts */
  step: number;
}

export interface Melody {
  id: string;
  title: string;
  composer: string;
  /** One line of description shown next to the transport */
  blurb: string;
  steps: MelodyStep[];
}

const s = (note: string, step: number): MelodyStep => ({ notes: [note], step });

/** Bach's arpeggio figure, the eight notes of one bar. */
const preludeBar = (notes: string[]): MelodyStep[] => notes.map(n => s(n, 200));

const PRELUDE_BAR_1 = ['piano-C4', 'piano-E4', 'piano-G4', 'piano-C5', 'piano-E5', 'piano-G4', 'piano-C5', 'piano-E5'];
const PRELUDE_BAR_2 = ['piano-C4', 'piano-D4', 'piano-A4', 'piano-D5', 'piano-F5', 'piano-A4', 'piano-D5', 'piano-F5'];

export const MELODIES: Melody[] = [
  {
    id: 'ode',
    title: 'Ode to Joy',
    composer: 'Beethoven',
    blurb: 'One note at a time, the calm baseline.',
    steps: [
      s('piano-E4', 400), s('piano-E4', 400), s('piano-F4', 400), s('piano-G4', 400),
      s('piano-G4', 400), s('piano-F4', 400), s('piano-E4', 400), s('piano-D4', 400),
      s('piano-C4', 400), s('piano-C4', 400), s('piano-D4', 400), s('piano-E4', 400),
      s('piano-E4', 600), s('piano-D4', 200), s('piano-D4', 900),
    ],
  },
  {
    id: 'elise',
    title: 'Fuer Elise',
    composer: 'Beethoven',
    blurb: 'Fast sixteenths, so samples start overlapping.',
    steps: [
      s('piano-E5', 150), s('piano-Eb5', 150), s('piano-E5', 150), s('piano-Eb5', 150),
      s('piano-E5', 150), s('piano-B4', 150), s('piano-D5', 150), s('piano-C5', 150),
      s('piano-A4', 450),
      s('piano-C4', 150), s('piano-E4', 150), s('piano-A4', 150), s('piano-B4', 450),
      s('piano-E4', 150), s('piano-Ab4', 150), s('piano-B4', 150), s('piano-C5', 450),
      s('piano-E4', 150), s('piano-E5', 150), s('piano-Eb5', 150), s('piano-E5', 150),
      s('piano-Eb5', 150), s('piano-E5', 150), s('piano-B4', 150), s('piano-D5', 150),
      s('piano-C5', 150), s('piano-A4', 900),
    ],
  },
  {
    id: 'prelude',
    title: 'Prelude in C',
    composer: 'Bach',
    blurb: 'Every note rings on, so voices stack up fast.',
    steps: [
      ...preludeBar(PRELUDE_BAR_1), ...preludeBar(PRELUDE_BAR_1),
      ...preludeBar(PRELUDE_BAR_2), ...preludeBar(PRELUDE_BAR_2),
      ...preludeBar(PRELUDE_BAR_1), ...preludeBar(PRELUDE_BAR_1),
      { notes: ['piano-C4', 'piano-E4', 'piano-G4', 'piano-C5', 'piano-E5'], step: 1400 },
    ],
  },
];
