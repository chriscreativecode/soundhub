import "../../../shared.css";
import "./demo.css";

// @ts-ignore
import { SoundManagerConfig } from "../../../../sound-manager/sound-manager-config";
import { MasterControl } from "../../../components/master-control-component/master-control.component";
import { SoundControl } from "../../../components/sound-control-component/sound-control.component";
import { WaveVisualizerComponent } from "../../../components/wave-visualizer-component/wave-visualizer.component";
import { SoundManager } from '../../../../sound-manager/sound-manager';
// @ts-ignore
import demoTemplate from "./demo-template.html?raw";
import { DEMO_CONFIG } from "./demo.config";
import { LocalStorageManagerManager } from "../../../services/local-storage-manager";
import { SoundEventsEnum } from "../../../../sound-manager/sound-events.enum";
import { SoundEvent } from "../../../../sound-manager/sound-event.interface";

/**
 * Sound file manifests — keeps import lines shorter and centralised.
 * Add new sounds here by extending the array.
 */
const SOUND_MANIFEST: { id: string; url: () => Promise<{ default: string }> }[] = [
  { id: "intro-speach", url: () => import("../../../../sounds/intro-text-speach.mp3") },
  { id: "piano-tone", url: () => import("../../../../sounds/piano-tone.mp3") },
  { id: "game-sound", url: () => import("../../../../sounds/8-bit-game-sounds.mp3") },
  { id: "birds", url: () => import("../../../../sounds/birds-forest.mp3") },
  { id: "rain", url: () => import("../../../../sounds/rain.mp3") },
  { id: "crickets", url: () => import("../../../../sounds/crickets.mp3") },
  { id: "brook", url: () => import("../../../../sounds/brook.mp3") },
  { id: "magma", url: () => import("../../../../sounds/under-sea-magma.mp3") },
  { id: "little-wonders-song", url: () => import("../../../../sounds/little-wonders.mp3") },
  { id: "sound-surfer-constellations", url: () => import("../../../../sounds/sound-surfer-constellations.mp3") },
];

/**
 * Resolves all dynamic imports concurrently and returns an array
 * suitable for `soundManager.loadSounds()`.
 */
async function resolveSoundManifest(): Promise<{ id: string; url: string }[]> {
  const results = await Promise.all(
    SOUND_MANIFEST.map(async (entry) => ({
      id: entry.id,
      url: (await entry.url()).default,
    }))
  );
  return results;
}

export class SoundManagerDemo {
  private soundManager: SoundManager;
  private soundControls: Map<string, SoundControl> = new Map();
  private containerElement: HTMLElement;
  private soundManagerConfig: SoundManagerConfig = DEMO_CONFIG;

  constructor(container: HTMLElement) {
    if (!container) {
      throw new Error("Container element is required for SoundManagerDemo");
    }

    if (!(container instanceof HTMLElement)) {
      throw new Error("Container must be attached to the DOM");
    }

    if (!container.parentElement) {
      throw new Error("Container must be attached to the DOM");
    }

    this.containerElement = container;
    this.soundManager = new SoundManager(<SoundManagerConfig>this.soundManagerConfig);
    this.initialize();
  }

  private initialize(): void {
    try {
      this.render();
      this.initializeTheme();
      this.initializeEventListeners();
      this.loadDemoSounds();
    } catch (error) {
      console.error("Failed to initialize SoundManagerDemo:", error);
    }
  }

  private render(): void {
    if (!this.containerElement) {
      throw new Error("Element not found");
    }
    this.containerElement.innerHTML = demoTemplate;
  }

  private initializeEventListeners(): void {
    this.soundManager.addEventListener(SoundEventsEnum.LOADED, (event: SoundEvent) => {
      // console.log('sound loaded', event);
    });
  }

  private initializeTheme(): void {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle') as HTMLInputElement;

    const storedTheme = LocalStorageManagerManager.getItem('sound-manager-ts-demo-theme');

    if (!storedTheme) {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      LocalStorageManagerManager.setItem('sound-manager-ts-demo-theme', systemTheme);
    }

    if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      body.classList.add('dark-theme');
      if (themeToggle) themeToggle.checked = true;
    } else {
      body.classList.remove('dark-theme');
      if (themeToggle) themeToggle.checked = false;
    }

    if (themeToggle) {
      themeToggle.addEventListener('change', function () {
        if (this.checked) {
          body.classList.add('dark-theme');
          LocalStorageManagerManager.setItem('sound-manager-ts-demo-theme', 'dark');
        } else {
          body.classList.remove('dark-theme');
          LocalStorageManagerManager.setItem('sound-manager-ts-demo-theme', 'light');
        }
      });
    }
  }

  private async loadDemoSounds(): Promise<void> {
    try {
      const soundsToLoad = await resolveSoundManifest();

      await this.soundManager.loadSounds(soundsToLoad);

      const masterControlContainer = document.getElementById("masterControlContainer") as HTMLElement;
      const soundControlsContainer = document.getElementById("soundControlsContainer") as HTMLElement;
      soundControlsContainer.classList.add("show");
      this.createMasterControl(masterControlContainer);
      this.initializeVisualizer();
      this.createSoundControls(soundsToLoad);
    } catch (error) {
      console.error("Error loading sounds:", error);
    }
  }

  private createSoundControls(soundsToLoad: Array<{ id: string; url: string }>): void {
    this.soundControls.clear();
    const container = document.getElementById("soundControlsContainer")!;
    container.innerHTML = "";

    soundsToLoad.forEach(({ id }) => {
      if (id === "game-sound") {
        const sprites: { [key: string]: [number, number] } = {
          levelup: [2.4, 4],
          jump: [4, 5],
        };

        this.soundManager.setSoundSprite(id, sprites);

        Object.entries(sprites).forEach(([spriteName]) => {
          const spriteId = `${id}_${spriteName}`;
          const control = new SoundControl(spriteId, this.soundManager, container, true);
          this.soundControls.set(spriteId, control);
        });
      } else {
        const control = new SoundControl(id, this.soundManager, container);
        this.soundControls.set(id, control);
      }
    });
  }

  private createMasterControl(container: HTMLElement): void {
    const control = new MasterControl(container, this.soundManagerConfig, this.soundManager);
  }

  private initializeVisualizer(): void {
    const container = document.getElementById("waveVisualizerContainer") as HTMLElement;
    if (!container) return;

    const audioCtx = this.soundManager.getContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    this.soundManager.getMasterOutput().connect(analyser);

    new WaveVisualizerComponent(container, analyser);
  }
}