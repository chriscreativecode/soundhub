import { SoundManager } from "../../sound-manager/sound-manager";

/**
 * Records the calls the demo makes into the library, so the page can show a
 * visitor the exact code behind whatever they just clicked.
 *
 * Nothing here is wired into the controls by hand. `instrumentSoundManager`
 * wraps the manager in a Proxy, which means a control added later is logged
 * without anyone remembering to log it, and a soundscape prints as the same
 * code you would write yourself. Only calls made from the demo pass through
 * the proxy; the library's own internal calls use `this` and stay out of it.
 */

export interface ApiCall {
  method: string;
  args: unknown[];
  /** Consecutive identical calls collapse into one line with a counter */
  repeats: number;
}

/** Calls worth showing. Getters and state polling would drown everything else. */
const LOGGED_METHODS = new Set<string>([
  "play",
  "playSprite",
  "pause",
  "resume",
  "stop",
  "seek",
  "stopAllSounds",
  "pauseAllSounds",
  "resumeAllSounds",
  "fadeIn",
  "fadeOut",
  "fadeGlobalIn",
  "fadeGlobalOut",
  "setSoundVolume",
  "setGlobalVolume",
  "muteAllSounds",
  "unmuteAllSounds",
  "mute",
  "unmute",
  "toggleMute",
  "toggleGlobalMute",
  "setLoop",
  "setSoundSprite",
  "removeSpriteSound",
  "setPan",
  "removePan",
  "setGlobalPan",
  "resetPan",
  "setSpatialPosition",
  "setMasterSpatialPosition",
  "resetSpatialPosition",
  "resetMasterSpatialPosition",
  "updatePannerConfigById",
  "setPlaybackRate",
  "reset",
  "resetSound",
  "updateSoundOptions",
  "loadSounds",
  "loadSound",
  "removeSound",
  "unloadSound",
  "setMasterLimiter",
]);

/**
 * Trailing arguments the demo passes for its own bookkeeping. Printing
 * `setPan('rain', 0.4, true)` would teach the reader the wrong signature, so
 * a trailing `skipDispatchEvent` style boolean is dropped from the output.
 */
const METHODS_WITH_TRAILING_FLAG = new Set<string>([
  "play",
  "pause",
  "resume",
  "stop",
  "seek",
  "setSoundVolume",
  "setPan",
  "setPlaybackRate",
]);

const MAX_ENTRIES = 200;

export class ApiLogger {
  private entries: ApiCall[] = [];
  private listeners = new Set<(entries: readonly ApiCall[]) => void>();

  public record(method: string, args: unknown[]): void {
    const cleaned = this.stripTrailingFlag(method, args);
    const last = this.entries[this.entries.length - 1];

    // Dragging a slider fires a call per pixel. Collapsing consecutive calls
    // to the same method and target keeps the panel readable while still
    // showing the value the visitor landed on.
    if (last && last.method === method && this.sameTarget(last.args, cleaned)) {
      last.args = cleaned;
      last.repeats += 1;
    } else {
      this.entries.push({ method, args: cleaned, repeats: 1 });
      if (this.entries.length > MAX_ENTRIES) {
        this.entries.splice(0, this.entries.length - MAX_ENTRIES);
      }
    }

    this.emit();
  }

  public clear(): void {
    this.entries = [];
    this.emit();
  }

  public getEntries(): readonly ApiCall[] {
    return this.entries;
  }

  public subscribe(listener: (entries: readonly ApiCall[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.entries);
    return () => this.listeners.delete(listener);
  }

  /** The whole log as pasteable source */
  public toSource(): string {
    return this.entries.map((entry) => formatCall(entry)).join("\n");
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener(this.entries));
  }

  private stripTrailingFlag(method: string, args: unknown[]): unknown[] {
    if (!METHODS_WITH_TRAILING_FLAG.has(method)) return args;
    const copy = [...args];
    while (copy.length && typeof copy[copy.length - 1] === "boolean") {
      copy.pop();
    }
    return copy;
  }

  private sameTarget(a: unknown[], b: unknown[]): boolean {
    const first = (list: unknown[]) => (typeof list[0] === "string" ? list[0] : "");
    return first(a) === first(b);
  }
}

/** Renders one recorded call as the line a developer would write. */
export function formatCall(entry: ApiCall): string {
  const args = entry.args.map(formatValue).join(", ");
  return `soundManager.${entry.method}(${args});`;
}

/**
 * The same line, tokenised for display. Built from the recorded arguments
 * rather than by re-parsing the string, so a sound id containing a bracket or
 * a quote can never colour the rest of the line.
 */
export function formatCallHtml(entry: ApiCall): string {
  const args = entry.args.map(formatValueHtml).join(", ");
  return (
    `<span class="tok-obj">soundManager</span>.` +
    `<span class="tok-fn">${escapeHtml(entry.method)}</span>` +
    `<span class="tok-punc">(</span>${args}<span class="tok-punc">)</span>;`
  );
}

function formatValueHtml(value: unknown): string {
  if (value === null || value === undefined) {
    return `<span class="tok-keyword">${value === null ? "null" : "undefined"}</span>`;
  }
  if (typeof value === "string") {
    return `<span class="tok-str">'${escapeHtml(value)}'</span>`;
  }
  if (typeof value === "number") {
    return `<span class="tok-num">${roundForDisplay(value)}</span>`;
  }
  if (typeof value === "boolean") {
    return `<span class="tok-keyword">${value}</span>`;
  }
  if (Array.isArray(value)) {
    return `<span class="tok-punc">[</span>${value.map(formatValueHtml).join(", ")}<span class="tok-punc">]</span>`;
  }
  if (typeof value === "object") {
    const pairs = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .map(([key, v]) => `<span class="tok-key">${escapeHtml(key)}</span>: ${formatValueHtml(v)}`);
    if (!pairs.length) return `<span class="tok-punc">{}</span>`;
    return `<span class="tok-punc">{</span> ${pairs.join(", ")} <span class="tok-punc">}</span>`;
  }
  return escapeHtml(String(value));
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return `'${value.replace(/'/g, "\\'")}'`;
  if (typeof value === "number") return String(roundForDisplay(value));
  if (typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    return `[${value.map(formatValue).join(", ")}]`;
  }

  if (typeof value === "object") {
    const pairs = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .map(([key, v]) => `${key}: ${formatValue(v)}`);
    return pairs.length ? `{ ${pairs.join(", ")} }` : "{}";
  }

  return String(value);
}

function roundForDisplay(value: number): number {
  if (Number.isInteger(value)) return value;
  return Math.round(value * 1000) / 1000;
}

/**
 * Wraps a SoundManager so every public call the demo makes is recorded.
 * The returned object is used everywhere the real manager was used before.
 */
export function instrumentSoundManager(manager: SoundManager, logger: ApiLogger): SoundManager {
  // Progress events make the read-only methods run dozens of times a second,
  // so each wrapper is built once and reused rather than rebound per access.
  const wrappers = new Map<string, Function>();

  return new Proxy(manager, {
    get(target, property) {
      const value = Reflect.get(target, property, target);

      if (typeof value !== "function" || typeof property !== "string") {
        return value;
      }

      const cached = wrappers.get(property);
      if (cached) return cached;

      const wrapper = LOGGED_METHODS.has(property)
        ? (...args: unknown[]) => {
            logger.record(property, args);
            return value.apply(target, args);
          }
        : value.bind(target);

      wrappers.set(property, wrapper);
      return wrapper;
    },
  }) as SoundManager;
}
