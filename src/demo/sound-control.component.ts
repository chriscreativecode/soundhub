import soundControlComponentHtml from "./sound-control.component.html?raw";
import "./sound-control.component.css";
import { SoundManager } from "../sound-manager/sound-manager";
import { SoundEventsEnum } from "../sound-manager/sound-events.enum";
import { SoundEvent } from "../sound-manager/sound-event.interface";
import { PlaySoundOptions } from "../sound-manager/play-sound-options.interface";
import { SoundState } from "../sound-manager/sound-state.interface";

export class SoundControl {
  private element: HTMLElement;
  private progressSlider: HTMLInputElement;
  private progressInterval!: number;
  private currentOptions: PlaySoundOptions = {};
  private panSlider: HTMLInputElement;
  private volumeSlider: HTMLInputElement;
  private isDragging = false;

  constructor(
    private id: string,
    private soundManager: SoundManager,
    private container: HTMLElement
  ) {
    this.element = this.createControl();
    this.progressSlider = this.element.querySelector(".progress-slider")!;
    this.panSlider = this.element.querySelector(".pan-slider")!;
    this.volumeSlider = this.element.querySelector(".volume-slider")!;
    this.initializeEventListeners();
    this.initializeSoundEventListeners();
    this.container.appendChild(this.element);
  }

  private createControl(): HTMLElement {
    const template = soundControlComponentHtml.replace(
      /\${this\.id}/g,
      this.id
    );
    const wrapper = document.createElement("div");
    wrapper.innerHTML = template;
    return wrapper.firstElementChild as HTMLElement;
  }

  private initializeEventListeners(): void {
    // Button controls
    const playBtn = this.element.querySelector(".play-btn");
    const pauseBtn = this.element.querySelector(".pause-btn");
    const stopBtn = this.element.querySelector(".stop-btn");
    const muteBtn = this.element.querySelector(".mute-btn");
    const fadeInBtn = this.element.querySelector(".fade-in-btn");
    const fadeOutBtn = this.element.querySelector(".fade-out-btn");

    playBtn?.addEventListener("click", () => this.play());
    pauseBtn?.addEventListener("click", () => this.pause());
    stopBtn?.addEventListener("click", () => this.stop());
    muteBtn?.addEventListener("click", () => this.toggleMute());
    fadeInBtn?.addEventListener("click", () => this.fadeIn());
    fadeOutBtn?.addEventListener("click", () => this.fadeOut());

    this.initializeVolumeControl();
    this.initializePanControl();

    // Progress slider events
    this.progressSlider.addEventListener("mousedown", () => {
      this.isDragging = true;
    });

    document.addEventListener("mouseup", () => {
      this.isDragging = false;
    });

    // Update while dragging
    this.progressSlider.addEventListener("input", (e) => {
      const progress = parseFloat((e.target as HTMLInputElement).value);
      const state = this.soundManager.getSoundState(this.id);

      // Update visual immediately during dragging
      this.updateProgressVisual(progress);

      if (state?.duration) {
        const newTime = (progress / 100) * state.duration;
        this.updateTimeDisplay(newTime);
      }
    });

    // Seek when drag ends
    this.progressSlider.addEventListener("change", (e) => {
      const progress = parseFloat((e.target as HTMLInputElement).value);
      const state = this.soundManager.getSoundState(this.id);

      if (state?.duration) {
        const newTime = (progress / 100) * state.duration;
        const wasPlaying = state.state === SoundState.Playing;

        // Stop updates while seeking
        this.stopProgressUpdates();

        // Pause if playing
        if (wasPlaying) {
          this.soundManager.pauseSound(this.id);
        }

        // Seek to new position
        this.soundManager.seekTo(this.id, newTime);

        // Resume if it was playing
        if (wasPlaying) {
          this.soundManager.resumeSound(this.id);
        }
      }
    });
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

  private updateProgress(): void {
    const state = this.soundManager.getSoundState(this.id);
    if (!state?.duration) return;

    // Only update if the sound is playing
    if (state.state !== SoundState.Playing) return;

    // Use currentTime from state
    const currentTime = state.currentTime;

    // Calculate progress with Math.min to ensure it doesn't exceed 100
    const progress = Math.min((currentTime / state.duration) * 100, 100);

    // Round to 2 decimal places to avoid floating point issues
    const roundedProgress = Math.round(progress * 100) / 100;

    this.updateProgressVisual(roundedProgress);
    this.updateTimeDisplay(currentTime);
  }

  private initializeSoundEventListeners(): void {
    // Listen to all sound events
    Object.values(SoundEventsEnum).forEach((eventType) => {
      this.soundManager.addEventListener(
        eventType,
        this.handleSoundEvent.bind(this)
      );
    });
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
    const volumeValue = this.element.querySelector(
      ".volume-value"
    ) as HTMLSpanElement;
    volumeValue.textContent = `${Math.round(value * 100)}%`;
  }

  private handleSoundEvent(event: SoundEvent): void {
    // Only handle events for this sound
    if (event.soundId !== this.id) return;

    if (process.env.NODE_ENV === "development") {
      console.log(`Received ${event.type} event for sound ${event.soundId}`);
    }

    switch (event.type) {
      case SoundEventsEnum.STARTED:
        this.startProgressUpdates();
        this.updateButtonStates();
        break;
      case SoundEventsEnum.STOPPED:
      case SoundEventsEnum.ENDED:
        this.stopProgressUpdates();
        this.updateButtonStates();
        this.updateProgressVisual(0);
        this.updateTimeDisplay(0);
        break;

      case SoundEventsEnum.PAUSED:
        this.stopProgressUpdates();
        this.updateButtonStates();
        break;
      case SoundEventsEnum.RESUMED:
        this.startProgressUpdates();
        this.updateButtonStates();
        break;

      case SoundEventsEnum.VOLUME_CHANGED:
        if (typeof event.volume === "number") {
          this.updateVolumeDisplay(event.volume);
          this.volumeSlider.value = event.volume.toString();
        }
        break;
      case SoundEventsEnum.ERROR:
        console.error("Sound error:", event.error);
        this.updateButtonStates();
        break;
      case SoundEventsEnum.MUTED:
        this.updateMuteButtonIcon(true);
        break;
      case SoundEventsEnum.UNMUTED:
        this.updateMuteButtonIcon(false);
        break;
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
      timeDisplay.textContent = `${this.formatTime(
        currentTime
      )} / ${this.formatTime(state.duration)}`;
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

  private updatePanDisplay(value: number): void {
    const panValue = this.element.querySelector(
      ".pan-value"
    ) as HTMLSpanElement;
    panValue.textContent = value.toFixed(1);
  }

  private getCurrentOptions(newOptions: any = {}): any {
    // Merge current options with new options
    return {
      ...this.currentOptions,
      ...newOptions,
    };
  }

  private updateProgressVisual(progress: number): void {
    this.progressSlider.value = progress.toString();
    this.progressSlider.style.setProperty("--progress", `${progress}%`);
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
          startTime:
            state?.duration && progress > 0
              ? (progress / 100) * state.duration
              : undefined,
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
      this.soundManager.unmuteSoundById(this.id);
    } else {
      this.soundManager.muteSoundById(this.id);
    }
  }

  private updateMuteButtonIcon(isMuted: boolean): void {
    const muteIcon = this.element.querySelector(".mute-icon") as HTMLElement;
    const unmuteIcon = this.element.querySelector(
      ".unmute-icon"
    ) as HTMLElement;

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

  private updateButtonStates(): void {
    const state = this.soundManager.getSoundState(this.id);
    if (!state) return;

    const isPlaying = state.state === SoundState.Playing;
    const isPaused = state.state === SoundState.Paused;
    const isMuted = state.volume === 0;

    // Only log in development
    if (process.env.NODE_ENV === "development") {
      console.log("Button states:", {
        state: state.state,
        isPlaying,
        isPaused,
        isMuted,
      });
    }

    // Play button should be enabled when sound is paused or stopped
    this.element
      .querySelector(".play-btn")!
      .toggleAttribute("disabled", isPlaying);

    // Pause button should only be enabled when sound is playing
    this.element
      .querySelector(".pause-btn")!
      .toggleAttribute("disabled", !isPlaying);

    // Stop button should be enabled when sound is either playing or paused
    this.element
      .querySelector(".stop-btn")!
      .toggleAttribute("disabled", !isPlaying && !isPaused);
  }

  public destroy(): void {
    // Remove event listeners
    Object.values(SoundEventsEnum).forEach((eventType) => {
      this.soundManager.removeEventListener(eventType, this.handleSoundEvent);
    });

    // Clear interval
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    // Remove DOM event listeners
    this.element
      .querySelector(".play-btn")
      ?.removeEventListener("click", this.play);
    this.element
      .querySelector(".pause-btn")
      ?.removeEventListener("click", this.pause);

    if (this.volumeSlider) {
      this.volumeSlider.removeEventListener("input", this.handleVolumeInput);
    }

    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    if (this.panSlider) {
      this.panSlider.removeEventListener("input", this.handlePanInput);
    }
    if (this.progressInterval) {
      window.clearInterval(this.progressInterval);
    }

    this.element.remove();
  }
}
