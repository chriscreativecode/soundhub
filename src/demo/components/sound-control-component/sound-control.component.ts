import { PlayOptions } from "../../../sound-manager/play-sound-options.interface";
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
import { SpatialGrid } from "../spatial-grid-component/spatial-grid.component";

export interface SoundControlState {
  isPlaying: boolean;
  isPaused: boolean;
  isMuted: boolean;
  volume: number;
  elapsedTime: number;
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
  private currentOptions: PlayOptions = {};
  private panSlider: HTMLInputElement;
  private volumeSlider: HTMLInputElement;
  private playbackRateInput: HTMLInputElement;
  private isDragging = false;
  private previousVolume: number = 1;
  private listenersSpatialAudio: SpatialAudioListener[] = [];
  private soundManagerConfig: SoundManagerConfig;
  private spatialGrid: SpatialGrid;
  private isUpdatingUI = false;
  private loopCheckbox: HTMLInputElement;
  private maxLoopsSelect: HTMLSelectElement;
  private loopSettings: HTMLElement;
  private maxLoopsInput: HTMLInputElement;

  private state: SoundControlState = {
    isPlaying: false,
    isPaused: false,
    isMuted: false,
    volume: 1,
    elapsedTime: 0,
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
    this.loopCheckbox = this.element.querySelector(".loop-checkbox")!;
    this.maxLoopsSelect = this.element.querySelector(".max-loops-select")!;
    this.loopSettings = this.element.querySelector(".loop-settings")!;
    this.maxLoopsInput = this.element.querySelector(".max-loops-input")!;

    // Initialize currentOptions with default values from soundManagerConfig and HTML inputs
    this.initializeCurrentOptions();

    this.initializeEventListeners();
    this.initializeSoundEventListeners();
    this.initializeLoopControls();
    this.spatialGrid = new SpatialGrid(this.element.querySelector(".spatial-grid-container-wrapper")!, this.soundManager, this.id);
    this.container.appendChild(this.element);
    this.updateState();
  }

  private initializeCurrentOptions(): void {
    this.currentOptions = {
      loop: this.soundManagerConfig.loopSounds ?? this.loopCheckbox.checked,
      maxLoops: this.soundManagerConfig.maxLoops ?? parseInt(this.maxLoopsInput.value),
      volume: this.soundManagerConfig.defaultVolume ?? parseFloat(this.volumeSlider.value),
      pan: this.soundManagerConfig.defaultPan ?? parseFloat(this.panSlider.value),
      playbackRate: this.soundManagerConfig.defaultPlaybackRate ?? parseFloat(this.playbackRateInput.value),

       startTime: 4,
      // duration: 2,
    };
    this.applyCurrentOptions();
  }

  private applyCurrentOptions(): void {
    if (this.currentOptions.volume !== undefined) {
      this.soundManager.setSoundVolume(this.id, this.currentOptions.volume, true);
      this.volumeSlider.value = this.currentOptions.volume.toString();
    }
    if (this.currentOptions.pan !== undefined) {
      this.soundManager.setPan(this.id, this.currentOptions.pan, true);
      this.panSlider.value = this.currentOptions.pan.toString();
    }
    if (this.currentOptions.playbackRate !== undefined) {
      this.soundManager.setPlaybackRate(this.id, this.currentOptions.playbackRate, true);
      this.playbackRateInput.value = this.currentOptions.playbackRate.toString();
    }

    if (this.currentOptions.loop !== undefined) {
      this.soundManager.setLoop(this.id, this.currentOptions.loop, this.currentOptions.maxLoops);
      this.loopCheckbox.checked = this.currentOptions.loop;
    }

    if (this.currentOptions && this.currentOptions.maxLoops !== undefined) {
      this.soundManager.setLoop(this.id, this.currentOptions.loop ?? false, this.currentOptions.maxLoops);
    }

    if (this.currentOptions.startTime !== undefined) {
      this.soundManager.seek(this.id, this.currentOptions.startTime, true);
    }

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
    if (!soundState) return;

    const newState: SoundControlState = {
      isPlaying: soundState.state === SoundState.Playing,
      isPaused: soundState.state === SoundState.Paused,
      isMuted: soundState.volume === 0,
      volume: soundState.volume,
      elapsedTime: soundState.elapsedTime,
      duration: soundState.duration ?? 0,
      pan: soundState.pan ?? this.currentOptions?.pan ?? 0,
      panSpatialPosition: soundState.panSpatialPosition ?? { x: 0, y: 0, z: 0 },
      progress: soundState.progress * 100 || 0,
      playbackRate: soundState.playbackRate || 1
    };
    console.log('new State', newState, soundState);

    this.state = newState;
    this.updateUIFromState();
  }

  private updateUIFromState(): void {
    if (this.isUpdatingUI) return;
    this.isUpdatingUI = true;
    // Button states
    const buttons = {
      "play-btn": this.state.isPlaying,
      "pause-btn": !this.state.isPlaying,
      "stop-btn": !this.state.isPlaying && !this.state.isPaused,
    };

    Object.entries(buttons).forEach(([className, disabled]) => {
      this.element.querySelector(`.${className}`)!.toggleAttribute("disabled", disabled);
    });

    // Update playback rate only if it has changed
    const newPlaybackRate = parseFloat(this.playbackRateInput.value);
    if (newPlaybackRate !== this.state.playbackRate) {
      this.soundManager.setPlaybackRate(this.id, newPlaybackRate, true);
    }

    this.updateVolumeDisplay(this.state.volume);
    this.updatePanDisplay(this.state.pan);
    this.updateMuteButtonIcon(this.state.isMuted);
    this.updateProgress(this.state.progress); 
    this.updateTimeDisplay(this.state.elapsedTime);

    if (this.state) {
      const currentPosition = this.spatialGrid.getCurrentPosition();
      const statePosition = this.spatialGrid.getPositionFromState(this.state);

      this.log('Position comparison:', {
        current: {
          x: currentPosition.x.toFixed(4),
          y: currentPosition.y.toFixed(4),
          z: currentPosition.z.toFixed(4)
        },
        state: {
          x: statePosition.x.toFixed(4),
          y: statePosition.y.toFixed(4),
          z: statePosition.z.toFixed(4)
        },
        differences: {
          x: Math.abs(currentPosition.x - statePosition.x),
          y: Math.abs(currentPosition.y - statePosition.y),
          z: Math.abs(currentPosition.z - statePosition.z)
        }
      });

      if (this.spatialGrid.isSamePostion(statePosition, currentPosition)) {
        this.log('same position no need to update!!');
      } else {
        this.log('positions differ, updating...');
        this.spatialGrid.updatePosition(
          statePosition.x,
          statePosition.y,
          statePosition.z,
          true
        );
      }
    }
    this.isUpdatingUI = false;
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

    const stepUpButton = this.element.querySelector('.step-up')! as HTMLButtonElement;
    const stepDownButton = this.element.querySelector('.step-down')! as HTMLButtonElement;

    // Helper function to update the input value and trigger internal logic
    const updateValue = (action: 'stepUp' | 'stepDown') => {
      const currentValue = parseFloat(this.playbackRateInput.value);
      const step = parseFloat(this.playbackRateInput.step) || 0.01; // Default step is 0.01 if not specified
      let newValue: number;

      if (action === 'stepUp') {
        newValue = currentValue + step;
      } else {
        newValue = currentValue - step;
      }

      // Ensure the new value is within the min and max bounds
      const min = parseFloat(this.playbackRateInput.min) || 0;
      const max = parseFloat(this.playbackRateInput.max) || Infinity;
      newValue = Math.min(Math.max(newValue, min), max);

      newValue = this.soundManager.roundValue(newValue, 2);

      this.playbackRateInput.value = newValue.toString();
    };

    // Simulate the native spinner behavior
    const simulateSpinnerBehavior = (button: HTMLButtonElement, action: 'stepUp' | 'stepDown') => {
      let timeoutId: number | null = null;
      let intervalId: number | null = null;
      let repeatCount = 0;

      const getDelay = () => {
        // Mimic browser's native acceleration behavior
        if (repeatCount < 4) return 200;
        if (repeatCount < 8) return 100;
        if (repeatCount < 12) return 50;
        if (repeatCount < 24) return 40;
        if (repeatCount < 50) return 30;
        if (repeatCount < 100) return 25;
        return 20;
      };

      const startRepeating = () => {
        updateValue(action); // Update the value and trigger internal logic
        repeatCount++;

        // Clear existing interval if any
        if (intervalId) clearInterval(intervalId);

        // Set up the interval with dynamic delay recalculation
        const intervalCallback = () => {
          updateValue(action); // Update the value and trigger internal logic
          repeatCount++;

          // Recalculate the delay dynamically
          const delay = getDelay();

          // Clear the existing interval and set a new one with the updated delay
          if (intervalId) clearInterval(intervalId);
          intervalId = window.setInterval(intervalCallback, delay);
          const value = parseFloat((this.playbackRateInput).value);
          this.updatePlaybackRateDisplay(value);
          this.soundManager.setPlaybackRate(this.id, value, false);
        };

        // Start the first iteration with the initial delay
        const initialDelay = getDelay();
        intervalId = window.setInterval(intervalCallback, initialDelay);

      };

      const stopRepeating = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (intervalId) clearInterval(intervalId);
        repeatCount = 0;
      };

      // Common event handler for both mouse and touch events
      const startHandler = (e: Event) => {
        e.preventDefault();
        updateValue(action); // Update the value and trigger internal logic
        repeatCount = 0;

        // Start repeat after initial delay
        timeoutId = window.setTimeout(startRepeating, 100); // Initial delay is 100ms
      };

      // Add event listeners for mouse and touch events
      button.addEventListener('mousedown', startHandler);
      button.addEventListener('mouseup', stopRepeating);
      button.addEventListener('mouseleave', stopRepeating);

      button.addEventListener('touchstart', startHandler);
      button.addEventListener('touchend', stopRepeating);
      button.addEventListener('touchcancel', stopRepeating);
    };

    // Initialize buttons
    simulateSpinnerBehavior(stepUpButton, 'stepUp');
    simulateSpinnerBehavior(stepDownButton, 'stepDown');
  }

  private handlePlaybackRateChange(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.updatePlaybackRateDisplay(value);
    this.soundManager.setPlaybackRate(this.id, value);
    this.updateState();
  }

  private updatePlaybackRateDisplay(playbackRate: number): void {
    // Validate the input value
    if (isNaN(playbackRate) || playbackRate <= 0) {
      console.error("Playback rate must be at least 0");
      return;
    }
    this.playbackRateInput.value = playbackRate.toString();
    this.updateTimeDisplay(this.state.elapsedTime);
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
    this.initializeSpatialSettings();
    this.initializeCollapsiblePanel();
  }

  private reset(): void {
    this.soundManager.resetSound(this.id);
    this.playbackRateInput.value = (this.currentOptions?.playbackRate ?? 1).toString();
  }


  private updateProgress(progress: number): void {
    if (this.isDragging) return;
    this.handleRangeInput(this.progressSlider, progress);
    this.updateTimeDisplay(this.state.elapsedTime);
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
    // First check if this event is for this specific sound or if it's a global event we should ignore
    if ((event.soundId && event.soundId !== this.id) ||
      event.type === SoundEventsEnum.MASTER_PAN_CHANGED ||
      event.type === SoundEventsEnum.MASTER_VOLUME_CHANGED ||
      event.type === SoundEventsEnum.MUTE_GLOBAL ||
      event.type === SoundEventsEnum.UNMUTE_GLOBAL) {
      // Ignore master events and events for other sounds
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
      // case SoundEventsEnum.MASTER_VOLUME_CHANGED:
      //   this.log("Master volume changed", event);
      //   break;

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

      // case SoundEventsEnum.MASTER_PAN_CHANGED:
      //   this.log("Master pan changed", event);
      //   // this.resetSpatialPosition();
      //   break;

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
      // console.log(...args);
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

    // this.currentOptions.loop = true;
    // this.currentOptions.duration = 4;
    //  this.currentOptions.startTime = 3;
    //  this.currentOptions.pan = -0.75;
    //  this.currentOptions.pauseAtDurationReached = true;

    if (isPaused) {
      this.soundManager.resume(this.id);
    } else {
      this.soundManager.play(this.id, this.currentOptions);
      //  this.soundManager.play(this.id, this.currentOptions); // this.currentOptions);
      // setTimeout(() => {
      //   this.soundManager.play(this.id, this.currentOptions);
      // }, 1000);
    }
    this.updateState();
  }

  private pause(): void {
    this.soundManager.pause(this.id);
    this.updateState();
  }

  private stop(): void {
    this.soundManager.stop(this.id);
    this.updateState();
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
    this.updateState();
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
    this.soundManager.fadeIn(this.id, 2);
    this.updateState();
  }

  private fadeOut(): void {
    this.soundManager.fadeOut(this.id, 2);
    this.updateState();
  }

  private initializeLoopControls(): void {
    this.maxLoopsSelect = this.element.querySelector(".max-loops-select") as HTMLSelectElement;
    this.loopCheckbox = this.element.querySelector(".loop-checkbox") as HTMLInputElement;
    this.loopSettings = this.element.querySelector(".loop-settings") as HTMLElement;
    this.maxLoopsInput = this.element.querySelector(".max-loops-input") as HTMLInputElement;
  
    const shouldLoop = this.currentOptions.loop ?? this.soundManagerConfig.loopSounds ?? false;
    this.loopCheckbox.checked = shouldLoop;
    this.loopSettings.style.display = shouldLoop ? "block" : "none";
  
    // Only set maxLoops to -1 if it is not already defined
    if (shouldLoop && this.currentOptions.maxLoops === undefined) {
      this.currentOptions.maxLoops = -1;
    }
  
    const initialMaxLoops = this.currentOptions.maxLoops ?? (shouldLoop ? -1 : undefined);
    if (initialMaxLoops !== undefined) {
      if (initialMaxLoops === -1) {
        this.maxLoopsSelect.value = "-1";
        this.maxLoopsInput.style.display = "none";
      } else {
        this.maxLoopsSelect.value = "custom";
        this.maxLoopsInput.style.display = "inline";
        this.maxLoopsInput.value = initialMaxLoops.toString();
      }
    }
  
    this.loopCheckbox.addEventListener("change", () => {
      this.currentOptions.loop = this.loopCheckbox.checked;
      this.loopSettings.style.display = this.loopCheckbox.checked ? "block" : "none";
  
      if (this.loopCheckbox.checked) {
        this.currentOptions.maxLoops = -1;
        this.maxLoopsSelect.value = "-1";
        this.maxLoopsInput.style.display = "none";
      } else {
        delete this.currentOptions.maxLoops;
      }
  
      this.soundManager.updateSoundOptions(this.id, {
        loop: this.currentOptions.loop,
        maxLoops: this.currentOptions.loop ? this.currentOptions.maxLoops || -1 : 0,
      });
    });
  
    this.maxLoopsSelect.addEventListener("change", () => {
      if (this.maxLoopsSelect.value === "-1") {
        this.currentOptions.maxLoops = -1;
        this.maxLoopsInput.style.display = "none";
      } else {
        this.maxLoopsInput.style.display = "inline";
        this.currentOptions.maxLoops = parseInt(this.maxLoopsInput.value);
      }
  
      this.soundManager.updateSoundOptions(this.id, {
        maxLoops: this.currentOptions.maxLoops || 0,
      });
    });
  
    this.maxLoopsInput.addEventListener("change", () => {
      const value = parseInt(this.maxLoopsInput.value);
      if (value > 0) {
        this.currentOptions.maxLoops = value;
      }
      this.soundManager.updateSoundOptions(this.id, {
        maxLoops: this.currentOptions.maxLoops || 0,
      });
    });
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

      this.spatialGrid.setSpatialPositionWithConfig(newConfig)

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
    // prevent any updates if it was removed from the DOM
    this.isUpdatingUI = true;
    try {
      this.soundManager.resetSound(this.id);

      const cleanupTasks: (() => void)[] = [
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
            elapsedTime: 0,
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
