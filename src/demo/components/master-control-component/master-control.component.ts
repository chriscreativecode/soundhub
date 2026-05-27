
import { PlayOptions } from "../../../sound-manager/play-sound-options.interface";
import { SoundEvent } from "../../../sound-manager/sound-event.interface";
import { SoundEventsEnum } from "../../../sound-manager/sound-events.enum";
import { SoundManager } from "../../../sound-manager/sound-manager";
import { SoundPannerConfig } from "../../../sound-manager/sound-panner-config";
import { SoundManagerConfig } from "../../../sound-manager/sound-manager-config";
import "./../../shared.css";
import "./master-control.component.css";
/* @ts-ignore */
import masterControlComponentHtml from "./master-control.component.html?raw";
import { SpatialGrid } from "../spatial-grid-component/spatial-grid.component";

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

export class MasterControl {
  private soundManager: SoundManager;
  private containerElement: HTMLElement;
  private soundManagerConfig: SoundManagerConfig;
  private spatialGrid: SpatialGrid;

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

  constructor(container: HTMLElement, config: SoundManagerConfig, soundManager: SoundManager) {
    this.soundManagerConfig = config;
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
    this.soundManager = soundManager;
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
      this.spatialGrid = new SpatialGrid(this.containerElement.querySelector(".spatial-grid-container-wrapper")!, this.soundManager);
      this.initializeSpatialSettings();
      this.initializeSpatialControls();
      this.createStickyObserver();
    } catch (error) {
      console.error("Failed to initialize SoundManagerDemo:", error);
    }
  }

  private render(): void {
    if (!this.containerElement) {
      throw new Error("Element not found");
    }
    this.containerElement.innerHTML = masterControlComponentHtml;
  }


  private initializeEventListeners(): void {
    const preloadBtn = document.querySelector(".preload-btn") as HTMLButtonElement;
    const masterVolumeInput = document.getElementById("masterVolume");
    const masterPanningInput = document.getElementById("masterPanning");

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
        const value = target.type === "number" ? parseFloat(target.value) : target.value;
        const property = SPATIAL_SETTINGS_MAPPING[target.className];


        // Update the panner node configuration
        const newConfig: Partial<SoundPannerConfig> = {
          [property]: value,
        };

        this.spatialGrid.setSpatialPositionWithConfig(newConfig)
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
          //this.updateMasterSpatialPosition(50, 50, 0);
          this.spatialGrid.updatePosition(50, 0, 50);
        }
        break;
    }
  };

  private updateMuteIcons(isMuted: boolean): void {
    const muteIcon = document.querySelector(".mute-icon");
    const unmuteIcon = document.querySelector(".unmute-icon");
    if (muteIcon && unmuteIcon) {
      muteIcon.setAttribute("style", `display: ${isMuted ? "block" : "none"}`);
      unmuteIcon.setAttribute("style", `display: ${isMuted ? "none" : "block"}`);
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


  private createStickyObserver(): () => void {
    const soundControlsContainer = document.getElementById("masterControlContainer") as HTMLElement;
    const childContainer = soundControlsContainer.querySelector(".master-controls") as HTMLElement;

    // Get the initial position of the container
    const containerRect = soundControlsContainer.getBoundingClientRect();
    const originalTop = containerRect.top + window.scrollY;

    // Get the sticky top offset from CSS
    const stickyTop = parseInt(window.getComputedStyle(soundControlsContainer).top) || 0;

    let ticking = false;

    const checkStuck = () => {
      const currentTop = soundControlsContainer.getBoundingClientRect().top;
      // Check if we've scrolled past the point where the container becomes sticky
      const isStuck = currentTop <= stickyTop && window.scrollY >= (originalTop - stickyTop);
      childContainer.classList.toggle('is-stuck', isStuck);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(checkStuck);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    checkStuck();

    return () => window.removeEventListener("scroll", onScroll);
  }

  private setGlobalVolume(volume: number): void {
    this.soundManager.setGlobalVolume(volume);
    document.getElementById("masterVolumeValue")!.textContent = `${Math.round(volume * 100)}%`;
  }

}