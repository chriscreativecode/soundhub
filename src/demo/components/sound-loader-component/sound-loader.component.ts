/// <reference types="vite/client" />
import "./sound-loader.component.css";
// @ts-ignore
import template from "./sound-loader.component.html?raw";

/** How long the finished desk stays on screen so the last channel is seen going live. */
const SETTLE_MS = 420;
/** Matches the fade in the stylesheet. */
const LEAVE_MS = 320;

/**
 * Progress panel shown while the demo decodes its audio.
 *
 * Renders one channel per sound. Channels start flat and dim; each one lights up
 * and starts moving when its sound reports in, so the wait is readable without
 * having to read the counter.
 */
export class SoundLoaderComponent {
  private container: HTMLElement;
  private root: HTMLElement;
  private desk: HTMLElement;
  private doneEl: HTMLElement;
  private totalEl: HTMLElement;
  private currentEl: HTMLElement;

  private channels: HTMLElement[] = [];
  private total: number;
  private done = 0;
  /** Guards against a sound reporting in twice. */
  private seen = new Set<string>();

  constructor(container: HTMLElement, total: number) {
    this.container = container;
    this.total = Math.max(0, total);

    container.innerHTML = template;

    this.root = container.querySelector(".sound-loader") as HTMLElement;
    this.desk = container.querySelector(".sound-loader__desk") as HTMLElement;
    this.doneEl = container.querySelector(".sound-loader__done") as HTMLElement;
    this.totalEl = container.querySelector(".sound-loader__total") as HTMLElement;
    this.currentEl = container.querySelector(".sound-loader__current") as HTMLElement;

    this.buildChannels();
    this.totalEl.textContent = String(this.total);
    this.doneEl.textContent = "0";
  }

  private buildChannels(): void {
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < this.total; i++) {
      const channel = document.createElement("div");
      channel.className = "sound-loader__channel";

      // Spread the loop across the channels so the desk breathes instead of
      // pulsing in lockstep. Prime-ish step keeps neighbours out of phase.
      channel.style.setProperty("--phase", `${(i * 137) % 1500}ms`);

      const bar = document.createElement("div");
      bar.className = "sound-loader__bar";
      channel.appendChild(bar);

      fragment.appendChild(channel);
      this.channels.push(channel);
    }

    this.desk.appendChild(fragment);
  }

  /** Turns an id like "little-wonders-song" into "little wonders song". */
  private humanise(soundId: string): string {
    return soundId.replace(/[-_]/g, " ");
  }

  /** Reports a sound as decoded and lights up the next free channel. */
  public markLoaded(soundId: string): void {
    if (this.seen.has(soundId)) return;
    this.seen.add(soundId);

    const channel = this.channels[this.done];
    if (channel) channel.classList.add("is-loaded");

    this.done = Math.min(this.done + 1, this.total);
    this.doneEl.textContent = String(this.done);

    this.currentEl.classList.remove("is-error");
    this.currentEl.textContent = this.humanise(soundId);
  }

  /** Marks a channel as failed. The demo carries on with whatever did load. */
  public markFailed(soundId?: string): void {
    const channel = this.channels[this.done];
    if (channel) channel.classList.add("is-failed");

    this.done = Math.min(this.done + 1, this.total);
    this.doneEl.textContent = String(this.done);

    this.currentEl.classList.add("is-error");
    this.currentEl.textContent = soundId
      ? `${this.humanise(soundId)} failed to load`
      : "a sound failed to load";
  }

  /**
   * Holds the finished desk briefly, fades it out and removes it.
   * Resolves once the panel is gone, so the caller can reveal the controls.
   */
  public complete(): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(() => {
        this.root.classList.add("is-leaving");
        window.setTimeout(() => {
          this.destroy();
          resolve();
        }, LEAVE_MS);
      }, SETTLE_MS);
    });
  }

  public destroy(): void {
    this.container.innerHTML = "";
    this.channels = [];
  }
}
