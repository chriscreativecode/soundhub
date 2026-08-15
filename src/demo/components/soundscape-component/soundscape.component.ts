import { SoundEventsEnum } from "../../../sound-manager/sound-events.enum";
import { SoundManager } from "../../../sound-manager/sound-manager";
import { Soundscape } from "../../pages/main/general/soundscapes";
import { getSoundMeta } from "../../pages/main/general/sound-catalog";
import { svgIcon } from "../shared/icon-utils";
/* @ts-ignore */
import "./soundscape.component.css";

declare function gtag(...args: any[]): void;

/**
 * Scene launcher.
 *
 * One button starts several channels at once, each with its own volume, place
 * in the stereo field and playback rate, all fading up together. It is the
 * fastest way to show what the library is actually for: not playing a file,
 * but running a mix.
 */
export class SoundscapeComponent {
  private root: HTMLElement;
  private activeId: string | null = null;
  private buttons = new Map<string, HTMLButtonElement>();
  private stopButton!: HTMLButtonElement;
  private stopHandler: () => void;

  constructor(
    container: HTMLElement,
    private soundManager: SoundManager,
    private scenes: Soundscape[],
    private isLoaded: (id: string) => boolean
  ) {
    this.root = container;
    this.render();
    this.bind();

    // Anything that halts everything ends the scene, including the master
    // transport, so the active pill never lies about what is running.
    this.stopHandler = () => this.setActive(null);
    this.soundManager.addEventListener(SoundEventsEnum.RESET, this.stopHandler);
  }

  /** Shift + a digit starts the matching scene from the keyboard. */
  public startByIndex(index: number): void {
    const scene = this.scenes[index];
    if (!scene) return;
    if (this.activeId === scene.id) {
      this.stopScene();
    } else {
      this.startScene(scene.id);
    }
  }

  public destroy(): void {
    this.soundManager.removeEventListener(SoundEventsEnum.RESET, this.stopHandler);
  }

  private playableLayers(scene: Soundscape) {
    return scene.layers.filter((layer) => this.isLoaded(layer.id));
  }

  private render(): void {
    const cards = this.scenes
      .map((scene) => {
        const layers = this.playableLayers(scene);
        const disabled = layers.length === 0;
        const names = layers.map((layer) => getSoundMeta(layer.id).label).join(" · ");

        return `
          <button type="button" class="scene" data-scene="${scene.id}" ${disabled ? "disabled" : ""}
                  title="${disabled ? "This scene needs sounds that failed to load" : scene.blurb}">
            <span class="scene__icon">${svgIcon(scene.icon, 22)}</span>
            <span class="scene__text">
              <span class="scene__name">${scene.name}</span>
              <span class="scene__blurb">${scene.blurb}</span>
              <span class="scene__layers">${names || "unavailable"}</span>
            </span>
            <span class="scene__bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          </button>`;
      })
      .join("");

    this.root.innerHTML = `
      <section class="soundscapes control-group" aria-labelledby="soundscapesTitle">
        <div class="soundscapes__head">
          <div>
            <h2 class="soundscapes__title" id="soundscapesTitle">Soundscapes</h2>
            <p class="soundscapes__lead">
              One click layers several channels at once, each with its own volume, panning and
              playback rate. Open the console below to see the exact calls it makes.
            </p>
          </div>
          <button type="button" class="scene-stop" data-stop-scene disabled>
            ${svgIcon("stop", 13)}<span>Stop scene</span>
          </button>
        </div>
        <div class="soundscapes__grid">${cards}</div>
      </section>`;

    this.root.querySelectorAll<HTMLButtonElement>("[data-scene]").forEach((button) => {
      this.buttons.set(button.dataset.scene!, button);
    });
    this.stopButton = this.root.querySelector("[data-stop-scene]")!;
  }

  private bind(): void {
    this.buttons.forEach((button, id) => {
      button.addEventListener("click", () => {
        if (this.activeId === id) {
          this.stopScene();
        } else {
          this.startScene(id);
        }
      });
    });

    this.stopButton.addEventListener("click", () => this.stopScene());
  }

  private startScene(id: string): void {
    const scene = this.scenes.find((candidate) => candidate.id === id);
    if (!scene) return;

    const layers = this.playableLayers(scene);
    if (!layers.length) return;

    // A scene replaces whatever was running; two scenes at once is mud.
    this.soundManager.stopAllSounds();

    layers.forEach((layer) => {
      this.soundManager.play(layer.id, {
        volume: layer.volume,
        pan: layer.pan,
        playbackRate: layer.playbackRate ?? 1,
        loop: true,
        maxLoops: -1,
        fadeInDuration: scene.fadeInDuration,
        trackProgress: true,
      });
    });

    this.setActive(id);

    if (typeof gtag === "function") {
      gtag("event", "soundscape_start", { scene: id, demo: "general" });
    }
  }

  private stopScene(): void {
    this.soundManager.stopAllSounds();
    this.setActive(null);
  }

  private setActive(id: string | null): void {
    this.activeId = id;
    this.buttons.forEach((button, sceneId) => {
      const active = sceneId === id;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    this.stopButton.disabled = id === null;
  }
}
