import { playOptions } from "../../sound-manager/play-sound-options.interface";
import { SoundEvent } from "../../sound-manager/sound-event.interface";
import { SoundEventsEnum } from "../../sound-manager/sound-events.enum";
import { SoundManager } from "../../sound-manager/sound-manager";
import { DEFAULT_PANNER_CONFIG, SoundPannerConfig } from "../../sound-manager/sound-panner-config";
import { SoundState } from "../../sound-manager/sound-state.interface";
import { SoundManagerConfig } from "../../sound-manager/sound-manager-config";
import "./../shared.css";
import "./sound-control.component.css";
/* @ts-ignore */
import soundControlComponentHtml from "./sound-control.component.html?raw";
import { SoundProgressStateInfo } from "../../sound-manager/sound-progress-state-info";

interface SoundControlState {
  isPlaying: boolean;
  isPaused: boolean;
  isMuted: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  pan: number;
  progress: number;
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
    progress: 0,
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
    this.volumeSlider = this.element.querySelector(".volume-slider")!;
    this.initializeEventListeners();
    this.initializeSoundEventListeners();
    this.initializeLoopControls();
    this.container.appendChild(this.element);
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
      .replace(/\${isSprite}/g, this.isSprite ? spriteBadgeHtml: "");

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
    };

    Object.entries(buttonHandlers).forEach(([className, handler]) => {
      this.element.querySelector(`.${className}`)?.addEventListener("click", handler);
    });
  }

  private readonly eventHandlers: Partial<Record<SoundEventsEnum, (event: SoundEvent) => void>> = {
    // [SoundEventsEnum.STARTED]: () =>  {},
    [SoundEventsEnum.STOPPED]: () => {
      this.resetProgress();
    },
    [SoundEventsEnum.ENDED]: () => {
      this.resetProgress();
    },
    [SoundEventsEnum.PAUSED]: (e: SoundEvent) => {
      console.log("paused", e);
    },
    // [SoundEventsEnum.RESUMED]: () => {},
    [SoundEventsEnum.VOLUME_CHANGED]: (event) => {
      if (typeof event.volume === "number") {
        this.updateVolumeDisplay(event.volume);
        this.volumeSlider.value = event.volume.toString();
        this.handleRangeInput(this.volumeSlider);
      }
    },
    [SoundEventsEnum.PROGRESS]: (event: SoundEvent) => {
      if (event.progressInfo) {
        this.updateProgress(event.progressInfo);
      }
    },
    [SoundEventsEnum.ERROR]: (event) => console.error("Sound error:", event.error),
    [SoundEventsEnum.MUTED]: () => {
      this.updateMuteButtonIcon(true);
      this.volumeSlider.value = "0";
      this.handleRangeInput(this.volumeSlider);
    },
    [SoundEventsEnum.UNMUTED]: () => {
      this.updateMuteButtonIcon(false);
      this.volumeSlider.value = this.previousVolume.toString();
      this.handleRangeInput(this.volumeSlider);
    },

    [SoundEventsEnum.FADE_IN_COMPLETED]: () => {
      // Handle fade in completion if needed
    },
    [SoundEventsEnum.FADE_OUT_COMPLETED]: () => {
      // Handle fade out completion if needed
    },
    [SoundEventsEnum.SEEKED]: (e: SoundEvent) => {
      if (e.progressInfo) {
        console.log("is seeking?", e);
      }
    },
    [SoundEventsEnum.MASTER_PAN_CHANGED]: () => {
      this.resetSpatialPosition();
    },
    [SoundEventsEnum.PAN_CHANGED]: () => {
      this.resetSpatialPosition(true);
    },
    [SoundEventsEnum.SPATIAL_POSITION_CHANGED]: (event) => {
      if (event.position) {
        this.resetPan(true);
      }
    },
    [SoundEventsEnum.RESET]: (event) => {
      this.reset(event.resetOptions);
    },
  };

  private updateState(): void {
    const soundState = this.soundManager.getSoundState(this.id);
    if (!soundState) return;

    const newState = {
      isPlaying: soundState.state === SoundState.Playing,
      isPaused: soundState.state === SoundState.Paused,
      isMuted: soundState.volume === 0,
      volume: soundState.volume,
      currentTime: soundState.currentTime,
      duration: soundState.duration ?? 0,
      pan: parseFloat(this.panSlider.value),
      progress: 0,
    };

    newState.progress = newState.duration > 0 ? (newState.currentTime / newState.duration) * 100 : 0;

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

    // Update displays
    if (this.state.isMuted) {
      this.volumeSlider.value = "0";
    } else {
      this.volumeSlider.value = this.state.volume.toString();
    }
    this.handleRangeInput(this.volumeSlider);
    this.updateVolumeDisplay(this.state.volume);
    this.updatePanDisplay(this.state.pan);
    this.updateTimeDisplay(this.state.currentTime);
    this.updateMuteButtonIcon(this.state.isMuted);
  }

  private handleRangeInput(input: HTMLInputElement, callback?: (value: number) => void): void {
    const value = parseFloat(input.value);
    const progress = ((value - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100;

    input.style.setProperty("--range-progress", `${progress}%`);
    callback?.(value);
  }

  private readonly boundHandlers = {
    progressSeek: (e: Event) => {
      const state = this.soundManager.getSoundState(this.id);
      if (!state?.duration) return;

      const progress = parseFloat((e.target as HTMLInputElement).value);
      const newTime = (progress / 100) * state.duration;

      // Update time display immediately
      this.updateTimeDisplay(newTime);

      // Debounce the actual seeking
      window.clearTimeout(this.debounceTimer);
      this.debounceTimer = window.setTimeout(() => {
        this.seekPosition(newTime);
      }, 16); // Approximately one frame at 60fps
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

      // Set initial visual state
      this.handleRangeInput(rangeInput);

      // Add event listener
      const handler = this.boundHandlers.rangeInput(rangeInput);
      rangeInput.addEventListener("input", handler);
      (rangeInput as any)._rangeHandler = handler;
    });

    // Initialize specific sliders with their initial values
    if (this.volumeSlider) {
      const state = this.soundManager.getSoundState(this.id);
      const initialVolume = state?.volume ?? 1;
      this.volumeSlider.value = initialVolume.toString();
      this.handleRangeInput(this.volumeSlider);
    }

    if (this.panSlider) {
      this.panSlider.value = "0"; // or get from state if you store pan value
      this.handleRangeInput(this.panSlider);
    }

    if (this.progressSlider) {
      this.progressSlider.value = "0";
      this.handleRangeInput(this.progressSlider);
    }
  }

  private initializeProgressSlider(): void {
    this.progressSlider.addEventListener("mousedown", this.boundHandlers.setDragging);
    this.progressSlider.addEventListener("input", this.boundHandlers.progressSeek);
    document.addEventListener("mouseup", this.boundHandlers.clearDragging);
  }

  private seekPosition(time: number): void {
    this.soundManager.seek(this.id, time);
  }

  private initializeEventListeners(): void {
    this.bindButtonEvents();
    this.initializeVolumeControl();
    this.initializePanControl();
    this.initializeRangeInputs();
    this.initializeProgressSlider();
    this.initializeSpatialControl();
    this.initializeSpatialSettings();
    this.initializeCollapsiblePanel();
  }

  private reset(resetOptions?: { keepVolumes?: boolean; keepPanning?: boolean }): void {
    this.resetProgress();

    // Reset volume if not keeping volumes
    if (!resetOptions?.keepVolumes) {
      const defaultVolume = this.soundManagerConfig.defaultVolume ?? 1;
      this.volumeSlider.value = defaultVolume.toString();
      this.handleRangeInput(this.volumeSlider);
      this.updateVolumeDisplay(defaultVolume);
      this.previousVolume = defaultVolume;
      this.updateMuteButtonIcon(false);
    }

    // Reset pan if not keeping panning
    if (!resetOptions?.keepPanning) {
      this.resetPan();
    }

    // Update state
    this.state = {
      ...this.state,
      isPlaying: false,
      isPaused: false,
      isMuted: false,
      currentTime: 0,
      progress: 0,
      volume: !resetOptions?.keepVolumes ? this.soundManagerConfig.defaultVolume ?? 1 : this.state.volume,
      pan: !resetOptions?.keepPanning ? 0 : this.state.pan,
    };

    // Update UI
    this.updateUIFromState();
  }

  private resetProgress(): void {
    this.progressSlider.value = "0";
    this.handleRangeInput(this.progressSlider);
    this.updateTimeDisplay(0);
  }

  private resetPan(visualOnly: boolean = false): void {
    this.panSlider.value = "0";
    this.handleRangeInput(this.panSlider);
    this.updatePanDisplay(0);

    if (this.soundManager.isPlaying(this.id) && !visualOnly) {
      this.soundManager.setPan(this.id, 0);
    }
  }

  private updateProgress(progressInfo: SoundProgressStateInfo | undefined): void {
    if (this.isDragging) {
      return;
    }

    const state = this.soundManager.getSoundState(this.id);
    if (!progressInfo?.duration) return;
    if (!state?.duration) return;

    if (state.state !== SoundState.Playing) {
      if (state.currentTime >= state.duration) {
        // Sound has ended, reset progress to 0
        this.resetProgress();
      }
      return;
    }

    const progress = Math.min((state.currentTime / state.duration) * 100, 100);
    const roundedProgress = Math.round(progress * 100) / 100;

    // Update slider and visual
    this.progressSlider.value = roundedProgress.toString();
    this.handleRangeInput(this.progressSlider);
    this.updateTimeDisplay(state.currentTime);
  }

  private handleVolumeInput = (e: Event): void => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    this.updateVolumeDisplay(value);
    this.soundManager.setSoundVolume(this.id, value);
  };

  private initializeVolumeControl(): void {
    this.volumeSlider.addEventListener("input", this.handleVolumeInput);

    // Initialize volume display
    const state = this.soundManager.getSoundState(this.id);
    if (state) {
      this.updateVolumeDisplay(state.volume);
      this.volumeSlider.value = state.volume.toString();
    }
  }

  private updateVolumeDisplay(value: number): void {
    const volumeValue = this.element.querySelector(".volume-value") as HTMLSpanElement;
    volumeValue.textContent = `${Math.round(value * 100)}%`;
  }

  private handleSoundEvent(event: SoundEvent): void {
    // Handle global events that don't need soundId checking
    if (event.type === SoundEventsEnum.RESET) {
      const handler = this.eventHandlers[event.type];
      if (handler) {
        handler(event);
      }
      return;
    }

    // Handle events for this sound or events without soundId (global events)
    if (event.soundId && event.soundId !== this.id) return;

    if (process.env.NODE_ENV === "development") {
      console.log(`Received ${event.type} event for sound ${event.soundId ? event.soundId : "global"}`);
    }

    this.updateState();
    const handler = this.eventHandlers[event.type];
    if (handler) {
      handler(event);
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

  private handlePanInput = (e: Event): void => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    this.updatePanDisplay(value);
    this.soundManager.setPan(this.id, value);
  };

  private initializePanControl(): void {
    this.panSlider.addEventListener("input", this.handlePanInput);

    // Initialize pan display
    this.updatePanDisplay(0);
  }

  private updatePanDisplay(pan: number): void {
    const panValue = this.element.querySelector(".pan-value") as HTMLSpanElement;

    if (panValue) {
      if (pan === 0) {
        panValue.textContent = "center";
      } else if (pan < 0) {
        panValue.textContent = `${Math.abs(Math.round(pan * 100))}% left`;
      } else {
        panValue.textContent = `${Math.round(pan * 100)}% right`;
      }
    }
  }

  private getCurrentOptions(newOptions: Partial<playOptions> = {}): playOptions {
    return {
      ...this.currentOptions,
      ...newOptions,
    };
  }

  private play(): void {
    try {
      const state = this.soundManager.getSoundState(this.id);
      const isPaused = state.state === SoundState.Paused;

      if (isPaused) {
        // If the sound is paused, resume it
        this.soundManager.resume(this.id);
      } else {
        // If the sound is stopped or hasn't been played yet, start from beginning
        const progress = parseFloat(this.progressSlider.value);
        const panValue = parseFloat(this.panSlider.value);

        const options = this.getCurrentOptions({
          startTime: state?.duration && progress > 0 ? (progress / 100) * state.duration : undefined,
        });

        if (panValue) {
          options.pan = panValue;
        }

        this.currentOptions = options;

        this.soundManager.play(this.id, options);
        // this.soundManager.play(this.id, <playOptions>{ startTime: 10 });

        // let sprite: any = {
        //   intro: [0, 2000],
        //   levelup: [2400, 4000],
        //   jump: [4000, 5000],
        //   fail: [5000, 7000],
        //   test: [8000, 10000],
        // };

        // this.soundManager.setDebugMode(true);

        // this.soundManager.setSoundSprite(this.id, sprite);

        // this.soundManager.playSprite(this.id, "intro", { fadeIn: 1000, pan: 0.8, playbackRate: 1.5});

        // this.soundManager.playSprite(this.id, "levelup", { fadeOut: 1000, pan: -0.8});

        // this.soundManager.playSprite(this.id, "fail", { fadeIn: 1000, volume: 0.5, pan: -0.8});

        //  this.soundManager.playSprite(this.id, "jump", { loop: true});
        // setTimeout( ()=> {
        //   this.soundManager.playSprite(this.id, "fail", { pan: 0.8});
        // }, 500);

        //this.soundManager.playSprite(this.id, "jump", { loop: true});
      }
    } catch (error) {
      console.error("Error playing sound:", error);
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
      // Unmuting - restore previous volume
      this.soundManager.setSoundVolume(this.id, this.previousVolume);
      this.soundManager.unmute(this.id);
    } else {
      // Muting - store current volume
      this.previousVolume = state.volume;
      this.soundManager.mute(this.id);
      // Update volume slider to 0
      this.volumeSlider.value = "0";
      this.handleRangeInput(this.volumeSlider);
    }
  }

  private updateMuteButtonIcon(isMuted: boolean): void {
    const muteIcon = this.element.querySelector(".mute-icon") as HTMLElement;
    const unmuteIcon = this.element.querySelector(".unmute-icon") as HTMLElement;

    if (muteIcon && unmuteIcon) {
      // Show/hide appropriate icons
      muteIcon.style.display = isMuted ? "none" : "block";
      unmuteIcon.style.display = isMuted ? "block" : "none";
    }
  }

  private fadeIn(): void {
    try {
      const state = this.soundManager.getSoundState(this.id);
      if (state.state === SoundState.Playing) {
        // If already playing, just fade in from current position
        this.soundManager.fadeIn(this.id, 2000);
      } else {
        // If not playing, start from beginning with fade
        this.soundManager.play(this.id, {
          fadeIn: 2000,
          volume: this.soundManager.getSoundVolume(this.id),
        });
      }
    } catch (error) {
      console.error("Error fading in sound:", error);
    }
  }

  private fadeOut(): void {
    try {
      this.soundManager.fadeOut(this.id, 2000);
    } catch (error) {
      console.error("Error fading out sound:", error);
    }
  }

  private initializeLoopControls(): void {
    const maxLoopsSelect = this.element.querySelector(".max-loops-select") as HTMLSelectElement;
    const loopCheckbox = this.element.querySelector(".loop-checkbox") as HTMLInputElement;
    const loopSettings = this.element.querySelector(".loop-settings") as HTMLElement;
    const maxLoopsInput = this.element.querySelector(".max-loops-input") as HTMLInputElement;

    // Initialize loop state from config or current options
    const shouldLoop = this.currentOptions.loop ?? this.soundManagerConfig.loopSounds ?? false;

    // Set initial loop state
    loopCheckbox.checked = shouldLoop;
    loopSettings.style.display = shouldLoop ? "block" : "none";

    // Update currentOptions with initial loop state
    if (shouldLoop) {
      this.currentOptions.loop = true;
      this.currentOptions.maxLoops = -1; // Default to infinite loops
    }

    // Initialize max loops state
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

    // Loop checkbox handler
    loopCheckbox.addEventListener("change", () => {
      this.currentOptions.loop = loopCheckbox.checked;
      loopSettings.style.display = loopCheckbox.checked ? "block" : "none";

      if (loopCheckbox.checked) {
        // Default to infinite when enabling loop
        this.currentOptions.maxLoops = -1;
        maxLoopsSelect.value = "-1";
        maxLoopsInput.style.display = "none";
      } else {
        delete this.currentOptions.maxLoops;
      }

      // Update sound options
      this.soundManager.updateSoundOptions(this.id, {
        loop: this.currentOptions.loop,
        maxLoops: this.currentOptions.loop ? this.currentOptions.maxLoops || -1 : 0,
      });
    });

    // Max loops select handler
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

    // Max loops input handler
    maxLoopsInput.addEventListener("change", () => {
      const value = parseInt(maxLoopsInput.value);
      if (value > 0) {
        this.currentOptions.maxLoops = value;
      }
      this.soundManager.updateSoundOptions(this.id, {
        maxLoops: this.currentOptions.maxLoops || 0,
      });
    });

    // If looping is enabled from config, update play options
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
    let isDragging = false;

    const handleMouseMove: EventListener = (e: Event): void => {
      if (!isDragging) return;
      const mouseEvent = e as MouseEvent;
      const rect = grid.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((mouseEvent.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((mouseEvent.clientY - rect.top) / rect.height) * 100));
      const normalizedZ = (y / 50 - 1) * -1;
      this.updateSpatialPosition(x, y, normalizedZ);
    };

    const handleTouchMove: EventListener = (e: Event): void => {
      if (!isDragging) return;
      const touchEvent = e as TouchEvent;
      const rect = grid.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((touchEvent.touches[0].clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((touchEvent.touches[0].clientY - rect.top) / rect.height) * 100));
      const normalizedZ = (y / 50 - 1) * -1;
      this.updateSpatialPosition(x, y, normalizedZ);
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
      const y = Math.max(0, Math.min(100, ((mouseEvent.clientY - rect.top) / rect.height) * 100));
      const normalizedZ = (y / 50 - 1) * -1;
      this.updateSpatialPosition(x, y, normalizedZ);
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
    this.updateSpatialPosition(50, 50, 0, visualOnly);
  }

  private updateSpatialPosition(x: number, y: number, z: number, visualOnly: boolean = false): void {
    const grid = this.element.querySelector(".spatial-grid") as HTMLElement;
    const circle = this.element.querySelector(".spatial-position-circle") as HTMLElement;

    if (!grid || !circle) return;

    circle.style.left = `${x}%`;
    circle.style.top = `${y}%`;

    // Update sound position
    if (!visualOnly) {
      this.soundManager.setSoundPosition(
        x / 50 - 1, // X: -1 (left) to 1 (right)
        -(y / 50 - 1), // Y: -1 (down) to 1 (up)
        z, // Z: -1 (down) to 1 (up)
        this.id
      );
    }

    // Update coordinates display
    const coordsDisplay = this.element.querySelector(".spatial-coordinates") as HTMLElement;
    if (coordsDisplay) {
      coordsDisplay.innerHTML = `<strong>Position:</strong><br/>X: ${(x / 50 - 1).toFixed(2)},<br/> Y: ${(-(
        y / 50 -
        1
      )).toFixed(2)},<br/>Z: ${z.toFixed(2)}`;
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

        // Remove button event listeners
        () => {
          const buttonHandlers = {
            "play-btn": this.play.bind(this),
            "pause-btn": this.pause.bind(this),
            "stop-btn": this.stop.bind(this),
            "mute-btn": this.toggleMute.bind(this),
            "fade-in-btn": this.fadeIn.bind(this),
            "fade-out-btn": this.fadeOut.bind(this),
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
            progress: 0,
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
    } catch (error) {
      console.error("Error during component destruction:", error);
    }
  }
}
