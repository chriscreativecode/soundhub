/// <reference types="vite/client" />
import "./share-bar.component.css";

declare const gtag: ((...args: any[]) => void) | undefined;

const COPIED_RESET_MS = 2000;

/**
 * Wires up a share bar that is already in the page markup.
 *
 * The network buttons are plain links to each service's share endpoint, so
 * they work with scripting off. This class only adds the two things a link
 * cannot do: copying the URL to the clipboard, and reporting which button was
 * used. If it never runs, the bar still shares.
 */
export class ShareBarComponent {
  private copyTimer: number | null = null;

  constructor(private readonly host: HTMLElement) {
    this.host.querySelectorAll<HTMLAnchorElement>("[data-share-network]").forEach((link) => {
      link.addEventListener("click", () => {
        this.report(link.dataset.shareNetwork ?? "unknown");
      });
    });

    const copyBtn = this.host.querySelector<HTMLButtonElement>("[data-share-copy]");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => this.copy(copyBtn));
    }
  }

  private async copy(button: HTMLButtonElement): Promise<void> {
    const url = button.dataset.shareCopy || window.location.href;

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // No clipboard access (an insecure origin, or the user said no). Select
      // the URL instead so a manual copy is one keystroke away.
      this.fallbackSelect(url);
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

  private fallbackSelect(url: string): void {
    const field = document.createElement("input");
    field.value = url;
    field.setAttribute("readonly", "");
    field.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(field);
    field.select();
    field.setSelectionRange(0, url.length);
    window.setTimeout(() => field.remove(), 0);
  }

  private report(network: string): void {
    if (typeof gtag === "function") {
      gtag("event", "share_click", { network, page: window.location.pathname });
    }
  }
}
