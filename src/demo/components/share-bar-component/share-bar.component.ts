/// <reference types="vite/client" />
import "./share-bar.component.css";

declare const gtag: ((...args: any[]) => void) | undefined;

const COPIED_RESET_MS = 2000;

/**
 * Wires up a share bar that is already in the page markup.
 *
 * The network buttons are plain links to each service's share endpoint, so
 * they work with scripting off. This class only adds the three things a link
 * cannot do: copying the URL to the clipboard, opening the device's own share
 * sheet, and reporting which button was used. If it never runs, the bar still
 * shares.
 *
 * What gets shared comes from the host element:
 *   data-share-url, data-share-title, data-share-text
 */
export class ShareBarComponent {
  private readonly url: string;
  private readonly title: string;
  private readonly text: string;
  private copyTimer: number | null = null;

  constructor(private readonly host: HTMLElement) {
    this.url = host.dataset.shareUrl || window.location.href;
    this.title = host.dataset.shareTitle || document.title;
    this.text = host.dataset.shareText || "";

    this.host.querySelectorAll<HTMLAnchorElement>("[data-share-network]").forEach((link) => {
      link.addEventListener("click", () => {
        this.report(link.dataset.shareNetwork ?? "unknown");
      });
    });

    const copyBtn = this.host.querySelector<HTMLButtonElement>("[data-share-copy]");
    if (copyBtn) copyBtn.addEventListener("click", () => this.copy(copyBtn));

    this.setUpSystemShare();
  }

  /**
   * Instagram has no share URL of its own, and never has: you cannot fill a
   * post from the web. The device's share sheet is the one route that reaches
   * it, along with every other app the visitor has installed. Desktop browsers
   * have no sheet, so the button stays hidden there.
   */
  private setUpSystemShare(): void {
    const button = this.host.querySelector<HTMLButtonElement>("[data-share-system]");
    if (!button || typeof navigator.share !== "function") return;

    this.host.classList.add("share--can-system");

    button.addEventListener("click", async () => {
      try {
        await navigator.share({ title: this.title, text: this.text, url: this.url });
        this.report("system");
      } catch (error) {
        // Cancelling the sheet rejects with AbortError. That is a normal way
        // to use it, not a failure worth reacting to.
        if ((error as DOMException)?.name !== "AbortError") {
          this.report("system_failed");
        }
      }
    });
  }

  private async copy(button: HTMLButtonElement): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.url);
    } catch {
      // No clipboard access (an insecure origin, or the user said no). Select
      // the URL instead so a manual copy is one keystroke away.
      this.fallbackSelect();
      return;
    }

    this.report("copy");
    button.classList.add("share-btn--copied");

    if (this.copyTimer !== null) window.clearTimeout(this.copyTimer);
    this.copyTimer = window.setTimeout(() => {
      button.classList.remove("share-btn--copied");
      this.copyTimer = null;
    }, COPIED_RESET_MS);
  }

  private fallbackSelect(): void {
    const field = document.createElement("input");
    field.value = this.url;
    field.setAttribute("readonly", "");
    field.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(field);
    field.select();
    field.setSelectionRange(0, this.url.length);
    window.setTimeout(() => field.remove(), 0);
  }

  private report(network: string): void {
    if (typeof gtag === "function") {
      gtag("event", "share_click", { network, page: window.location.pathname });
    }
  }
}
