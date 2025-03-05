import "./../../shared.css";
import "./demo.css";

// @ts-ignore
import introSpeach from "../../../sounds/intro-text-speach.mp3";
// @ts-ignore
import song from "../../../sounds/sound-surfer-constellations.mp3";
// @ts-ignore
import song2 from "../../../sounds/little-wonders.mp3";
// @ts-ignore
import birds from "../../../sounds/birds-forest.mp3";
// @ts-ignore
import rain from "../../../sounds/rain.mp3";
// @ts-ignore
import brook from "../../../sounds/brook.mp3";
// @ts-ignore
import magma from "../../../sounds/under-sea-magma.mp3";
// @ts-ignore
import gameSounds from "../../../sounds/8-bit-game-sounds.mp3";
// @ts-ignore
import crickets from "../../../sounds/crickets.mp3";

// @ts-ignore
import { SoundManagerConfig } from "../../../sound-manager/sound-manager-config";
import { MasterControl } from "../../components/master-control-component/master-control.component";
import { SoundControl } from "../../components/sound-control-component/sound-control.component";
import { SoundManager } from './../../../sound-manager/sound-manager';
// @ts-ignore
import demoTemplate from "./demo-template.html?raw";
import { DEMO_CONFIG } from "./demo.config";
import { LocalStorageManagerManager } from "../../services/local-storage-manager";


export class SoundManagerDemo {
  private soundManager: SoundManager;
  private soundControls: Map<string, SoundControl> = new Map();
  private containerElement: HTMLElement;
  private loadingState: boolean = false;
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
    const preloadBtn = document.querySelector(".preload-btn") as HTMLButtonElement;
    // Load demo sounds when the preload button is clicked
    if (preloadBtn) {
      preloadBtn.addEventListener("click", () => this.loadDemoSounds());
    }
  }

  private initializeTheme(): void {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle') as HTMLInputElement;
    const themeIconMoon = document.getElementsByClassName('theme-icon--moon')[0];
    const themeIconSun = document.getElementsByClassName('theme-icon--sun')[0];

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
    const preloadBtn = document.querySelector(".preload-btn") as HTMLButtonElement;
    if (!preloadBtn || this.loadingState) return;

    try {
      this.loadingState = true;
      this.updateLoadingState(true);

      const soundsToLoad = [
        { id: "intro-speach", url: introSpeach},
      //   { id: "sound-surfer-constellations", url: song },
      //  { id: "game-sound", url: gameSounds },
        // { id: "birds", url: birds },
        // { id: "rain", url: rain },
        // { id: "crickets", url: crickets },
        // { id: "brook", url: brook },
        // { id: "magma", url: magma },
        // { id: "little-wonders-song", url: song2 },
      ];

      await this.soundManager.loadSounds(soundsToLoad);
      const masterControlContainer = document.getElementById("masterControlContainer") as HTMLElement;
      const soundControlsContainer = document.getElementById("soundControlsContainer") as HTMLElement;
      soundControlsContainer.classList.add("show");
      this.createMasterControl(masterControlContainer);
      this.createSoundControls(soundsToLoad);
    } catch (error) {
      console.error("Error loading sounds:", error);
    } finally {
      this.loadingState = false;
      this.updateLoadingState(false);
    }
  }

  private updateLoadingState(loading: boolean): void {
    const preloadBtn = document.querySelector(".preload-btn") as HTMLButtonElement;
    if (!preloadBtn) return;

    preloadBtn.disabled = loading;
    if (loading) {
      preloadBtn.classList.add("loading");
    } else {
      preloadBtn.classList.remove("loading");
    }
  }

  private createSoundControls(soundsToLoad: Array<{ id: string; url: string }>): void {
    this.soundControls.clear();
    const container = document.getElementById("soundControlsContainer")!;
    container.innerHTML = "";

    // Create controls in the same order as soundsToLoad
    soundsToLoad.forEach(({ id }) => {
      if (id === "game-sound") {
        // Define sprites
        const sprites: { [key: string]: [number, number] } = {
          //             intro: [0, 2],
          levelup: [2.4, 4],
          jump: [4, 5],
          //              fail: [5, 7],
        };

        // Set sprites in sound manager
        this.soundManager.setSoundSprite(id, sprites);

        // Create a control for each sprite
        Object.entries(sprites).forEach(([spriteName]) => {
          const spriteId = `${id}_${spriteName}`; // e.g., "game-sound_intro"
          const control = new SoundControl(spriteId, this.soundManager, container, true);
          this.soundControls.set(spriteId, control);
        });
      } else {
        // Create regular sound control for non-sprite sounds
        const control = new SoundControl(id, this.soundManager, container);
        this.soundControls.set(id, control);
      }
    });
  }

  private createMasterControl(container: HTMLElement): void {
    const control = new MasterControl(container, this.soundManagerConfig, this.soundManager);
  }
}
