import { SoundEvent } from "../../../sound-manager/sound-event.interface";
import { SoundEventsEnum } from "../../../sound-manager/sound-events.enum";
import { SoundManager } from "../../../sound-manager/sound-manager";
import { ApiCall, ApiLogger, escapeHtml, formatCallHtml } from "../../services/api-logger";
import { LocalStorageManagerManager } from "../../services/local-storage-manager";
import { svgIcon } from "../shared/icon-utils";
/* @ts-ignore */
import consoleDockHtml from "./console-dock.component.html?raw";
/* @ts-ignore */
import "./console-dock.component.css";

const STORAGE_KEY = "sound-manager-ts-demo-console-open";
const MAX_EVENT_ROWS = 120;

/** Events that say "audio is now doing something different" get the loud colour. */
const TRANSPORT_EVENTS = new Set<string>([
  SoundEventsEnum.STARTED,
  SoundEventsEnum.RESUMED,
  SoundEventsEnum.PAUSED,
  SoundEventsEnum.STOPPED,
  SoundEventsEnum.ENDED,
]);

type PaneName = "api" | "events";

/**
 * A dock along the bottom of the demo with two views on the same session:
 * the API calls the page just made, and the events the library dispatched
 * back. Together they turn the demo into live documentation - every control
 * shows both the code that drives it and the signal it produces.
 */
export class ConsoleDock {
  private root: HTMLElement;
  private body: HTMLElement;
  private handle: HTMLButtonElement;
  private countEl: HTMLElement;
  private apiLog: HTMLElement;
  private apiEmpty: HTMLElement;
  private eventLog: HTMLElement;
  private eventsEmpty: HTMLElement;
  private showProgressInput: HTMLInputElement;
  private copyButton: HTMLButtonElement;

  private activePane: PaneName = "api";
  private isOpen = false;
  private eventRows = 0;
  private showProgress = false;
  /** Last time a progress row was written, per sound. */
  private lastProgressAt = new Map<string, number>();
  private unsubscribeLogger: () => void;
  private eventHandler: (event: SoundEvent) => void;
  private copyResetTimer: number | null = null;

  constructor(
    container: HTMLElement,
    private logger: ApiLogger,
    private soundManager: SoundManager
  ) {
    container.innerHTML = this.interpolate(consoleDockHtml);

    this.root = container.querySelector(".console-dock")!;
    this.body = container.querySelector(".console-dock__body")!;
    this.handle = container.querySelector(".console-dock__handle")!;
    this.countEl = container.querySelector("[data-count]")!;
    this.apiLog = container.querySelector("[data-api-log]")!;
    this.apiEmpty = container.querySelector("[data-api-empty]")!;
    this.eventLog = container.querySelector("[data-event-log]")!;
    this.eventsEmpty = container.querySelector("[data-events-empty]")!;
    this.showProgressInput = container.querySelector("[data-show-progress]")!;
    this.copyButton = container.querySelector("[data-copy]")!;

    this.bindChrome();
    this.unsubscribeLogger = this.logger.subscribe((entries) => this.renderApiLog(entries));
    this.eventHandler = (event: SoundEvent) => this.appendEvent(event);
    Object.values(SoundEventsEnum).forEach((type) => {
      this.soundManager.addEventListener(type, this.eventHandler);
    });

    this.setOpen(LocalStorageManagerManager.getItem(STORAGE_KEY) === "true", false);
    this.setPane("api");
  }

  /** Lets the keyboard layer flip the dock without knowing its internals. */
  public toggle(): void {
    this.setOpen(!this.isOpen);
  }

  public destroy(): void {
    this.unsubscribeLogger();
    Object.values(SoundEventsEnum).forEach((type) => {
      this.soundManager.removeEventListener(type, this.eventHandler);
    });
    if (this.copyResetTimer) window.clearTimeout(this.copyResetTimer);
  }

  private interpolate(tpl: string): string {
    return tpl
      .replace(/\{\{iconCode\}\}/g, svgIcon("code", 15))
      .replace(/\{\{iconPulse\}\}/g, svgIcon("pulse", 15))
      .replace(/\{\{iconCopy\}\}/g, svgIcon("copy", 14))
      .replace(/\{\{iconTrash\}\}/g, svgIcon("trash", 14))
      .replace(/\{\{iconCollapse\}\}/g, svgIcon("collapse", 16));
  }

  private bindChrome(): void {
    this.handle.addEventListener("click", () => this.setOpen(!this.isOpen));

    this.root.querySelectorAll<HTMLButtonElement>(".console-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        this.setPane(tab.dataset.tab as PaneName);
        if (!this.isOpen) this.setOpen(true);
      });
    });

    this.showProgressInput.addEventListener("change", () => {
      this.showProgress = this.showProgressInput.checked;
      this.root.classList.toggle("hide-progress", !this.showProgress);
    });
    this.root.classList.add("hide-progress");

    this.copyButton.addEventListener("click", () => this.copyActivePane());

    this.root.querySelector("[data-clear]")!.addEventListener("click", () => {
      if (this.activePane === "api") {
        this.logger.clear();
      } else {
        this.eventLog.innerHTML = "";
        this.eventRows = 0;
        this.eventsEmpty.hidden = false;
      }
    });
  }

  private setOpen(open: boolean, persist = true): void {
    this.isOpen = open;
    this.root.classList.toggle("is-open", open);
    this.body.hidden = !open;
    this.handle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("has-open-console", open);
    if (persist) LocalStorageManagerManager.setItem(STORAGE_KEY, String(open));
  }

  private setPane(pane: PaneName): void {
    this.activePane = pane;
    this.root.dataset.pane = pane;

    this.root.querySelectorAll<HTMLButtonElement>(".console-tab").forEach((tab) => {
      const active = tab.dataset.tab === pane;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });

    this.root.querySelectorAll<HTMLElement>(".console-pane").forEach((el) => {
      const active = el.dataset.pane === pane;
      el.classList.toggle("is-active", active);
      el.hidden = !active;
    });
  }

  private renderApiLog(entries: readonly ApiCall[]): void {
    const atBottom = this.isScrolledToBottom(this.apiLog);

    this.apiLog.innerHTML = entries
      .map((entry) => {
        const repeat = entry.repeats > 1
          ? `<span class="console-repeat" title="${entry.repeats} calls collapsed into one line">x${entry.repeats}</span>`
          : "";
        return `<span class="console-line">${formatCallHtml(entry)}${repeat}</span>`;
      })
      .join("\n");

    this.apiEmpty.hidden = entries.length > 0;
    this.countEl.textContent = entries.length === 1 ? "1 call" : `${entries.length} calls`;

    if (atBottom) this.apiLog.scrollTop = this.apiLog.scrollHeight;
  }

  private appendEvent(event: SoundEvent): void {
    const isProgress = event.type === SoundEventsEnum.PROGRESS;

    // Progress fires many times a second per sound. Left unchecked it fills
    // the whole buffer within a second and evicts every event worth reading,
    // so it is off by default and sampled even when asked for.
    if (isProgress) {
      if (!this.showProgress) return;

      const key = event.soundId ?? "master";
      const now = performance.now();
      if (now - (this.lastProgressAt.get(key) ?? 0) < 300) return;
      this.lastProgressAt.set(key, now);
    }

    const atBottom = this.isScrolledToBottom(this.eventLog);

    const row = document.createElement("li");
    row.className = "console-event";
    if (isProgress) row.classList.add("is-progress");
    if (TRANSPORT_EVENTS.has(event.type)) row.classList.add("is-transport");
    if (event.type === SoundEventsEnum.ERROR) row.classList.add("is-error");

    row.innerHTML =
      `<span class="console-event__type">${escapeHtml(event.type)}</span>` +
      `<span class="console-event__target">${escapeHtml(event.soundId ?? "master")}</span>` +
      `<span class="console-event__detail">${this.describe(event)}</span>`;

    this.eventLog.appendChild(row);
    this.eventRows += 1;
    this.eventsEmpty.hidden = true;

    while (this.eventRows > MAX_EVENT_ROWS && this.eventLog.firstElementChild) {
      this.eventLog.removeChild(this.eventLog.firstElementChild);
      this.eventRows -= 1;
    }

    if (atBottom) this.eventLog.scrollTop = this.eventLog.scrollHeight;
  }

  /** The one number that explains the event, rather than a dump of the payload. */
  private describe(event: SoundEvent): string {
    const parts: string[] = [];
    if (typeof event.volume === "number") parts.push(`volume ${round(event.volume)}`);
    if (typeof event.pan === "number") parts.push(`pan ${round(event.pan)}`);
    if (typeof event.playbackRate === "number") parts.push(`rate ${round(event.playbackRate)}`);
    if (typeof event.progress === "number") parts.push(`${Math.round(event.progress * 100)}%`);
    if (event.position) {
      parts.push(`x ${round(event.position.x)} y ${round(event.position.y)} z ${round(event.position.z)}`);
    }
    if (event.error) parts.push(event.error.message);
    return escapeHtml(parts.join("  ·  "));
  }

  private async copyActivePane(): Promise<void> {
    const text = this.activePane === "api"
      ? this.logger.toSource()
      : Array.from(this.eventLog.querySelectorAll(".console-event"))
          .map((row) => (row as HTMLElement).innerText.replace(/\s+/g, " ").trim())
          .join("\n");

    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      this.flashCopied();
    } catch {
      // Clipboard permission can be denied; selecting the text still works.
      this.copyButton.classList.add("is-failed");
      window.setTimeout(() => this.copyButton.classList.remove("is-failed"), 1200);
    }
  }

  private flashCopied(): void {
    this.copyButton.classList.add("is-copied");
    if (this.copyResetTimer) window.clearTimeout(this.copyResetTimer);
    this.copyResetTimer = window.setTimeout(() => {
      this.copyButton.classList.remove("is-copied");
    }, 1400);
  }

  /** Only auto-scroll when the reader has not scrolled back to look at something. */
  private isScrolledToBottom(el: HTMLElement): boolean {
    return el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
