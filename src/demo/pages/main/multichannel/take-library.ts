import { LocalStorageManagerManager } from '../../../services/local-storage-manager';
import { RecordedEvent } from './performance-recorder';

export interface SavedTake {
  id: string;
  name: string;
  /** Epoch milliseconds */
  createdAt: number;
  durationMs: number;
  events: RecordedEvent[];
}

export type SaveResult =
  | { ok: true; take: SavedTake }
  | { ok: false; reason: 'empty' | 'full' | 'storage' };

/**
 * Keeps recorded performances in local storage so they survive a reload.
 *
 * Only note ids and timings are stored, never audio, so a take is a couple of
 * kilobytes and stays playable on either engine. Everything here tolerates a
 * storage that is unavailable, full, or holding something it did not write:
 * a demo page is not worth throwing over.
 */
export class TakeLibrary {
  private static readonly KEY = 'multichannel-takes';
  /** Local storage is a shared, small budget, so the list does not grow forever. */
  static readonly MAX_TAKES = 12;

  static list(): SavedTake[] {
    let raw: unknown;
    try {
      raw = LocalStorageManagerManager.getItem(TakeLibrary.KEY);
    } catch {
      return [];
    }
    if (!Array.isArray(raw)) return [];

    return raw.filter(TakeLibrary.isTake).sort((a, b) => b.createdAt - a.createdAt);
  }

  static get(id: string): SavedTake | undefined {
    return TakeLibrary.list().find(t => t.id === id);
  }

  static save(name: string, events: RecordedEvent[], durationMs: number): SaveResult {
    if (events.length === 0) return { ok: false, reason: 'empty' };

    const takes = TakeLibrary.list();
    if (takes.length >= TakeLibrary.MAX_TAKES) return { ok: false, reason: 'full' };

    const take: SavedTake = {
      id: `take-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      name: TakeLibrary.cleanName(name) || TakeLibrary.suggestName(),
      createdAt: Date.now(),
      durationMs: Math.round(durationMs),
      events: events.map(e => ({ at: Math.round(e.at), noteId: e.noteId, type: e.type })),
    };

    if (!TakeLibrary.write([take, ...takes])) return { ok: false, reason: 'storage' };
    return { ok: true, take };
  }

  static remove(id: string): void {
    TakeLibrary.write(TakeLibrary.list().filter(t => t.id !== id));
  }

  /** "Take 1", "Take 2", and so on, skipping names already in use. */
  static suggestName(): string {
    const used = new Set(TakeLibrary.list().map(t => t.name.toLowerCase()));
    for (let i = 1; i <= TakeLibrary.MAX_TAKES + 1; i++) {
      const candidate = `Take ${i}`;
      if (!used.has(candidate.toLowerCase())) return candidate;
    }
    return `Take ${Date.now().toString(36)}`;
  }

  static cleanName(name: string): string {
    return name.trim().replace(/\s+/g, ' ').slice(0, 40);
  }

  private static write(takes: SavedTake[]): boolean {
    try {
      LocalStorageManagerManager.setItem(TakeLibrary.KEY, takes);
      return true;
    } catch {
      // Quota exceeded, or storage blocked entirely in this browsing mode
      return false;
    }
  }

  private static isTake(value: unknown): value is SavedTake {
    if (typeof value !== 'object' || value === null) return false;
    const t = value as Partial<SavedTake>;
    return typeof t.id === 'string'
      && typeof t.name === 'string'
      && typeof t.createdAt === 'number'
      && typeof t.durationMs === 'number'
      && Array.isArray(t.events)
      && t.events.every(e => typeof e?.at === 'number' && typeof e?.noteId === 'string'
        && (e.type === 'on' || e.type === 'off'));
  }
}
