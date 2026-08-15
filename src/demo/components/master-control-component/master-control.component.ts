import { SoundEvent } from "../../../sound-manager/sound-event.interface";
import { SoundEventsEnum } from "../../../sound-manager/sound-events.enum";
import { SoundManager } from "../../../sound-manager/sound-manager";
import { SoundManagerConfig } from "../../../sound-manager/sound-manager-config";
/* @ts-ignore */
import "./master-control.component.css";
/* @ts-ignore */
import masterControlComponentHtml from "./master-control.component.html?raw";
import { SpatialGrid } from "../spatial-grid-component/spatial-grid.component";
/* @ts-ignore */
import "../../shared.css";
import { svgIcon } from "../shared/icon-utils";
import { autoRangeProgress } from "../shared/range-input-utils";
import { CollapsiblePanel, setupCollapsiblePanel } from "../shared/collapsible-panel";
import { SpatialSettings } from "../spatial-settings-component/spatial-settings.component";

// Build icon map once
const MASTER_ICONS = {
  iconPlay: svgIcon("play"),
  iconPause: svgIcon("pause"),
  iconStop: svgIcon("stop"),
  iconMute: svgIcon("mute"),
  iconUnmute: svgIcon("unmute"),
  iconFadeIn: svgIcon("fade-in"),
  iconFadeOut: svgIcon("fade-out"),
  iconReset: svgIcon("reset"),
  iconCollapse: svgIcon("collapse"),
};

export class MasterControl {
  private soundManager: SoundManager;
  private containerElement: HTMLElement;
  private soundManagerConfig: SoundManagerConfig;
  private spatialGrid!: SpatialGrid;
  private spatialSettings: SpatialSettings | null = null;
  private collapsiblePanel: CollapsiblePanel | null = null;
  private cleanupRangeProgress: (() => void) | null = null;

  private isMuted: boolean = false;

  private readonly BUTTON_IDS = [
    "pauseAllBtn",
    "resumeAllBtn",
    "stopAllBtn",
    "toggleMuteBtn",
    "fadeInBtn",
    "fadeOutBtn",
    "resetBtn",
  ] as const;

  private readonly BUTTON_HANDLERS: Record<string, () => void> = {
    pauseAllBtn: () => this.soundManager.pauseAllSounds(),
    resumeAllBtn: () => this.soundManager.resumeAllSounds(),
    stopAllBtn: () => this.soundManager.stopAllSounds(),
    toggleMuteBtn: () => this.soundManager.toggleGlobalMute(),
    fadeInBtn: () => this.soundManager.fadeGlobalIn(),
    fadeOutBtn: () => this.soundManager.fadeGlobalOut(),
    resetBtn: () => this.soundManager.reset(),
  };

  private readonly BUTTON_STATES: Record<string, Record<string, boolean>> = {
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
  };

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

  private interpolateTemplate(tpl: string): string {
    return tpl
      .replace(/\{\{iconPlay\}\}/g, MASTER_ICONS.iconPlay)
      .replace(/\{\{iconPause\}\}/g, MASTER_ICONS.iconPause)
      .replace(/\{\{iconStop\}\}/g, MASTER_ICONS.iconStop)
      .replace(/\{\{iconMute\}\}/g, MASTER_ICONS.iconMute)
      .replace(/\{\{iconUnmute\}\}/g, MASTER_ICONS.iconUnmute)
      .replace(/\{\{iconFadeIn\}\}/g, MASTER_ICONS.iconFadeIn)
      .replace(/\{\{iconFadeOut\}\}/g, MASTER_ICONS.iconFadeOut)
      .replace(/\{\{iconReset\}\}/g, MASTER_ICONS.iconReset)
      .replace(/\{\{iconCollapse\}\}/g, MASTER_ICONS.iconCollapse);
  }

  private initialize(): void {
    try {
      this.render();

      // Initialize master panning
      const masterPanningInput = document.getElementById("masterPanning") as HTMLInputElement;
      const defaultPan = this.soundManagerConfig.defaultPan ?? 0;
      if (masterPanningInput) {
        masterPanningInput.value = ((defaultPan + 1) / 2).toString();
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
      
      // Use shared SpatialSettings component for master spatial settings
      const settingsContainer = this.containerElement.querySelector(".master-spatial-controls .spatial-settings") as HTMLElement;
      if (settingsContainer) {
        this.spatialSettings = new SpatialSettings(settingsContainer, this.soundManager, (config) => {
          this.spatialGrid.setSpatialPositionWithConfig(config);
        });
      }

      // Use shared collapsible panel for master spatial controls
      const header = this.containerElement.querySelector(".master-spatial-controls > .control-header") as HTMLElement;
      const content = this.containerElement.querySelector(".master-spatial-controls .spatial-content") as HTMLElement;
      if (header && content) {
        this.collapsiblePanel = setupCollapsiblePanel(header, content, {
          collapsedByDefault: true,
        });
      }

      this.createStickyObserver();
    } catch (error) {
      console.error("Failed to initialize SoundManagerDemo:", error);
    }
  }

  private render(): void {
    if (!this.containerElement) {
      throw new Error("Element not found");
    }
    this.containerElement.innerHTML = this.interpolateTemplate(masterControlComponentHtml);
  }

  private initializeEventListeners(): void {
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

    // Use shared utility for range progress styling
    this.cleanupRangeProgress = autoRangeProgress(
      masterVolumeInput as HTMLInputElement,
      masterPanningInput as HTMLInputElement
    );
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

  private handleSoundEvent = (event: SoundEvent): void => {
    switch (event.type) {
      case SoundEventsEnum.MUTE_GLOBAL:
        this.isMuted = true;
        this.updateMuteIcons(true);
        this.updateMasterVolume(0);
        this.updateButtonStates({ fadeInBtn: false, fadeOutBtn: true });
        break;

      case SoundEventsEnum.MASTER_PAN_CHANGED:
        if (typeof event.pan === "number") {
          this.updateMasterPan(event.pan);
        }
        break;

      case SoundEventsEnum.UNMUTE_GLOBAL:
        this.isMuted = false;
        this.updateMuteIcons(false);
        if (typeof event.volume === "number") {
          this.updateMasterVolume(event.volume);
        }
        break;

      case SoundEventsEnum.MASTER_VOLUME_CHANGED:
        this.updateMasterVolume(event);
        if (typeof event.volume === "number") {
          if (event.volume > 0 && this.isMuted) {
            this.isMuted = false;
            this.updateMuteIcons(false);
          } else if (event.volume === 0 && !this.isMuted) {
            this.isMuted = true;
            this.updateMuteIcons(true);
          }
        }
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
        this.updateMasterVolume(event);
        this.isMuted = false;
        this.updateMuteIcons(false);
        this.updateButtonStates({ fadeInBtn: true, fadeOutBtn: false });
        break;

      case SoundEventsEnum.FADE_MASTER_OUT_COMPLETED:
        this.updateMasterVolume(event);
        this.isMuted = true;
        this.updateMuteIcons(true);
        this.updateButtonStates({ fadeInBtn: false, fadeOutBtn: true });
        break;

      case SoundEventsEnum.RESET:
        if (!event.resetOptions?.keepPanning) {
          this.updateMasterPan(0);
        }
        // The master grid follows keepSpatial, not keepPanning: they are separate
        // reset options and were being conflated here.
        if (!event.resetOptions?.keepSpatial) {
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

    const sliderValue = (pan + 1) / 2;
    masterPanningInput.value = sliderValue.toString();
    masterPanningInput.style.setProperty("--range-progress", `${sliderValue * 100}%`);

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
    this.isMuted = false;
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

  /**
   * Folds the panel down to a transport bar once it sticks to the top.
   *
   * The panel is in the flow, so anything that changes its height moves the
   * whole page under the reader. Folding it away removes about 175px, which
   * made the channel list lurch upward mid-scroll. So the moment it sticks, the
   * container keeps the height it had: the page below never moves, and only the
   * card inside it shrinks. The reserved strip is then empty, which is why it
   * has to stop swallowing clicks meant for the list scrolling underneath.
   */
  private createStickyObserver(): () => void {
    const container = document.getElementById("masterControlContainer") as HTMLElement;
    const panel = container.querySelector(".master-controls") as HTMLElement;

    const originalTop = container.getBoundingClientRect().top + window.scrollY;
    const stickyTop = parseInt(window.getComputedStyle(container).top) || 0;

    let ticking = false;
    let stuck = false;

    /**
     * The height the panel has with nothing folded away. Taken with the fold
     * undone and the transitions off, because a measurement during the
     * animation returns whatever height the fold happens to be passing through.
     */
    const measureUnfoldedHeight = (): number => {
      const wasFolded = panel.classList.contains("is-stuck");
      const reserved = container.style.height;

      container.classList.add("is-measuring");
      panel.classList.remove("is-stuck");
      container.style.height = "";

      const height = container.getBoundingClientRect().height;

      container.style.height = reserved;
      panel.classList.toggle("is-stuck", wasFolded);
      void container.offsetHeight; // flush, so restoring the fold does not animate
      container.classList.remove("is-measuring");

      return height;
    };

    const setStuck = (next: boolean) => {
      if (next === stuck) return;
      stuck = next;

      container.style.height = next ? `${measureUnfoldedHeight()}px` : "";
      container.classList.toggle("is-reserving", next);
      panel.classList.toggle("is-stuck", next);
    };

    const checkStuck = () => {
      const currentTop = container.getBoundingClientRect().top;
      setStuck(currentTop <= stickyTop && window.scrollY >= originalTop - stickyTop);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(checkStuck);
        ticking = true;
      }
    };

    // A resize changes how tall the panel needs to be, so a height reserved at
    // the old width is no longer the right amount of space to hold open.
    const onResize = () => {
      if (stuck) container.style.height = `${measureUnfoldedHeight()}px`;
      checkStuck();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    checkStuck();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }

  private setGlobalVolume(volume: number): void {
    if (volume > 0 && this.isMuted) {
      this.soundManager.unmuteAllSounds();
    }
    if (volume === 0 && !this.isMuted) {
      this.soundManager.muteAllSounds();
    }
    this.soundManager.setGlobalVolume(volume);
    document.getElementById("masterVolumeValue")!.textContent = `${Math.round(volume * 100)}%`;
  }
}