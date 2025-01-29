import "./shared.css";
import "./demo.css";

// @ts-ignore
import song from "../sounds/we-are-dreaming-song.mp3";
console.log("song url", song);
// @ts-ignore
import song2 from "../sounds/little-wonders-song.mp3";
// @ts-ignore
import birds from "../sounds/birds-forest.mp3";
// @ts-ignore
import rain from "../sounds/rain.mp3";
// @ts-ignore
import brook from "../sounds/brook.mp3";
// @ts-ignore
import magma from "../sounds/under-sea-magma.mp3";
// @ts-ignore
import laserSound from "../sounds/laser-sound.mp3";
// @ts-ignore
import gameSounds from "../sounds/8-bit-game-sounds.mp3";
// @ts-ignore
import crickets from "../sounds/crickets.mp3";

// @ts-ignore
import demoTemplate from "./demo.html?raw";
import { SoundControl } from "./sound-control.component";
import { SoundEventsEnum } from "../sound-manager/sound-events.enum";
import { SoundEvent } from "../sound-manager/sound-event.interface";
import type { SoundManager } from "../sound-manager/sound-manager";
import { SoundManagerConfig } from "../sound-manager/sound-manager-config";
import { DEMO_CONFIG } from "./demo.config";
import { SoundPannerConfig } from "../types";

interface SoundManagerLibrary {
  SoundManager: new (config?: SoundManagerConfig) => SoundManager;
}


const SPATIAL_SETTINGS_MAPPING: { [key: string]: keyof SoundPannerConfig } = {
  'panning-model-select': 'panningModel',
  'distance-model-select': 'distanceModel',
  'ref-distance-input': 'refDistance',
  'max-distance-input': 'maxDistance',
  'rolloff-factor-input': 'rolloffFactor',
  'cone-inner-angle-input': 'coneInnerAngle',
  'cone-outer-angle-input': 'coneOuterAngle',
  'cone-outer-gain-input': 'coneOuterGain',
};

export class SoundManagerDemo {
  private soundManager: SoundManager;
  private soundControls: Map<string, SoundControl> = new Map();
  private containerElement: HTMLElement;
  private loadingState: boolean = false;
  private soundManagerConfig: SoundManagerConfig = DEMO_CONFIG;

  private readonly BUTTON_IDS = [
    "pauseAllBtn",
    "resumeAllBtn",
    "stopAllBtn",
    "toggleMuteBtn",
    "fadeInBtn",
    "fadeOutBtn",
    "resetBtn",
  ] as const;

  private readonly BUTTON_HANDLERS = {
    pauseAllBtn: () => this.soundManager.pauseAllSounds(),
    resumeAllBtn: () => this.soundManager.resumeAllSounds(),
    stopAllBtn: () => this.soundManager.stopAllSounds(),
    toggleMuteBtn: () => this.soundManager.toggleGlobalMute(),
    fadeInBtn: () => this.soundManager.fadeGlobalIn(),
    fadeOutBtn: () => this.soundManager.fadeGlobalOut(),
    resetBtn: () => this.soundManager.reset(),
  } as const;

  private readonly BUTTON_STATES = {
    [SoundEventsEnum.STARTED]: {
      pauseAllBtn: false,
      resumeAllBtn: true,
      stopAllBtn: false,
      fadeOutBtn: false,
      fadeInBtn: true,
    },
    [SoundEventsEnum.RESUMED]: {
      pauseAllBtn: false,
      resumeAllBtn: true,
      stopAllBtn: false,
      fadeOutBtn: false,
      fadeInBtn: true,
    },
    [SoundEventsEnum.PAUSED]: {
      pauseAllBtn: true,
      resumeAllBtn: false,
      stopAllBtn: false,
      fadeOutBtn: true,
      fadeInBtn: false,
    },
    [SoundEventsEnum.STOPPED]: {
      pauseAllBtn: true,
      resumeAllBtn: true,
      stopAllBtn: true,
      fadeOutBtn: true,
      fadeInBtn: false,
    },
  } as const;

  constructor(container: HTMLElement, library: SoundManagerLibrary) {
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
    this.soundManager = new library.SoundManager(<SoundManagerConfig>this.soundManagerConfig);
    this.initialize();
  }

  private initialize(): void {
    try {
      this.render();

      // Initialize master panning
      const masterPanningInput = document.getElementById("masterPanning") as HTMLInputElement;
      const defaultPan = this.soundManagerConfig.defaultPan ?? 0;
      if (masterPanningInput) {
        masterPanningInput.value = ((defaultPan + 1) / 2).toString(); // Convert from -1,1 to 0,1
        masterPanningInput.min = "0";
        masterPanningInput.max = "1";
        masterPanningInput.step = "0.01";
        this.updateMasterPan(defaultPan);
      }

      // Initialize master volume
      const masterVolumeInput = document.getElementById("masterVolume") as HTMLInputElement;
      const defaultVolume = this.soundManagerConfig.defaultVolume ?? 1;
      if (masterVolumeInput) {
        masterVolumeInput.value = defaultVolume.toString();
        this.updateMasterVolume(defaultVolume);
      }

      this.initializeEventListeners();
      this.initializeGlobalControls();
      this.initializeMasterSpatialControls();
      this.initializeSpatialSettings();
      this.initializeSpatialControls();

      document.querySelectorAll(".control-group.sticky").forEach((element) => {
        this.createStickyObserver(element as HTMLElement);
      });
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
    const masterVolumeInput = document.getElementById("masterVolume");
    const masterPanningInput = document.getElementById("masterPanning");

    if (preloadBtn) {
      preloadBtn.addEventListener("click", () => this.loadDemoSounds());
    }

    if (masterVolumeInput) {
      masterVolumeInput.addEventListener("input", (e) => {
        const volume = parseFloat((e.target as HTMLInputElement).value);
        this.setGlobalVolume(volume);
      });
    }

    if (masterPanningInput) {
      masterPanningInput.addEventListener("input", (e) => {
        const pan = parseFloat((e.target as HTMLInputElement).value);
        this.setGlobalPan(pan);
      });
    }

    const rangeInputs = Array.from(this.containerElement.querySelectorAll('input[type="range"]'));
    rangeInputs.forEach((element: Element) => {
      const input = element as HTMLInputElement;
      input.style.setProperty(
        "--range-progress",
        `${((Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100}%`
      );

      input.addEventListener("input", (e: Event) => {
        const target = e.target as HTMLInputElement;
        target.style.setProperty(
          "--range-progress",
          `${((Number(target.value) - Number(target.min)) / (Number(target.max) - Number(target.min))) * 100}%`
        );
      });
    });
  }

  private initializeGlobalControls(): void {
    this.setupButtonHandlers();
    this.setupEventListeners();
    this.initializeMuteState();
    this.initializeButtonStates();
  }

  private setupButtonHandlers(): void {
    this.BUTTON_IDS.forEach((id) => {
      const button = document.getElementById(id);
      if (button && this.BUTTON_HANDLERS[id]) {
        button.addEventListener("click", this.BUTTON_HANDLERS[id]);
      }
    });
  }

  private setupEventListeners(): void {
    Object.values(SoundEventsEnum).forEach((eventType) => {
      this.soundManager.addEventListener(eventType, this.handleSoundEvent.bind(this));
    });
  }

  private setGlobalPan(pan: number): void {
    // Convert from 0-1 range to -1 to 1 range
    const normalizedPan = pan * 2 - 1;
    this.soundManager.setGlobalPan(normalizedPan);
    this.updateMasterPan(normalizedPan);
  }
  private initializeSpatialSettings(): void {
    const spatialSettings = document.querySelector(".master-spatial-controls .spatial-settings");
    if (spatialSettings) {
      const handleSettingChange = (e: Event) => {
        const target = e.target as HTMLInputElement | HTMLSelectElement;
        console.log('target', target);
        const value = target.type === "number" ? parseFloat(target.value) : target.value;
        const property = SPATIAL_SETTINGS_MAPPING[target.className];

        const newConfig = {
          [property]: value,
        };

        console.log('newConfig', newConfig);	
       //this.soundManager.setMasterSpatialPosition(0, 0, 0, newConfig);
        this.soundManager.setMasterSpatialPosition(
          parseFloat(
            (document.querySelector(".master-spatial-controls .spatial-position-circle") as HTMLElement).style.left
          ) /
            50 -
            1,
          -(
            parseFloat(
              (document.querySelector(".master-spatial-controls .spatial-position-circle") as HTMLElement).style.top
            ) /
              50 -
            1
          ),
          0,
          newConfig
        );
      };

      spatialSettings.querySelectorAll("select, input").forEach((element) => {
        element.addEventListener("change", handleSettingChange);
      });
    }
  }

  private initializeSpatialControls(): void {
    const collapsePanelBar = document.querySelector(".master-spatial-controls > .control-header");
    const spatialContent = document.querySelector(".master-spatial-controls .spatial-content");

    if (collapsePanelBar && spatialContent) {
      collapsePanelBar.addEventListener("click", () => {
        spatialContent.classList.toggle("collapsed");
        // Optionally rotate the collapse button icon
        const icon = collapsePanelBar.querySelector("svg");
        if (icon) {
          icon.style.transform = spatialContent.classList.contains("collapsed") ? "rotate(0deg)" : "rotate(180deg)";
        }
      });
    }
  }

  private initializeMasterSpatialControls(): void {
    const masterSpatialGrid = document.querySelector(".master-spatial-controls .spatial-grid");
    const masterSpatialCircle = document.querySelector(".master-spatial-controls .spatial-position-circle");
    const masterSpatialCoords = document.querySelector(".master-spatial-controls .spatial-coordinates");

    if (masterSpatialGrid && masterSpatialCircle && masterSpatialCoords) {
      let isDragging = false;

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const rect = masterSpatialGrid.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        const normalizedZ = (y / 50 - 1) * -1;
        this.updateMasterSpatialPosition(x, y, normalizedZ);
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (!isDragging) return;
        const rect = masterSpatialGrid.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((e.touches[0].clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((e.touches[0].clientY - rect.top) / rect.height) * 100));
        const normalizedZ = (y / 50 - 1) * -1;
        this.updateMasterSpatialPosition(x, y, normalizedZ);
      };

      const handleMouseDown = () => {
        isDragging = true;
      };

      const handleMouseUp = () => {
        isDragging = false;
      };

      const handleTouchStart = (e: TouchEvent) => {
        isDragging = true;
        e.preventDefault();
      };

      const handleTouchEnd = () => {
        isDragging = false;
      };

      const handleGridClick = (e: MouseEvent) => {
        const rect = masterSpatialGrid.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        const normalizedZ = (y / 50 - 1) * -1;
        this.updateMasterSpatialPosition(x, y, normalizedZ);
      };

      // Add event listeners
      masterSpatialCircle.addEventListener("mousedown", handleMouseDown);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("mousemove", handleMouseMove);
      masterSpatialCircle.addEventListener("touchstart", handleTouchStart as EventListener);
      document.addEventListener("touchend", handleTouchEnd as EventListener);
      document.addEventListener("touchmove", handleTouchMove as EventListener);
      masterSpatialGrid.addEventListener("click", handleGridClick as EventListener);

      // Initialize position at center
      const centerX = 50;
      const centerY = 50;
      (masterSpatialCircle as HTMLElement).style.left = `${centerX}%`;
      (masterSpatialCircle as HTMLElement).style.top = `${centerY}%`;
    }
  }

  private updateMasterSpatialPosition(x: number, y: number, z: number, config: SoundPannerConfig = {}): void {
    const masterSpatialCircle = document.querySelector(
      ".master-spatial-controls .spatial-position-circle"
    ) as HTMLElement;
    const masterSpatialCoords = document.querySelector(".master-spatial-controls .spatial-coordinates");

    if (masterSpatialCircle && masterSpatialCoords) {
      masterSpatialCircle.style.left = `${x}%`;
      masterSpatialCircle.style.top = `${y}%`;

      // Update master spatial position using setSoundPosition without an id
 //     this.soundManager.setSoundPosition(x / 50 - 1, -(y / 50 - 1), z, null, config);

      this.soundManager.setMasterSpatialPosition(x / 50 - 1, -(y / 50 - 1), z, config);

      // Update coordinates display
      masterSpatialCoords.innerHTML = `<strong>Position:</strong><br/>X: ${(x / 50 - 1).toFixed(2)},<br/> Y: ${(-(
        y / 50 -
        1
      )).toFixed(2)},<br/>Z: ${z.toFixed(2)}`;
    }
  }

  private handleSoundEvent = (event: SoundEvent): void => {
    switch (event.type) {
      case SoundEventsEnum.MUTE_GLOBAL:
        this.updateMuteIcons(true);
        this.updateMasterVolume(0);
        break;

      case SoundEventsEnum.MASTER_PAN_CHANGED:
        if (typeof event.pan === "number") {
          this.updateMasterPan(event.pan);
        }
        break;

      case SoundEventsEnum.UNMUTE_GLOBAL:
        this.updateMuteIcons(false);
        // Assuming the sound manager provides the previous volume in the event
        // If not, you might need to store the previous volume value
        if (typeof event.volume === "number") {
          this.updateMasterVolume(event.volume);
        }
        break;

      case SoundEventsEnum.MASTER_VOLUME_CHANGED:
        console.log("master volume changed?");
        this.updateMasterVolume(event);
        break;

      case SoundEventsEnum.STARTED:
      case SoundEventsEnum.RESUMED:
      case SoundEventsEnum.PAUSED:
      case SoundEventsEnum.STOPPED:
        if (this.BUTTON_STATES[event.type]) {
          this.updateButtonStates(this.BUTTON_STATES[event.type]);
        }
        break;

      case SoundEventsEnum.FADE_MASTER_IN_COMPLETED:
        this.updateButtonStates({ fadeInBtn: true, fadeOutBtn: false });
        break;

      case SoundEventsEnum.FADE_MASTER_OUT_COMPLETED:
        this.updateButtonStates({ fadeInBtn: false, fadeOutBtn: true });
        break;

      case SoundEventsEnum.RESET:
        if (!event.resetOptions?.keepPanning) {
          this.updateMasterPan(0);
          this.updateMasterSpatialPosition(50, 50, 0);
        }
        break;
    }
  };

  private updateMuteIcons(isMuted: boolean): void {
    const muteIcon = document.querySelector(".mute-icon");
    const unmuteIcon = document.querySelector(".unmute-icon");
    if (muteIcon && unmuteIcon) {
      muteIcon.setAttribute("style", `display: ${isMuted ? "none" : "block"}`);
      unmuteIcon.setAttribute("style", `display: ${isMuted ? "block" : "none"}`);
    }
  }

  private updateMasterVolume(eventOrVolume: SoundEvent | number): void {
    const masterVolumeInput = document.getElementById("masterVolume") as HTMLInputElement;
    const masterVolumeValue = document.getElementById("masterVolumeValue");

    if (!masterVolumeInput || !masterVolumeValue) return;

    let volume: number;

    if (typeof eventOrVolume === "number") {
      volume = eventOrVolume;
    } else if (typeof eventOrVolume.volume === "number") {
      volume = eventOrVolume.volume;
    } else {
      return;
    }

    const volumePercentage = volume * 100;
    masterVolumeInput.value = volume.toString();
    masterVolumeInput.style.setProperty("--range-progress", `${volumePercentage}%`);
    masterVolumeValue.textContent = `${Math.round(volumePercentage)}%`;
  }

  private updateMasterPan(eventOrPan: SoundEvent | number): void {
    const masterPanningInput = document.getElementById("masterPanning") as HTMLInputElement;
    const masterPanValue = document.getElementById("masterPanValue");

    if (!masterPanningInput || !masterPanValue) return;

    let pan: number;

    if (typeof eventOrPan === "number") {
      pan = eventOrPan;
    } else if (typeof eventOrPan.pan === "number") {
      pan = eventOrPan.pan;
    } else {
      return;
    }

    // Convert from -1,1 range to 0,1 range for the slider
    const sliderValue = (pan + 1) / 2;
    masterPanningInput.value = sliderValue.toString();
    masterPanningInput.style.setProperty("--range-progress", `${sliderValue * 100}%`);

    // Update display text
    if (pan === 0) {
      masterPanValue.textContent = "center";
    } else if (pan < 0) {
      masterPanValue.textContent = `${Math.abs(Math.round(pan * 100))}% left`;
    } else {
      masterPanValue.textContent = `${Math.round(pan * 100)}% right`;
    }
  }

  private updateButtonStates(states: Record<string, boolean>): void {
    Object.entries(states).forEach(([id, disabled]) => {
      const button = document.getElementById(id) as HTMLButtonElement;
      if (button) {
        button.disabled = disabled;
      }
    });
  }

  private initializeMuteState(): void {
    this.updateMuteIcons(false);
  }

  private initializeButtonStates(): void {
    this.updateButtonStates({
      pauseAllBtn: true,
      resumeAllBtn: true,
      stopAllBtn: true,
      fadeOutBtn: true,
      fadeInBtn: false,
    });
  }

  private async loadDemoSounds(): Promise<void> {
    const preloadBtn = document.querySelector(".preload-btn") as HTMLButtonElement;
    if (!preloadBtn || this.loadingState) return;

    try {
      this.loadingState = true;
      this.updateLoadingState(true);

      const soundsToLoad = [
        { id: "game-sound", url: gameSounds },
        { id: "laser-sound", url: laserSound },
        { id: "birds", url: birds },
        { id: "rain", url: rain },
        { id: "crickets", url: crickets },
        { id: "brook", url: brook },
        { id: "magma", url: magma },
        { id: "we-are-dreaming-song", url: song },
        { id: "little-wonders-song", url: song2 },
      ];

      await this.soundManager.preloadSounds(soundsToLoad);

      const soundControlsContainer = document.getElementById("soundControlsContainer") as HTMLElement;
      soundControlsContainer.classList.add("show");

      // Create sound controls based on the same order
      this.createSoundControls(soundsToLoad);
    } catch (error) {
      console.error("Error loading sounds:", error);
    } finally {
      this.loadingState = false;
      this.updateLoadingState(false);
    }
  }

  private createStickyObserver(element: HTMLElement): () => void {
    const originalTop = element.getBoundingClientRect().top + window.scrollY;
    const soundControlsContainer = document.getElementById("soundControlsContainer") as HTMLElement;

    const checkStuck = () => {
      const rect = element.getBoundingClientRect();
      const isStuck = rect.top === 0 && window.scrollY >= originalTop;
      element.classList.toggle("is-stuck", isStuck);

      if (isStuck) {
        const stickyDivHeight = element.offsetHeight;
        soundControlsContainer.style.marginTop = `${stickyDivHeight + 50}px`;
      } else {
        soundControlsContainer.style.marginTop = "0";
      }
    };

    window.addEventListener("scroll", checkStuck, { passive: true });
    checkStuck();

    return () => window.removeEventListener("scroll", checkStuck);
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

  // private createSoundControls(soundsToLoad: Array<{ id: string; url: string }>): void {
  //   this.soundControls.clear();
  //   const container = document.getElementById("soundControlsContainer")!;
  //   container.innerHTML = "";

  //   // Create controls in the same order as soundsToLoad
  //   soundsToLoad.forEach(({ id }) => {
  //     const control = new SoundControl(id, this.soundManager, container);
  //     this.soundControls.set(id, control);
  //   });
  // }

  private createSoundControls(soundsToLoad: Array<{ id: string; url: string }>): void {
    this.soundControls.clear();
    const container = document.getElementById("soundControlsContainer")!;
    container.innerHTML = "";

    // Create controls in the same order as soundsToLoad
    soundsToLoad.forEach(({ id }) => {
        if (id === "game-sound") {
            // Define sprites
            const sprites: { [key: string]: [number, number] } = {
              intro: [0, 2000],
              levelup: [2400, 4000],
              jump: [4000, 5000],
              fail: [5000, 7000],
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

  private setGlobalVolume(volume: number): void {
    this.soundManager.setGlobalVolume(volume);
    document.getElementById("masterVolumeValue")!.textContent = `${Math.round(volume * 100)}%`;
  }
}
