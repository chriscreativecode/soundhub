import { svgIcon } from "../../../components/shared/icon-utils";

export interface ShortcutActions {
  togglePlayAll: () => void;
  stopAll: () => void;
  toggleMuteAll: () => void;
  toggleConsole: () => void;
  focusSearch: () => void;
  playNth: (index: number) => void;
  startScene: (index: number) => void;
}

interface ShortcutRow {
  keys: string[];
  description: string;
}

const SHORTCUTS: { group: string; rows: ShortcutRow[] }[] = [
  {
    group: "Transport",
    rows: [
      { keys: ["Space"], description: "Pause everything, or resume what was paused" },
      { keys: ["S"], description: "Stop every channel" },
      { keys: ["M"], description: "Mute or unmute the master output" },
      { keys: ["1", "…", "9"], description: "Play or pause the matching channel" },
    ],
  },
  {
    group: "Scenes",
    rows: [
      { keys: ["Shift", "1", "…", "4"], description: "Start a soundscape" },
    ],
  },
  {
    group: "This page",
    rows: [
      { keys: ["/"], description: "Jump to the search field" },
      { keys: ["C"], description: "Open or close the library console" },
      { keys: ["?"], description: "Show this list" },
      { keys: ["Esc"], description: "Close this list" },
    ],
  },
];

/**
 * Keyboard layer.
 *
 * A page of transport controls that cannot be driven from the keyboard is a
 * page you have to aim at. Typing into a field, or holding a modifier the
 * browser already owns, always wins over these bindings.
 */
export class KeyboardShortcuts {
  private overlay!: HTMLElement;
  private isOpen = false;
  private lastFocused: HTMLElement | null = null;
  private keyHandler: (event: KeyboardEvent) => void;

  constructor(container: HTMLElement, private actions: ShortcutActions) {
    this.renderOverlay(container);
    this.keyHandler = (event) => this.handleKey(event);
    document.addEventListener("keydown", this.keyHandler);
  }

  public destroy(): void {
    document.removeEventListener("keydown", this.keyHandler);
  }

  public open(): void {
    this.lastFocused = document.activeElement as HTMLElement;
    this.isOpen = true;
    this.overlay.hidden = false;
    document.body.classList.add("has-open-dialog");
    (this.overlay.querySelector(".shortcuts__close") as HTMLButtonElement)?.focus();
  }

  public close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.overlay.hidden = true;
    document.body.classList.remove("has-open-dialog");
    this.lastFocused?.focus();
  }

  private renderOverlay(container: HTMLElement): void {
    const groups = SHORTCUTS.map(
      (group) => `
        <section class="shortcuts__group">
          <h3 class="shortcuts__group-title">${group.group}</h3>
          <dl class="shortcuts__list">
            ${group.rows
              .map(
                (row) => `
              <div class="shortcuts__row">
                <dt>${row.keys.map((key) => (key === "…" ? `<span class="shortcuts__ellipsis">…</span>` : `<kbd>${key}</kbd>`)).join("")}</dt>
                <dd>${row.description}</dd>
              </div>`
              )
              .join("")}
          </dl>
        </section>`
    ).join("");

    container.innerHTML = `
      <div class="shortcuts-overlay" hidden role="dialog" aria-modal="true" aria-labelledby="shortcutsTitle">
        <div class="shortcuts-overlay__scrim" data-close></div>
        <div class="shortcuts">
          <header class="shortcuts__head">
            <span class="shortcuts__icon">${svgIcon("keyboard", 20)}</span>
            <h2 class="shortcuts__title" id="shortcutsTitle">Keyboard shortcuts</h2>
            <button type="button" class="shortcuts__close" data-close aria-label="Close">${svgIcon("close", 15)}</button>
          </header>
          <div class="shortcuts__body">${groups}</div>
        </div>
      </div>`;

    this.overlay = container.querySelector(".shortcuts-overlay")!;
    this.overlay.querySelectorAll("[data-close]").forEach((element) => {
      element.addEventListener("click", () => this.close());
    });
  }

  /** True while the visitor is typing, so letters stay letters. */
  private isTyping(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null;
    if (!element) return false;
    const tag = element.tagName;
    return (
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      element.isContentEditable === true
    );
  }

  private handleKey(event: KeyboardEvent): void {
    if (event.key === "Escape" && this.isOpen) {
      event.preventDefault();
      this.close();
      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (this.isTyping(event.target)) return;

    // Shift + digit picks a scene; the same digit alone picks a channel.
    if (event.shiftKey) {
      if (event.key === "?") {
        event.preventDefault();
        this.isOpen ? this.close() : this.open();
        return;
      }
      const sceneIndex = "!@#$".indexOf(event.key);
      if (sceneIndex !== -1) {
        event.preventDefault();
        this.actions.startScene(sceneIndex);
      }
      return;
    }

    switch (event.key) {
      case " ":
        event.preventDefault();
        this.actions.togglePlayAll();
        break;
      case "s":
        event.preventDefault();
        this.actions.stopAll();
        break;
      case "m":
        event.preventDefault();
        this.actions.toggleMuteAll();
        break;
      case "c":
        event.preventDefault();
        this.actions.toggleConsole();
        break;
      case "/":
        event.preventDefault();
        this.actions.focusSearch();
        break;
      case "?":
        event.preventDefault();
        this.isOpen ? this.close() : this.open();
        break;
      default:
        if (event.key >= "1" && event.key <= "9") {
          event.preventDefault();
          this.actions.playNth(Number(event.key) - 1);
        }
    }
  }
}
