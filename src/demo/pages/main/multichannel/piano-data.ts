/**
 * Sample urls, resolved by Vite at build time. Listing 61 static imports by
 * hand would be noise; the folder holds exactly the notes this page plays.
 */
const SAMPLE_URLS = import.meta.glob<string>('../../../../sounds/piano/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
});

const urlByFileName = new Map<string, string>(
  Object.entries(SAMPLE_URLS).map(([path, url]) => [path.split('/').pop()!.replace('.mp3', ''), url])
);

/** Pitch classes in the flat spelling the sample files use. */
const PITCH_CLASSES = [
  { file: 'C',  display: 'C',  sharp: false },
  { file: 'Db', display: 'C#', sharp: true },
  { file: 'D',  display: 'D',  sharp: false },
  { file: 'Eb', display: 'D#', sharp: true },
  { file: 'E',  display: 'E',  sharp: false },
  { file: 'F',  display: 'F',  sharp: false },
  { file: 'Gb', display: 'F#', sharp: true },
  { file: 'G',  display: 'G',  sharp: false },
  { file: 'Ab', display: 'G#', sharp: true },
  { file: 'A',  display: 'A',  sharp: false },
  { file: 'Bb', display: 'A#', sharp: true },
  { file: 'B',  display: 'B',  sharp: false },
] as const;

export const LOWEST_OCTAVE = 2;
export const HIGHEST_OCTAVE = 6;
/** The range ends on the C above the highest full octave, like a real 61 key board. */
const TOP_NOTE_INCLUDED = true;

export interface NoteDefinition {
  /** SoundManager id of the sample */
  id: string;
  /** Scientific pitch name, e.g. "C#4" */
  label: string;
  /** Pitch class without the octave, e.g. "C#" */
  displayLabel: string;
  octave: number;
  sharp: boolean;
  url: string;
  frequency: number;
  /** Semitones above C2, which is also this note's position in NOTES */
  semitone: number;
  /** Position among the white keys, or null for a black key */
  whiteIndex: number | null;
  /**
   * Only for black keys: left edge in white-key widths, measured from the left
   * edge of the keyboard.
   */
  blackOffset?: number;
}

/**
 * Where each black key sits inside its octave, in white-key widths from that
 * octave's C. These are the real proportions of a piano rather than a black key
 * centred on every seam: C# leans towards C, A# leans towards B, and only G#
 * lands dead centre.
 */
const BLACK_OFFSET_IN_OCTAVE: Record<number, number> = {
  1: 0.55,   // C#
  3: 1.80,   // D#
  6: 3.50,   // F#
  8: 4.70,   // G#
  10: 5.90,  // A#
};

/** Black key width, also in white-key widths. */
export const BLACK_KEY_RATIO = 0.6;

function buildNotes(): NoteDefinition[] {
  const notes: NoteDefinition[] = [];
  let whiteIndex = 0;
  let octaveWhiteStart = 0;

  for (let octave = LOWEST_OCTAVE; octave <= HIGHEST_OCTAVE + (TOP_NOTE_INCLUDED ? 1 : 0); octave++) {
    octaveWhiteStart = whiteIndex;

    for (let pc = 0; pc < PITCH_CLASSES.length; pc++) {
      // The top octave contributes its C only
      if (octave > HIGHEST_OCTAVE && pc > 0) break;

      const { file, display, sharp } = PITCH_CLASSES[pc];
      const fileName = `${file}${octave}`;
      const url = urlByFileName.get(fileName);
      if (!url) continue;

      const semitone = (octave - LOWEST_OCTAVE) * 12 + pc;
      notes.push({
        id: `piano-${fileName}`,
        label: `${display}${octave}`,
        displayLabel: display,
        octave,
        sharp,
        url,
        // A4 = 440 Hz sits 45 semitones above C2
        frequency: 440 * Math.pow(2, (semitone - 45) / 12),
        semitone,
        whiteIndex: sharp ? null : whiteIndex,
        blackOffset: sharp ? octaveWhiteStart + BLACK_OFFSET_IN_OCTAVE[pc] : undefined,
      });

      if (!sharp) whiteIndex += 1;
    }
  }

  return notes;
}

export const NOTES: NoteDefinition[] = buildNotes();
export const WHITE_KEY_COUNT = NOTES.filter(n => !n.sharp).length;
export const NOTE_BY_ID = new Map<string, NoteDefinition>(NOTES.map(n => [n.id, n]));

// ── Computer keyboard ────────────────────────────────────────────────────────

export interface KeyBinding {
  /** Lowercase key of the computer keyboard */
  key: string;
  /** How that key is printed on the piano key */
  keyLabel: string;
  /** Semitones above the first note of the mapped window */
  offset: number;
}

/**
 * The layout every tracker and soft synth uses: the lower letter row walks up
 * one octave and the row above it carries that octave's black keys, then the
 * shape repeats for the octave above. The keys you press sit in the same
 * pattern as the keys you see.
 *
 * Two octaves plus the closing C, moved across the keyboard with the octave
 * shift, because 61 notes will never fit on one computer keyboard.
 */
export const KEY_BINDINGS: KeyBinding[] = [
  { key: 'z', keyLabel: 'Z', offset: 0 },
  { key: 's', keyLabel: 'S', offset: 1 },
  { key: 'x', keyLabel: 'X', offset: 2 },
  { key: 'd', keyLabel: 'D', offset: 3 },
  { key: 'c', keyLabel: 'C', offset: 4 },
  { key: 'v', keyLabel: 'V', offset: 5 },
  { key: 'g', keyLabel: 'G', offset: 6 },
  { key: 'b', keyLabel: 'B', offset: 7 },
  { key: 'h', keyLabel: 'H', offset: 8 },
  { key: 'n', keyLabel: 'N', offset: 9 },
  { key: 'j', keyLabel: 'J', offset: 10 },
  { key: 'm', keyLabel: 'M', offset: 11 },
  { key: 'q', keyLabel: 'Q', offset: 12 },
  { key: '2', keyLabel: '2', offset: 13 },
  { key: 'w', keyLabel: 'W', offset: 14 },
  { key: '3', keyLabel: '3', offset: 15 },
  { key: 'e', keyLabel: 'E', offset: 16 },
  { key: 'r', keyLabel: 'R', offset: 17 },
  { key: '5', keyLabel: '5', offset: 18 },
  { key: 't', keyLabel: 'T', offset: 19 },
  { key: '6', keyLabel: '6', offset: 20 },
  { key: 'y', keyLabel: 'Y', offset: 21 },
  { key: '7', keyLabel: '7', offset: 22 },
  { key: 'u', keyLabel: 'U', offset: 23 },
  { key: 'i', keyLabel: 'I', offset: 24 },
];

/** How many semitones the mapped window covers. */
export const KEY_WINDOW_SEMITONES = KEY_BINDINGS[KEY_BINDINGS.length - 1].offset;

export const LOWEST_BASE_OCTAVE = LOWEST_OCTAVE;
export const HIGHEST_BASE_OCTAVE = HIGHEST_OCTAVE - 1;
export const DEFAULT_BASE_OCTAVE = 4;

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
 * Root in the bass plus the chord above it, so one pad fires four or five
 * instances in the same tick. Without createNewInstance only the last note of
 * each chord would survive.
 */
export const CHORDS: ChordDefinition[] = [
  { id: 'C',     label: 'C',     spelling: 'C3 C E G',    notes: ['piano-C3', 'piano-C4', 'piano-E4', 'piano-G4'] },
  { id: 'Dm',    label: 'Dm',    spelling: 'D3 D F A',    notes: ['piano-D3', 'piano-D4', 'piano-F4', 'piano-A4'] },
  { id: 'Em',    label: 'Em',    spelling: 'E3 E G B',    notes: ['piano-E3', 'piano-E4', 'piano-G4', 'piano-B4'] },
  { id: 'F',     label: 'F',     spelling: 'F3 F A C',    notes: ['piano-F3', 'piano-F4', 'piano-A4', 'piano-C5'] },
  { id: 'G',     label: 'G',     spelling: 'G3 G B D',    notes: ['piano-G3', 'piano-G4', 'piano-B4', 'piano-D5'] },
  { id: 'Am',    label: 'Am',    spelling: 'A3 A C E',    notes: ['piano-A3', 'piano-A4', 'piano-C5', 'piano-E5'] },
  { id: 'G7',    label: 'G7',    spelling: 'G3 G B D F',  notes: ['piano-G3', 'piano-G4', 'piano-B4', 'piano-D5', 'piano-F5'] },
  { id: 'Cmaj7', label: 'Cmaj7', spelling: 'C3 C E G B',  notes: ['piano-C3', 'piano-C4', 'piano-E4', 'piano-G4', 'piano-B4'] },
];

// ── Demo pieces ──────────────────────────────────────────────────────────────

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
  /** One line shown next to the transport */
  blurb: string;
  steps: MelodyStep[];
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Adding your own piece
 * ─────────────────────────────────────────────────────────────────────────────
 * A piece is a flat list of steps. Every step names the notes that start at the
 * same moment and how long it is until the next step begins, in milliseconds.
 * Notes are never explicitly stopped: the samples ring out, which is what makes
 * held bass notes and pedalled chords work without any extra bookkeeping.
 *
 *   { notes: ['piano-C3', 'piano-E4'], step: 400 },  // chord, then wait 400ms
 *   { notes: ['piano-G4'], step: 200 },              // single note, wait 200ms
 *
 * Note ids are `piano-` followed by the file name: C2 through C7 with flats for
 * the black keys, so C#4 is `piano-Db4` and F#2 is `piano-Gb2`.
 *
 * Everything below is public domain. If you add music that is still in
 * copyright, that is a call for whoever publishes the page to make.
 */

/** Shorthand for a single note step. */
const n = (note: string, step: number): MelodyStep => ({ notes: [`piano-${note}`], step });
/** Shorthand for a step where several notes start together. */
const ch = (notes: string[], step: number): MelodyStep => ({ notes: notes.map(x => `piano-${x}`), step });

/** One bar of Bach's arpeggio figure: two low voices, then the six note figure. */
const preludeBar = (bass: [string, string], figure: [string, string, string], ms = 150): MelodyStep[] => [
  n(bass[0], ms), n(bass[1], ms),
  n(figure[0], ms), n(figure[1], ms), n(figure[2], ms),
  n(figure[0], ms), n(figure[1], ms), n(figure[2], ms),
];

/** One beat of the Moonlight triplet, optionally starting a new bass note. */
const moonBeat = (bass: string[], triplet: [string, string, string], ms = 240): MelodyStep[] => [
  ch([...bass, triplet[0]], ms), n(triplet[1], ms), n(triplet[2], ms),
];

export const MELODIES: Melody[] = [
  {
    id: 'ode',
    title: 'Ode to Joy',
    composer: 'Beethoven, 1824',
    blurb: 'Melody over held chords. The calm baseline.',
    steps: [
      ch(['C3', 'G3', 'E4'], 420), n('E4', 420), n('F4', 420), n('G4', 420),
      ch(['C3', 'G3', 'G4'], 420), n('F4', 420), n('E4', 420), n('D4', 420),
      ch(['C3', 'G3', 'C4'], 420), n('C4', 420), n('D4', 420), n('E4', 420),
      ch(['G2', 'D3', 'E4'], 630), n('D4', 210), ch(['C3', 'G3', 'D4'], 900),
    ],
  },
  {
    id: 'elise',
    title: 'Fuer Elise',
    composer: 'Beethoven, 1810',
    blurb: 'Fast sixteenths over a rolling left hand.',
    steps: [
      n('E5', 150), n('Eb5', 150), n('E5', 150), n('Eb5', 150),
      n('E5', 150), n('B4', 150), n('D5', 150), n('C5', 150),
      ch(['A2', 'A4'], 150), n('E3', 150), n('A3', 150),
      n('C4', 150), n('E4', 150), n('A4', 150),
      ch(['E2', 'B4'], 150), n('E3', 150), n('Ab3', 150),
      n('E4', 150), n('Ab4', 150), n('B4', 150),
      ch(['A2', 'C5'], 150), n('E3', 150), n('A3', 150),
      n('E4', 150), n('E5', 150), n('Eb5', 150), n('E5', 150),
      n('Eb5', 150), n('E5', 150), n('B4', 150), n('D5', 150), n('C5', 150),
      ch(['A2', 'E3', 'A3', 'A4'], 1100),
    ],
  },
  {
    id: 'prelude',
    title: 'Prelude in C',
    composer: 'Bach, 1722',
    blurb: 'Nothing is ever damped, so the voice count climbs the whole way.',
    steps: [
      ...preludeBar(['C3', 'E3'], ['G3', 'C4', 'E4']), ...preludeBar(['C3', 'E3'], ['G3', 'C4', 'E4']),
      ...preludeBar(['C3', 'D3'], ['A3', 'D4', 'F4']), ...preludeBar(['C3', 'D3'], ['A3', 'D4', 'F4']),
      ...preludeBar(['B2', 'D3'], ['G3', 'D4', 'F4']), ...preludeBar(['B2', 'D3'], ['G3', 'D4', 'F4']),
      ...preludeBar(['C3', 'E3'], ['G3', 'C4', 'E4']), ...preludeBar(['C3', 'E3'], ['G3', 'C4', 'E4']),
      ch(['C2', 'C3', 'E4', 'G4', 'C5'], 1600),
    ],
  },
  {
    id: 'moonlight',
    title: 'Moonlight Sonata',
    composer: 'Beethoven, 1801',
    blurb: 'Octave bass down at C#2 under an endless triplet.',
    steps: [
      ...moonBeat(['Db2', 'Db3'], ['Ab3', 'Db4', 'E4']),
      ...moonBeat([], ['Ab3', 'Db4', 'E4']),
      ...moonBeat([], ['Ab3', 'Db4', 'E4']),
      ...moonBeat([], ['Ab3', 'Db4', 'E4']),
      ...moonBeat(['Db2', 'Db3'], ['Ab3', 'Db4', 'E4']),
      ...moonBeat([], ['Ab3', 'Db4', 'E4']),
      ...moonBeat([], ['Ab3', 'Db4', 'E4']),
      ...moonBeat([], ['Ab3', 'Db4', 'E4']),
      ...moonBeat(['A2'], ['A3', 'Db4', 'E4']),
      ...moonBeat([], ['A3', 'Db4', 'E4']),
      ...moonBeat(['Gb2'], ['A3', 'D4', 'Gb4']),
      ...moonBeat([], ['A3', 'D4', 'Gb4']),
      ...moonBeat(['Db2', 'Db3'], ['Ab3', 'Db4', 'E4']),
      ...moonBeat([], ['Ab3', 'Db4', 'E4']),
      ...moonBeat([], ['Ab3', 'Db4', 'E4']),
      ...moonBeat([], ['Ab3', 'Db4', 'E4']),
      ch(['Db2', 'Db3', 'Ab3', 'Db4'], 1800),
    ],
  },
  {
    id: 'canon',
    title: 'Canon in D',
    composer: 'Pachelbel, c. 1690',
    blurb: 'The ground bass alone, then the melody on top. D2 up to F#5.',
    steps: [
      n('D3', 700), n('A2', 700), n('B2', 700), n('Gb2', 700),
      n('G2', 700), n('D2', 700), n('G2', 700), n('A2', 700),
      ch(['D3', 'Gb5'], 700), ch(['A2', 'E5'], 700), ch(['B2', 'D5'], 700), ch(['Gb2', 'Db5'], 700),
      ch(['G2', 'B4'], 700), ch(['D2', 'A4'], 700), ch(['G2', 'B4'], 700), ch(['A2', 'Db5'], 700),
      ch(['D2', 'D3', 'Gb4', 'A4', 'D5'], 1800),
    ],
  },
];
