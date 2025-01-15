import "./shared.css";
import "./demo.css";

import song from "../sounds/we-are-dreaming-song.mp3";
import song2 from "../sounds/little-wonders-song.mp3";
import birds from "../sounds/birds-forest.mp3";
import rain from "../sounds/rain.mp3";
import crickets from "../sounds/crickets.mp3";
import brook from "../sounds/brook.mp3";
import magma from "../sounds/under-sea-magma.mp3";
import laserSound from "../sounds/laser-sound.mp3";

import demoTemplate from "./demo.html?raw";
import { SoundControl } from "./sound-control.component";
import { SoundEventsEnum } from "../sound-manager/sound-events.enum";
import { SoundEvent } from "../sound-manager/sound-event.interface";
import type { SoundManager } from "../sound-manager/sound-manager";
import { SoundManagerConfig } from "../sound-manager/sound-manager-config";
import { DEMO_CONFIG } from "./demo.config";

interface SoundManagerLibrary {
  SoundManager: new (config?: SoundManagerConfig) => SoundManager;
}

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
    toggleMuteBtn: () => this.soundManager.toggleMute(),
    fadeInBtn: () => this.soundManager.fadeMasterIn(),
    fadeOutBtn: () => this.soundManager.fadeMasterOut(),
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
      requestAnimationFrame(() => {
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

        document.querySelectorAll(".control-group.sticky").forEach((element) => {
          this.createStickyObserver(element as HTMLElement);
        });
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
        this.setMasterPan(pan);
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

  private setMasterPan(pan: number): void {
    // Convert from 0-1 range to -1 to 1 range
    const normalizedPan = pan * 2 - 1;
    this.soundManager.setMasterPan(normalizedPan);
    this.updateMasterPan(normalizedPan);
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
        { id: "laser-sound", url: laserSound },
        { id: "birds", url: birds },
        { id: "rain", url: rain },
        { id: "crickets", url: crickets },
        { id: "brook", url: brook },
        { id: "magma", url: magma },
        { id: "we-are-dreaming-song", url: song },
        { id: "little-wonders-song", url: song2} ,
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

  private createSoundControls(soundsToLoad: Array<{ id: string; url: string }>): void {
    this.soundControls.clear();
    const container = document.getElementById("soundControlsContainer")!;
    container.innerHTML = "";

    // Create controls in the same order as soundsToLoad
    soundsToLoad.forEach(({ id }) => {
      const control = new SoundControl(id, this.soundManager, container);
      this.soundControls.set(id, control);
    });
  }
  private setGlobalVolume(volume: number): void {
    this.soundManager.setGlobalVolume(volume);
    document.getElementById("masterVolumeValue")!.textContent = `${Math.round(volume * 100)}%`;
  }
}
