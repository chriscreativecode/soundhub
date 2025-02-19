import { playOptions } from "../../../sound-manager/play-sound-options.interface";
import { SoundEvent } from "../../../sound-manager/sound-event.interface";
import { SoundEventsEnum } from "../../../sound-manager/sound-events.enum";
import { SoundManager } from "../../../sound-manager/sound-manager";
import { DEFAULT_PANNER_CONFIG, SoundPannerConfig } from "../../../sound-manager/sound-panner-config";
import { SoundState } from "../../../sound-manager/sound-state.interface";
import { SoundManagerConfig } from "../../../sound-manager/sound-manager-config";
import "./../../shared.css";
import "./sound-control.component.css";
/* @ts-ignore */
import soundControlComponentHtml from "./sound-control.component.html?raw";
import { SoundProgressStateInfo } from "../../../sound-manager/sound-progress-state-info";

interface SoundControlState {
  isPlaying: boolean;
  isPaused: boolean;
  isMuted: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  pan: number;
  panSpatialPosition: { x: number; y: number; z: number };
  progress: number;
  playbackRate: number;
}

type SpatialAudioListener = {
  target: HTMLElement | Document;
  type: keyof HTMLElementEventMap | keyof DocumentEventMap;
  listener: EventListenerOrEventListenerObject;
};

export class SoundControl {
  private element: HTMLElement;
  private progressSlider: HTMLInputElement;
  private progressInterval!: number;
  private currentOptions: playOptions = {};
  private panSlider: HTMLInputElement;
  private volumeSlider: HTMLInputElement;
  private playbackRateInput: HTMLInputElement;
  private isDragging = false;
  private previousVolume: number = 1;
  private listenersSpatialAudio: SpatialAudioListener[] = [];
  private circle!: HTMLElement;
  private debounceTimer: number = 0;
  private soundManagerConfig: SoundManagerConfig;

  private state: SoundControlState = {
    isPlaying: false,
    isPaused: false,
    isMuted: false,
    volume: 1,
    currentTime: 0,
    duration: 0,
    pan: 0,
    panSpatialPosition: { x: 0, y: 0, z: 0 },
    progress: 0,
    playbackRate: 1
  };

  constructor(
    private id: string,
    private soundManager: SoundManager,
    private container: HTMLElement,
    private isSprite: boolean = false
  ) {
    this.element = this.createControl();
    this.soundManagerConfig = this.soundManager.getConfig();
    this.progressSlider = this.element.querySelector(".progress-slider")!;
    this.panSlider = this.element.querySelector(".pan-slider")!;
    this.playbackRateInput = this.element.querySelector(".playback-rate-input")!;
    this.volumeSlider = this.element.querySelector(".volume-slider")!;
    this.initializeEventListeners();
    this.initializeSoundEventListeners();
    this.initializeLoopControls();
    this.container.appendChild(this.element);
    this.updateUIFromState();
  }

  private initializeSoundEventListeners(): void {
    Object.values(SoundEventsEnum).forEach((eventType) => {
      this.soundManager.addEventListener(eventType, this.handleSoundEvent.bind(this));
    });
  }

  private createControl(): HTMLElement {
    // First create the sprite badge HTML if needed
    const spriteBadgeHtml = this.isSprite
      ? `
        <div class="sprite-badge">
         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 12h2" />
          <path d="M7 9v6" />
          <path d="M11 6v12" />
          <path d="M15 9v6" />
          <path d="M19 12h2" />
          <rect x="4" y="4" width="16" height="16" rx="2" ry="2" stroke-dasharray="2 2" />
        </svg>
        <span>Sprite</span>
        </div>
    `
      : "";

    // Replace the template variables
    const template = soundControlComponentHtml
      .replace(/\${this\.id}/g, this.id)
      .replace("${hasSpriteHeader}", this.isSprite ? "sprite-header" : "")
      .replace(/\${isSprite}/g, this.isSprite ? spriteBadgeHtml : "");

    const wrapper = document.createElement("div");
    wrapper.innerHTML = template;
    return wrapper.firstElementChild as HTMLElement;
  }

  private bindButtonEvents(): void {
    const buttonHandlers = {
      "play-btn": () => this.play(),
      "pause-btn": () => this.pause(),
      "stop-btn": () => this.stop(),
      "mute-btn": () => this.toggleMute(),
      "fade-in-btn": () => this.fadeIn(),
      "fade-out-btn": () => this.fadeOut(),
      "close-btn": () => this.destroy(),
      "reset-sound-btn": () => this.reset(),
    };

    Object.entries(buttonHandlers).forEach(([className, handler]) => {
      this.element.querySelector(`.${className}`)?.addEventListener("click", handler);
    });
  }

  private updateState(): void {
    const soundState = this.soundManager.getSoundState(this.id);
    console.log('Demo: ->update State ', soundState);
    if (!soundState) return;

    const newState: SoundControlState = {
      isPlaying: soundState.state === SoundState.Playing,
      isPaused: soundState.state === SoundState.Paused,
      isMuted: soundState.volume === 0,
      volume: soundState.volume,
      currentTime: soundState.currentTime,
      duration: soundState.duration ?? 0,
      pan: soundState.pan ?? 0,
      panSpatialPosition: soundState.panSpatialPosition ?? { x: 0, y: 0, z: 0 },
      progress: (soundState.duration ?? 0) > 0 ? (soundState.currentTime / (soundState.duration ?? 0)) * 100 : 0,
      playbackRate: soundState.playbackRate || 1
    };

    this.state = newState;
    this.updateUIFromState();
  }

  private updateUIFromState(): void {
    // Button states
    const buttons = {
      "play-btn": this.state.isPlaying,
      "pause-btn": !this.state.isPlaying,
      "stop-btn": !this.state.isPlaying && !this.state.isPaused,
    };

    Object.entries(buttons).forEach(([className, disabled]) => {
      this.element.querySelector(`.${className}`)!.toggleAttribute("disabled", disabled);
    });

    this.updateVolumeDisplay(this.state.volume);
    this.updatePanDisplay(this.state.pan);
    this.updateTimeDisplay(this.state.currentTime);
    this.updateMuteButtonIcon(this.state.isMuted);
    this.updateProgress(this.state.progress);

    console.log('updateUIFromState playbackRate', this.state.playbackRate);
    // this.updatePlaybackRateDisplay(this.state.playbackRate);
    const value = parseFloat(this.playbackRateInput.value);
    this.soundManager.setPlaybackRate(this.id, value, true);

    // Recalculate panSpatialPosition values
    const recalculatedPanSpatialPosition = {
      x: (this.state.panSpatialPosition.x + 1) * 50, // Convert x from -1 to 1 to 0 to 100
      y: this.state.panSpatialPosition.y, // y remains unchanged
      z: (this.state.panSpatialPosition.z + 1) * 50, // Convert z from -1 to 1 to 0 to 100
    };

    this.log('recalculatedPanSpatialPosition', recalculatedPanSpatialPosition);

    // Call updateSpatialPosition with the recalculated values
    this.updateSpatialPosition(
      recalculatedPanSpatialPosition.x,
      recalculatedPanSpatialPosition.y,
      recalculatedPanSpatialPosition.z,
      true
    );

  }
  private handleRangeInput(input: HTMLInputElement, value?: number): void {
    if (value !== undefined) {
      input.value = value.toString();
    }
    const progress = ((parseFloat(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100;
    input.style.setProperty("--range-progress", `${progress}%`);
  }

  private readonly boundHandlers = {
    progressSeek: (e: Event) => {
      const state = this.soundManager.getSoundState(this.id);
      if (!state?.duration) return;

      const progress = parseFloat((e.target as HTMLInputElement).value);
      const newTime = (progress / 100) * state.duration;
      console.log('progress', progress, 'newTime', newTime);
      this.updateTimeDisplay(newTime);

      this.seekPosition(newTime);

    },

    setDragging: () => (this.isDragging = true),
    clearDragging: () => (this.isDragging = false),

    rangeInput: (input: HTMLInputElement) => () => {
      this.handleRangeInput(input);
    },
  };

  private initializeRangeInputs(): void {
    const inputs = this.element.querySelectorAll('input[type="range"]');
    inputs.forEach((input: Element) => {
      const rangeInput = input as HTMLInputElement;
      this.handleRangeInput(rangeInput);
      rangeInput.addEventListener("input", () => this.handleRangeInput(rangeInput));
    });
  }

  private initializeProgressSlider(): void {
    this.progressSlider.addEventListener("mousedown", this.boundHandlers.setDragging);
    this.progressSlider.addEventListener("input", this.boundHandlers.progressSeek);
    document.addEventListener("mouseup", this.boundHandlers.clearDragging);
  }

  private initializePlaybackRateControl(): void {
    this.playbackRateInput.addEventListener("change", this.handlePlaybackRateChange.bind(this));
  }

  private handlePlaybackRateChange(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.updatePlaybackRateDisplay(value);
    this.soundManager.setPlaybackRate(this.id, value);
  }

  private updatePlaybackRateDisplay(playbackRate: number): void {
    // Validate the input value
    if (isNaN(playbackRate) || playbackRate <= 0) {
      console.error("Playback rate must be at least 0");
      return;
    }
    this.playbackRateInput.value = playbackRate.toString();
    this.updateTimeDisplay(this.state.currentTime);
  }

  private seekPosition(time: number): void {
    this.soundManager.seek(this.id, time);
  }

  private initializeEventListeners(): void {
    this.bindButtonEvents();
    this.initializeVolumeControl();
    this.initializePanControl();
    this.initializePlaybackRateControl();
    this.initializeRangeInputs();
    this.initializeProgressSlider();
    this.initializeSpatialControl();
    this.initializeSpatialSettings();
    this.initializeCollapsiblePanel();
  }

  private reset(): void {
    this.soundManager.resetSound(this.id);
  }

  private updateProgress(progress: number): void {
    if (this.isDragging) return;
    this.handleRangeInput(this.progressSlider, progress);
    this.updateTimeDisplay(this.state.currentTime);
  }

  private handleVolumeInput = (e: Event): void => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    this.updateVolumeDisplay(value);
    this.soundManager.setSoundVolume(this.id, value);
  };

  private initializeVolumeControl(): void {
    this.volumeSlider.addEventListener("input", this.handleVolumeInput);
    const state = this.soundManager.getSoundState(this.id);
    if (state) {
      this.updateVolumeDisplay(state.volume);
      this.volumeSlider.value = state.volume.toString();
    }
  }
  private updateVolumeDisplay(value: number): void {
    this.handleRangeInput(this.volumeSlider, value);
    const volumeValue = this.element.querySelector(".volume-value") as HTMLSpanElement;
    volumeValue.textContent = `${Math.round(value * 100)}%`;
  }

  private handlePanInput = (e: Event): void => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    this.updatePanDisplay(value);
    this.soundManager.setPan(this.id, value);
  };

  private initializePanControl(): void {
    this.panSlider.addEventListener("input", this.handlePanInput);
    const state = this.soundManager.getSoundState(this.id);
    if (state) {
      this.updatePanDisplay(state.pan);
      this.panSlider.value = state.pan.toString();
    }
  }

  private updatePanDisplay(pan: number): void {
    this.handleRangeInput(this.panSlider, pan);
    const panValueElement = this.element.querySelector(".pan-value") as HTMLSpanElement;
    this.panSlider.value = pan.toString();
    if (panValueElement) {
      panValueElement.textContent = pan === 0 ? "center" : `${Math.round(pan * 100)}% ${pan < 0 ? "left" : "right"}`;
    }
  }


  private handleSoundEvent(event: SoundEvent): void {
    // First check if this event is for this specific sound
    if (event.soundId && event.soundId !== this.id) {
      // If the event is for a different sound, ignore it
      return;
    }

    // Handle global events (those without soundId) or events specific to this sound
    switch (event.type) {
      case SoundEventsEnum.STARTED:
        this.log("Sound started", event);
        break;

      case SoundEventsEnum.STOPPED:
        this.log("Sound stopped", event);
        break;

      case SoundEventsEnum.ENDED:
        this.log("Sound ended", event);
        break;

      case SoundEventsEnum.PAUSED:
        this.log("Sound paused", event);
        break;

      case SoundEventsEnum.RESUMED:
        this.log("Sound resumed", event);
        break;

      case SoundEventsEnum.VOLUME_CHANGED:
        this.log("Volume changed", event);
        break;

      case SoundEventsEnum.MASTER_VOLUME_CHANGED:
        this.log("Master volume changed", event);
        break;

      case SoundEventsEnum.PROGRESS:
        break;

      case SoundEventsEnum.ERROR:
        console.error("Sound error:", event.error);
        break;

      case SoundEventsEnum.MUTED:
        this.log("Sound muted", event);
        break;

      case SoundEventsEnum.UNMUTED:
        this.log("Sound unmuted", event);
        break;

      case SoundEventsEnum.FADE_IN_COMPLETED:
        this.log("Fade in completed", event);
        break;

      case SoundEventsEnum.FADE_OUT_COMPLETED:
        this.log("Fade out completed", event);
        break;

      case SoundEventsEnum.SEEKED:
        this.log("Sound seeked", event);
        break;

      case SoundEventsEnum.MASTER_PAN_CHANGED:
        this.log("Master pan changed", event);
        // this.resetSpatialPosition();
        break;

      case SoundEventsEnum.PAN_CHANGED:
        this.log("Pan changed", event);
        break;

      case SoundEventsEnum.SPATIAL_POSITION_CHANGED:
        this.log("Spatial position changed", event);
        break;

      case SoundEventsEnum.RESET:
        this.log("Sound reset", event);
        break;

      case SoundEventsEnum.LOOP_COMPLETED:
        this.log("Loop completed", event);
        break;

      case SoundEventsEnum.SPRITE_SET:
        this.log("Sprite set", event);
        break;

      case SoundEventsEnum.UPDATED_URL:
        this.log("Sound URL updated", event);
        break;

      case SoundEventsEnum.OPTIONS_UPDATED:
        this.log("Sound options updated", event);
        break;

      case SoundEventsEnum.PLAYBACK_RATE_CHANGED:
        this.log("Playback rate changed", event);
        break;

      case SoundEventsEnum.FADE_MASTER_IN_COMPLETED:
        this.log("Master fade in completed", event);
        break;

      case SoundEventsEnum.FADE_MASTER_OUT_COMPLETED:
        this.log("Master fade out completed", event);
        break;

      case SoundEventsEnum.GLOBAL_SPATIAL_POSITION_CHANGED:
        this.log("Global spatial position changed", event);
        break;

      case SoundEventsEnum.SPATIAL_POSITION_RESET:
        this.log("Spatial position reset", event);
        break;

      default:
        this.log(`Received ${event.type} event for sound ${event.soundId ? event.soundId : "global"}`);
        break;
    }
    this.updateState();
  }

  private log(...args: any[]) {
    if (process.env.NODE_ENV === "development") {
      console.log(...args);
    }
  }

  private updateTimeDisplay(currentTime: number): void {
    const timeDisplay = this.element.querySelector(".time-display");
    const state = this.soundManager.getSoundState(this.id);
    if (timeDisplay && state?.duration) {
      timeDisplay.textContent = `${this.formatTime(currentTime)} / ${this.formatTime(state.duration)}`;
    }
  }

  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }


  private play(): void {
    const state = this.soundManager.getSoundState(this.id);
    const isPaused = state?.state === SoundState.Paused;

    if (isPaused) {
      this.soundManager.resume(this.id);
    } else {
      this.soundManager.play(this.id, this.currentOptions);
    }
  }

  private pause(): void {
    this.soundManager.pause(this.id);
  }

  private stop(): void {
    this.soundManager.stop(this.id);
  }

  private toggleMute(): void {
    const state = this.soundManager.getSoundState(this.id);
    if (!state) return;

    if (state.volume === 0) {
      this.soundManager.setSoundVolume(this.id, this.previousVolume);
      this.soundManager.unmute(this.id);
    } else {
      this.previousVolume = state.volume;
      this.soundManager.mute(this.id);
      this.handleRangeInput(this.volumeSlider, 0);
    }
  }

  private updateMuteButtonIcon(isMuted: boolean): void {
    const muteIcon = this.element.querySelector(".mute-icon") as HTMLElement;
    const unmuteIcon = this.element.querySelector(".unmute-icon") as HTMLElement;

    if (muteIcon && unmuteIcon) {
      muteIcon.style.display = isMuted ? "block" : "none";
      unmuteIcon.style.display = isMuted ? "none" : "block";
    }
  }

  private fadeIn(): void {
    this.soundManager.fadeIn(this.id, 2000);
  }

  private fadeOut(): void {
    this.soundManager.fadeOut(this.id, 2000);
  }

  private initializeLoopControls(): void {
    const maxLoopsSelect = this.element.querySelector(".max-loops-select") as HTMLSelectElement;
    const loopCheckbox = this.element.querySelector(".loop-checkbox") as HTMLInputElement;
    const loopSettings = this.element.querySelector(".loop-settings") as HTMLElement;
    const maxLoopsInput = this.element.querySelector(".max-loops-input") as HTMLInputElement;

    const shouldLoop = this.currentOptions.loop ?? this.soundManagerConfig.loopSounds ?? false;
    loopCheckbox.checked = shouldLoop;
    loopSettings.style.display = shouldLoop ? "block" : "none";

    if (shouldLoop) {
      this.currentOptions.loop = true;
      this.currentOptions.maxLoops = -1;
    }

    const initialMaxLoops = this.currentOptions.maxLoops ?? (shouldLoop ? -1 : undefined);
    if (initialMaxLoops !== undefined) {
      if (initialMaxLoops === -1) {
        maxLoopsSelect.value = "-1";
        maxLoopsInput.style.display = "none";
      } else {
        maxLoopsSelect.value = "custom";
        maxLoopsInput.style.display = "inline";
        maxLoopsInput.value = initialMaxLoops.toString();
      }
    }

    loopCheckbox.addEventListener("change", () => {
      this.currentOptions.loop = loopCheckbox.checked;
      loopSettings.style.display = loopCheckbox.checked ? "block" : "none";

      if (loopCheckbox.checked) {
        this.currentOptions.maxLoops = -1;
        maxLoopsSelect.value = "-1";
        maxLoopsInput.style.display = "none";
      } else {
        delete this.currentOptions.maxLoops;
      }

      this.soundManager.updateSoundOptions(this.id, {
        loop: this.currentOptions.loop,
        maxLoops: this.currentOptions.loop ? this.currentOptions.maxLoops || -1 : 0,
      });
    });

    maxLoopsSelect.addEventListener("change", () => {
      if (maxLoopsSelect.value === "-1") {
        this.currentOptions.maxLoops = -1;
        maxLoopsInput.style.display = "none";
      } else {
        maxLoopsInput.style.display = "inline";
        this.currentOptions.maxLoops = parseInt(maxLoopsInput.value);
      }

      this.soundManager.updateSoundOptions(this.id, {
        maxLoops: this.currentOptions.maxLoops || 0,
      });
    });

    maxLoopsInput.addEventListener("change", () => {
      const value = parseInt(maxLoopsInput.value);
      if (value > 0) {
        this.currentOptions.maxLoops = value;
      }
      this.soundManager.updateSoundOptions(this.id, {
        maxLoops: this.currentOptions.maxLoops || 0,
      });
    });

    if (shouldLoop) {
      this.currentOptions = {
        ...this.currentOptions,
        loop: true,
        maxLoops: -1,
      };
    }
  }

  private initializeSpatialControl(): void {
    const grid = this.element.querySelector(".spatial-grid") as HTMLElement;
    this.circle = this.element.querySelector(".spatial-position-circle") as HTMLElement;
    const verticalSlider = this.element.querySelector(".vertical-slider") as HTMLInputElement;
    let isDragging = false;

    // Handle vertical slider input
    verticalSlider.addEventListener("input", () => {
      const y = parseFloat(verticalSlider.value);
      // Calculate x and z based on the circle's current position
      const circleLeft = parseFloat(this.circle.style.left); // Percentage of the grid width
      const circleTop = parseFloat(this.circle.style.top); // Percentage of the grid height

      // Convert percentages to -1 to 1 range
      const x = (circleLeft / 50) - 1; // X: -1 (left) to 1 (right)
      const z = -((circleTop / 50) - 1); // Z: -1 (back) to 1 (front)

      this.updateSpatialPosition(circleLeft, y, circleTop);
    });


    const handleMouseMove: EventListener = (e: Event): void => {
      if (!isDragging) return;
      const mouseEvent = e as MouseEvent;
      const rect = grid.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((mouseEvent.clientX - rect.left) / rect.width) * 100));
      const z = Math.max(0, Math.min(100, ((mouseEvent.clientY - rect.top) / rect.height) * 100));
      const y = parseFloat(verticalSlider.value); // Keep the Y value from the slider
      this.updateSpatialPosition(x, y, z);
    };

    const handleTouchMove: EventListener = (e: Event): void => {
      if (!isDragging) return;
      const touchEvent = e as TouchEvent;
      const rect = grid.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((touchEvent.touches[0].clientX - rect.left) / rect.width) * 100));
      const z = Math.max(0, Math.min(100, ((touchEvent.touches[0].clientY - rect.top) / rect.height) * 100));
      const y = parseFloat(verticalSlider.value); // Keep the Y value from the slider
      this.updateSpatialPosition(x, y, z);
    };

    const handleMouseDown: EventListener = (): void => {
      isDragging = true;
    };
    const handleMouseUp: EventListener = (): void => {
      isDragging = false;
    };
    const handleTouchStart: EventListener = (e: Event): void => {
      isDragging = true;
      (e as TouchEvent).preventDefault();
    };
    const handleTouchEnd: EventListener = (): void => {
      isDragging = false;
    };
    const handleGridClick: EventListener = (e: Event): void => {
      const mouseEvent = e as MouseEvent;
      const rect = grid.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((mouseEvent.clientX - rect.left) / rect.width) * 100));
      const z = Math.max(0, Math.min(100, ((mouseEvent.clientY - rect.top) / rect.height) * 100));
      const y = parseFloat(verticalSlider.value);
      // const normalizedZ = (y / 50 - 1) * -1;
      this.updateSpatialPosition(x, y, z);
    };

    const listeners: SpatialAudioListener[] = [
      { target: this.circle, type: "mousedown", listener: handleMouseDown },
      { target: document, type: "mouseup", listener: handleMouseUp },
      { target: document, type: "mousemove", listener: handleMouseMove },
      { target: this.circle, type: "touchstart", listener: handleTouchStart },
      { target: document, type: "touchend", listener: handleTouchEnd },
      { target: document, type: "touchmove", listener: handleTouchMove },
      { target: grid, type: "click", listener: handleGridClick },
    ];

    listeners.forEach(({ target, type, listener }) => {
      target.addEventListener(type, listener);
    });

    this.listenersSpatialAudio = listeners;

    // Initialize position at center
    const centerX = 50;
    const centerY = 50;
    this.circle.style.left = `${centerX}%`;
    this.circle.style.top = `${centerY}%`;
  }

  private isSpatialPositionCentered(): boolean {
    const circle = this.element.querySelector(".spatial-position-circle") as HTMLElement;
    if (!circle) return false;

    // Get current position (in percentage)
    const currentLeft = parseFloat(circle.style.left);
    const currentTop = parseFloat(circle.style.top);

    // Check if position is centered (50% is center)
    return Math.abs(currentLeft - 50) < 0.1 && Math.abs(currentTop - 50) < 0.1;
  }

  private resetSpatialPosition(visualOnly: boolean = false): void {
    // If already centered, don't do anything
    if (this.isSpatialPositionCentered()) {
      return;
    }
    // Reset to center (50% is center for both x and y)
    this.updateSpatialPosition(50, 0, 50, visualOnly);
  }

  private updateSpatialPosition(x: number, y: number, z: number, visualOnly: boolean = false): void {
    const grid = this.element.querySelector(".spatial-grid") as HTMLElement;
    const circle = this.element.querySelector(".spatial-position-circle") as HTMLElement;
    const verticalSlider = this.element.querySelector(".vertical-slider") as HTMLInputElement;

    if (!grid || !circle || !verticalSlider) return;

    circle.style.left = `${x}%`;
    circle.style.top = `${z}%`;

    // Update vertical slider (Y)
    verticalSlider.value = y.toString();

    // Update sound position
    if (!visualOnly) {
      this.soundManager.setSoundPosition(
        x / 50 - 1, // X: -1 (left) to 1 (right)
        y, // Y: -1 (down) to 1 (up) So in up and down direction
        z / 50 - 1, // Z: -1 (back) to 1 (front)
        this.id
      );
    }

    // Update coordinates display
    const coordsDisplay = this.element.querySelector(".spatial-coordinates") as HTMLElement;
    if (coordsDisplay) {
      coordsDisplay.innerHTML = `<strong>Position:</strong><br/>X: ${(x / 50 - 1).toFixed(2)},<br/> Y: ${y.toFixed(2)},<br/>Z: ${(z / 50 - 1).toFixed(2)}`;
    }
  }

  private initializeSpatialSettings(): void {
    const container = this.element.querySelector(".spatial-settings");
    if (!container) return;

    // Get initial config
    const config = {
      ...DEFAULT_PANNER_CONFIG,
      ...(this.soundManagerConfig.pannerNodeConfig || {}),
    };

    // Initialize all inputs with current values
    const elements = {
      panningModel: container.querySelector(".panning-model-select") as HTMLSelectElement,
      distanceModel: container.querySelector(".distance-model-select") as HTMLSelectElement,
      refDistance: container.querySelector(".ref-distance-input") as HTMLInputElement,
      maxDistance: container.querySelector(".max-distance-input") as HTMLInputElement,
      rolloffFactor: container.querySelector(".rolloff-factor-input") as HTMLInputElement,
      coneInnerAngle: container.querySelector(".cone-inner-angle-input") as HTMLInputElement,
      coneOuterAngle: container.querySelector(".cone-outer-angle-input") as HTMLInputElement,
      coneOuterGain: container.querySelector(".cone-outer-gain-input") as HTMLInputElement,
    };

    // Set initial values
    elements.panningModel.value = config.panningModel!;
    elements.distanceModel.value = config.distanceModel!;
    elements.refDistance.value = config.refDistance!.toString();
    elements.maxDistance.value = config.maxDistance!.toString();
    elements.rolloffFactor.value = config.rolloffFactor!.toString();
    elements.coneInnerAngle.value = config.coneInnerAngle!.toString();
    elements.coneOuterAngle.value = config.coneOuterAngle!.toString();
    elements.coneOuterGain.value = config.coneOuterGain!.toString();

    // Add change handlers
    const handleChange = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLSelectElement;
      const value = target.type === "number" ? parseFloat(target.value) : target.value;

      // Map class names to property names
      const propertyMap: Record<string, keyof SoundPannerConfig> = {
        "panning-model-select": "panningModel",
        "distance-model-select": "distanceModel",
        "ref-distance-input": "refDistance",
        "max-distance-input": "maxDistance",
        "rolloff-factor-input": "rolloffFactor",
        "cone-inner-angle-input": "coneInnerAngle",
        "cone-outer-angle-input": "coneOuterAngle",
        "cone-outer-gain-input": "coneOuterGain",
      };

      const property = propertyMap[target.className];
      if (!property) return;

      // Update the panner node configuration
      const newConfig: Partial<SoundPannerConfig> = {
        [property]: value,
      };

      // Update the sound's spatial settings
      this.soundManager.setSoundPosition(
        parseFloat(this.circle.style.left) / 50 - 1,
        -(parseFloat(this.circle.style.top) / 50 - 1),
        0,
        this.id,
        newConfig
      );
    };

    // Add event listeners
    Object.values(elements).forEach((element) => {
      element.addEventListener("change", handleChange);
    });
  }

  private initializeCollapsiblePanel(): void {
    const header = this.element.querySelector(".control-header") as HTMLElement;
    const content = this.element.querySelector(".spatial-content") as HTMLElement;
    const button = header.querySelector(".collapse-btn") as HTMLButtonElement;

    // Set initial state (collapsed)
    content.classList.add("collapsed");

    const toggleCollapse = () => {
      const isCollapsed = content.classList.contains("collapsed");
      content.classList.toggle("collapsed");
      button.style.transform = isCollapsed ? "rotate(180deg)" : "rotate(0deg)";

      // Store the state in localStorage (optional)
      localStorage.setItem(`spatial-panel-${this.id}-collapsed`, (!isCollapsed).toString());
    };

    // Add click handler to both header and button
    header.addEventListener("click", toggleCollapse);

    // Prevent double-triggering when clicking the button
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCollapse();
    });

    // Restore state from localStorage (optional)
    const savedState = localStorage.getItem(`spatial-panel-${this.id}-collapsed`);
    if (savedState === "false") {
      toggleCollapse();
    }
  }

  public destroy(): void {
    try {
      this.soundManager.resetSound(this.id);

      const cleanupTasks: (() => void)[] = [
        // Clear intervals
        () => {
          if (this.progressInterval) {
            window.clearInterval(this.progressInterval);
            this.progressInterval = 0;
          }
          if (this.debounceTimer) {
            window.clearTimeout(this.debounceTimer);
            this.debounceTimer = 0;
          }
        },

        // Remove sound event listeners
        () => {
          const boundHandler = this.handleSoundEvent.bind(this);
          Object.values(SoundEventsEnum).forEach((eventType) => {
            this.soundManager.removeEventListener(eventType, boundHandler);
          });
        },

        // Remove playback rate input listener
        () => {
          if (this.playbackRateInput) {
            this.playbackRateInput.removeEventListener("change", this.handlePlaybackRateChange);
          }
        },

        // Remove button event listeners
        () => {
          const buttonHandlers = {
            "play-btn": this.play.bind(this),
            "pause-btn": this.pause.bind(this),
            "stop-btn": this.stop.bind(this),
            "mute-btn": this.toggleMute.bind(this),
            "fade-in-btn": this.fadeIn.bind(this),
            "fade-out-btn": this.fadeOut.bind(this),
            "reset-sound-btn": this.reset.bind(this),
          };

          Object.entries(buttonHandlers).forEach(([className, handler]) => {
            this.element.querySelector(`.${className}`)?.removeEventListener("click", handler);
          });
        },

        // Remove slider event listeners
        () => {
          if (this.volumeSlider) {
            this.volumeSlider.removeEventListener("input", this.handleVolumeInput);
          }

          if (this.panSlider) {
            this.panSlider.removeEventListener("input", this.handlePanInput);
          }

          if (this.progressSlider) {
            this.progressSlider.removeEventListener("mousedown", this.boundHandlers.setDragging);
            // this.progressSlider.removeEventListener("input", this.boundHandlers.progressDrag);
            this.progressSlider.removeEventListener("change", this.boundHandlers.progressSeek);
          }

          document.removeEventListener("mouseup", this.boundHandlers.clearDragging);
        },

        // Remove range input listeners
        () => {
          this.element.querySelectorAll('input[type="range"]').forEach((input: Element) => {
            const rangeInput = input as HTMLInputElement;
            const handler = (rangeInput as any)._rangeHandler;
            if (handler) {
              rangeInput.removeEventListener("input", handler);
              delete (rangeInput as any)._rangeHandler;
            }
          });
        },

        // Remove spatial audio event listeners
        () => {
          if (this.listenersSpatialAudio) {
            this.listenersSpatialAudio.forEach(({ target, type, listener }) =>
              target.removeEventListener(type, listener)
            );
            this.listenersSpatialAudio = [];
          }
        },

        // Stop sound if playing
        () => {
          if (this.state.isPlaying) {
            this.soundManager.stop(this.id);
          }
        },

        // Remove the element from DOM
        () => {
          if (this.element && this.element.parentNode) {
            this.element.remove();
          }
        },

        // Clear state
        () => {
          this.state = {
            isPlaying: false,
            isPaused: false,
            isMuted: false,
            volume: 1,
            currentTime: 0,
            duration: 0,
            pan: 0,
            panSpatialPosition: { x: 0, y: 0, z: 0 },
            progress: 0,
            playbackRate: 1
          };
        },
      ];

      // Execute all cleanup tasks
      cleanupTasks.forEach((task, index) => {
        try {
          task();
        } catch (error) {
          console.error(`Error during cleanup task ${index}:`, error);
        }
      });

      this.element.innerHTML = "";
      this.log('destroy completed');
    } catch (error) {
      console.error("Error during component destruction:", error);
    }
  }
}
