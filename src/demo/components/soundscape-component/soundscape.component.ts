import { SoundEvent } from "../../../sound-manager/sound-event.interface";
import { SoundEventsEnum } from "../../../sound-manager/sound-events.enum";
import { SoundManager } from "../../../sound-manager/sound-manager";
import { SoundPanType } from "../../../sound-manager/sound-pan-type.enum";
import { describePosition, Soundscape, SpatialPosition } from "../../pages/main/general/soundscapes";
import { getSoundMeta } from "../../pages/main/general/sound-catalog";
import { svgIcon } from "../shared/icon-utils";
/* @ts-ignore */
import "./soundscape.component.css";

declare function gtag(...args: any[]): void;

/**
 * Scene launcher.
 *
 * One button starts several channels at once, each with its own volume, its own
 * point in 3D space and its own playback rate, all fading up together. It is
 * the fastest way to show what the library is actually for: not playing a file,
 * but placing a mix around the listener.
 */
export class SoundscapeComponent {
  private root: HTMLElement;
  private activeId: string | null = null;
  private buttons = new Map<string, HTMLButtonElement>();
  private stopButton!: HTMLButtonElement;
  private stopHandler: (event: SoundEvent) => void;
  /** Ids this component put in 3D, so it can hand them back as stereo later. */
  private placedLayers: string[] = [];

  constructor(
    container: HTMLElement,
    private soundManager: SoundManager,
    private scenes: Soundscape[],
    private isLoaded: (id: string) => boolean,
    /** So each channel strip can show where the scene just put it */
    private onLayersPlaced?: (placements: { id: string; position: SpatialPosition }[]) => void
  ) {
    this.root = container;
    this.render();
    this.bind();

    // Anything that halts everything ends the scene, including the master
    // transport, so the active pill never lies about what is running. The
    // library has already cleared the spatial nodes by then.
    // A single strip resetting itself is not the scene ending, so only the
    // manager-wide reset counts here.
    this.stopHandler = (event: SoundEvent) => {
      if (event.soundId) return;
      this.placedLayers = [];
      this.setActive(null);
    };
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
        const placements = layers
          .map(
            (layer) =>
              `<span class="scene__layer"><b>${getSoundMeta(layer.id).label}</b>${describePosition(layer.position)}</span>`
          )
          .join("");

        return `
          <button type="button" class="scene" data-scene="${scene.id}" ${disabled ? "disabled" : ""}
                  title="${disabled ? "This scene needs sounds that failed to load" : scene.blurb}">
            <span class="scene__icon">${svgIcon(scene.icon, 22)}</span>
            <span class="scene__text">
              <span class="scene__name">${scene.name}</span>
              <span class="scene__blurb">${scene.blurb}</span>
              <span class="scene__layers">${placements || "<span class=\"scene__layer\">unavailable</span>"}</span>
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
              One click layers several channels at once, each with its own volume, playback rate and
              position in 3D space around you. Put headphones on: the brook really is behind you.
              Open the console below to see the exact calls it makes.
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
    this.releasePlacedLayers();

    layers.forEach((layer) => {
      this.soundManager.play(layer.id, {
        volume: layer.volume,
        panType: SoundPanType.Spatial,
        panSpatialPosition: layer.position,
        playbackRate: layer.playbackRate ?? 1,
        loop: true,
        maxLoops: -1,
        fadeInDuration: scene.fadeInDuration,
        trackProgress: true,
      });
    });

    this.placedLayers = layers.map((layer) => layer.id);
    this.onLayersPlaced?.(layers.map((layer) => ({ id: layer.id, position: layer.position })));
    this.setActive(id);

    if (typeof gtag === "function") {
      gtag("event", "soundscape_start", { scene: id, demo: "general" });
    }
  }

  private stopScene(): void {
    this.soundManager.stopAllSounds();
    this.releasePlacedLayers();
    this.setActive(null);
  }

  /**
   * Hands the layers back the way they were found. A scene swaps a channel's
   * stereo panner for a panner node, and leaving that in place would mean the
   * pan slider on that strip silently does nothing after the scene ends.
   * `resetSound` tears the spatial node down and puts stereo panning back.
   */
  private releasePlacedLayers(): void {
    const placed = this.placedLayers;
    this.placedLayers = [];
    placed.forEach((soundId) => this.soundManager.resetSound(soundId));
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
