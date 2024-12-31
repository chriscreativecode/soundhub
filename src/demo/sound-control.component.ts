import soundControlComponentHtml from "./sound-control.component.html?raw";
import "./shared.css";
import "./sound-control.component.css";
import { SoundManager } from "../sound-manager/sound-manager";
import { SoundEventsEnum } from "../sound-manager/sound-events.enum";
import { SoundEvent } from "../sound-manager/sound-event.interface";
import { PlaySoundOptions } from "../sound-manager/play-sound-options.interface";
import { SoundState } from "../sound-manager/sound-state.interface";

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

export class SoundControl {
  private element: HTMLElement;
  private progressSlider: HTMLInputElement;
  private progressInterval!: number;
  private currentOptions: PlaySoundOptions = {};
  private panSlider: HTMLInputElement;
  private volumeSlider: HTMLInputElement;
  private isDragging = false;
  private previousVolume: number = 1;

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

  constructor(private id: string, private soundManager: SoundManager, private container: HTMLElement) {
    this.element = this.createControl();
    this.progressSlider = this.element.querySelector(".progress-slider")!;
    this.panSlider = this.element.querySelector(".pan-slider")!;
    this.volumeSlider = this.element.querySelector(".volume-slider")!;
    this.initializeEventListeners();
    this.initializeSoundEventListeners();
    this.container.appendChild(this.element);
  }

  private initializeSoundEventListeners(): void {
    // Listen to all sound events
    Object.values(SoundEventsEnum).forEach((eventType) => {
      this.soundManager.addEventListener(eventType, this.handleSoundEvent.bind(this));
    });
  }

  private createControl(): HTMLElement {
    const template = soundControlComponentHtml.replace(/\${this\.id}/g, this.id);
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
    [SoundEventsEnum.STARTED]: () => this.startProgressUpdates(),
    [SoundEventsEnum.STOPPED]: () => {
      this.stopProgressUpdates();
      this.resetProgress();
    },
    [SoundEventsEnum.ENDED]: () => {
      this.stopProgressUpdates();
      this.resetProgress();
    },
    [SoundEventsEnum.PAUSED]: () => this.stopProgressUpdates(),
    [SoundEventsEnum.RESUMED]: () => this.startProgressUpdates(),
    [SoundEventsEnum.VOLUME_CHANGED]: (event) => {
      if (typeof event.volume === "number") {
        this.updateVolumeDisplay(event.volume);
        this.volumeSlider.value = event.volume.toString();
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
    [SoundEventsEnum.SEEKED]: () => {
      // Handle seek completion if needed
      this.updateProgress();
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
    progressDrag: (e: Event) => {
      const progress = parseFloat((e.target as HTMLInputElement).value);
      const state = this.soundManager.getSoundState(this.id);
      if (state?.duration) {
        this.updateTimeDisplay((progress / 100) * state.duration);
      }
    },

    progressSeek: (e: Event) => {
      const state = this.soundManager.getSoundState(this.id);
      if (!state?.duration) return;
      const progress = parseFloat((e.target as HTMLInputElement).value);
      const newTime = (progress / 100) * state.duration;
      const wasPlaying = state.state === SoundState.Playing;
      this.seekToPosition(newTime, wasPlaying);
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
    this.progressSlider.addEventListener("input", this.boundHandlers.progressDrag);
    this.progressSlider.addEventListener("change", this.boundHandlers.progressSeek);
    document.addEventListener("mouseup", this.boundHandlers.clearDragging);
  }

  private seekToPosition(time: number, resumePlayback: boolean): void {
    this.stopProgressUpdates();
    if (resumePlayback) {
      this.soundManager.pauseSound(this.id);
    }
    this.soundManager.seekTo(this.id, time);
    if (resumePlayback) {
      this.soundManager.resumeSound(this.id);
    }
  }

  private initializeEventListeners(): void {
    this.bindButtonEvents();
    this.initializeVolumeControl();
    this.initializePanControl();
    this.initializeRangeInputs();
    this.initializeProgressSlider();
  }


  private reset(resetOptions?: { keepVolumes?: boolean; keepPanning?: boolean }): void {

    this.stopProgressUpdates();

    this.resetProgress();
  
    // Reset volume if not keeping volumes
    if (!resetOptions?.keepVolumes) {
      const defaultVolume = this.soundManager.getConfig().defaultVolume ?? 1;
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
      volume: !resetOptions?.keepVolumes ? (this.soundManager.getConfig().defaultVolume ?? 1) : this.state.volume,
      pan: !resetOptions?.keepPanning ? 0 : this.state.pan,
    };
  
    // Update UI
    this.updateUIFromState();
  }

  private startProgressUpdates(): void {
    // Clear any existing interval
    if (this.progressInterval) {
      window.clearInterval(this.progressInterval);
    }

    // Update progress every 100ms
    this.progressInterval = window.setInterval(() => {
      if (!this.isDragging) {
        this.updateProgress();
      }
    }, 100);
  }

  private resetProgress(): void {
    this.progressSlider.value = "0";
    this.handleRangeInput(this.progressSlider);
    this.updateTimeDisplay(0);
  }

  private resetPan(): void {
    this.panSlider.value = "0"; 
    this.handleRangeInput(this.panSlider);
    this.updatePanDisplay(0);
    
    if (this.soundManager.isPlaying(this.id)) {
      this.soundManager.setPan(this.id, 0);
    }
  }

  private updateProgress(): void {
    const state = this.soundManager.getSoundState(this.id);
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
    this.soundManager.setVolumeById(this.id, value);
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
  
    // Handle sound-specific events
    if (event.soundId !== this.id) return;
  
    if (process.env.NODE_ENV === "development") {
      console.log(`Received ${event.type} event for sound ${event.soundId}`);
    }
  
    this.updateState();
    const handler = this.eventHandlers[event.type];
    if (handler) {
      handler(event);
    }
  }

  private stopProgressUpdates(): void {
    if (this.progressInterval) {
      window.clearInterval(this.progressInterval);
      this.progressInterval = 0;
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
    if (this.soundManager.isPlaying(this.id)) {
      this.soundManager.setPan(this.id, value);
    }
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

  private getCurrentOptions(newOptions: Partial<PlaySoundOptions> = {}): PlaySoundOptions {
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
        this.soundManager.resumeSound(this.id);
      } else {
        // If the sound is stopped or hasn't been played yet, start from beginning
        const progress = parseFloat(this.progressSlider.value);
        const panValue = parseFloat(this.panSlider.value);

        const options = this.getCurrentOptions({
          startTime: state?.duration && progress > 0 ? (progress / 100) * state.duration : undefined,
          pan: panValue,
        });

        this.currentOptions = options;
        this.soundManager.playSound(this.id, options);
      }
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  }

  private pause(): void {
    this.soundManager.pauseSound(this.id);
  }

  private stop(): void {
    this.soundManager.stopSound(this.id);
  }

  private toggleMute(): void {
    const state = this.soundManager.getSoundState(this.id);
    if (!state) return;

    if (state.volume === 0) {
      // Unmuting - restore previous volume
      this.soundManager.setVolumeById(this.id, this.previousVolume);
      this.soundManager.unmuteSoundById(this.id);
    } else {
      // Muting - store current volume
      this.previousVolume = state.volume;
      this.soundManager.muteSoundById(this.id);
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
        this.soundManager.playSound(this.id, {
          fadeIn: 2000,
          volume: this.soundManager.getVolumeById(this.id),
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

  public destroy(): void {
    try {
      const cleanupTasks: (() => void)[] = [
        // Clear intervals
        () => {
          if (this.progressInterval) {
            window.clearInterval(this.progressInterval);
            this.progressInterval = 0;
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
            this.progressSlider.removeEventListener("input", this.boundHandlers.progressDrag);
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

        // Stop sound if playing
        () => {
          if (this.state.isPlaying) {
            this.soundManager.stopSound(this.id);
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
