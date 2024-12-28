import soundControlComponentHtml from "./sound-control.component.html?raw";
import "./sound-control.component.css";
import { SoundManager } from "../sound-manager/sound-manager";
import { SoundEventsEnum } from "../sound-manager/sound-events.enum";
import { SoundEvent } from "../sound-manager/sound-event.interface";
import { PlaySoundOptions } from "../sound-manager/play-sound-options.interface";

export class SoundControl {
  private element: HTMLElement;
  private progressSlider: HTMLInputElement;
  private progressInterval!: number;
  private userSeeking: boolean = false;
  private currentOptions: PlaySoundOptions = {};
  private panSlider: HTMLInputElement;

  constructor(
    private id: string,
    private soundManager: SoundManager,
    private container: HTMLElement
  ) {
    this.element = this.createControl();
    this.progressSlider = this.element.querySelector(".progress-slider")!;
    this.panSlider = this.element.querySelector(".pan-slider")!;
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
    this.element
      .querySelector(".play-btn")
      ?.addEventListener("click", () => this.play());
    this.element
      .querySelector(".pause-btn")
      ?.addEventListener("click", () => this.pause());
    this.element
      .querySelector(".stop-btn")
      ?.addEventListener("click", () => this.stop());
    this.element
      .querySelector(".mute-btn")
      ?.addEventListener("click", () => this.toggleMute());
    this.element
      .querySelector(".fade-in-btn")
      ?.addEventListener("click", () => this.fadeIn());
    this.element
      .querySelector(".fade-out-btn")
      ?.addEventListener("click", () => this.fadeOut());

    this.initializePanControl();

    // Progress slider events
    this.progressSlider.addEventListener("mousedown", () => {
      this.userSeeking = true;
    });

    this.progressSlider.addEventListener("input", (e) => {
      const progress = parseFloat((e.target as HTMLInputElement).value);
      this.updateProgressVisual(progress);

      const state = this.soundManager.getSoundState(this.id);
      if (state?.duration) {
        const newTime = (progress / 100) * state.duration;
        this.updateTimeDisplay(newTime);
      }
    });

    this.progressSlider.addEventListener("change", (e) => {
      const progress = parseFloat((e.target as HTMLInputElement).value);
      const state = this.soundManager.getSoundState(this.id);
      if (state?.duration) {
        const newTime = (progress / 100) * state.duration;
        console.log("Seeking to:", newTime);

        if (state.state === "playing") {
          // If playing, seek and continue playing
          this.soundManager.seekTo(this.id, newTime);
        } else {
          // If paused, seek and maintain paused state
          this.soundManager.seekTo(this.id, newTime);
          this.soundManager.pauseSound(this.id);
        }
      }
      this.userSeeking = false;
    });

    // Handle touch events for mobile
    this.progressSlider.addEventListener("touchstart", () => {
      this.userSeeking = true;
    });

    this.progressSlider.addEventListener("touchend", () => {
      this.userSeeking = false;
    });

    // Update progress regularly when playing
    this.progressInterval = window.setInterval(() => {
      if (!this.userSeeking) {
        this.updateProgress();
      }
    }, 100);

    // Loop controls
    const infiniteLoopCheckbox = this.element.querySelector(
      ".infinite-loop-checkbox"
    ) as HTMLInputElement;
    const loopCountInput = this.element.querySelector(
      ".loop-count-input"
    ) as HTMLInputElement;

    infiniteLoopCheckbox?.addEventListener("change", (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      loopCountInput.disabled = checked;
      if (checked) {
        loopCountInput.value = "0";
        this.updateLoopSettings(true);
      } else {
        this.updateLoopSettings(false, parseInt(loopCountInput.value));
      }
    });

    loopCountInput?.addEventListener("change", (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      if (!infiniteLoopCheckbox.checked && value > 0) {
        this.updateLoopSettings(false, value);
      }
    });
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

  private handleSoundEvent(event: SoundEvent): void {
    // Only handle events for this sound
    if (event.soundId !== this.id) return;

    if (process.env.NODE_ENV === "development") {
      console.log(`Received ${event.type} event for sound ${event.soundId}`);
    }

    switch (event.type) {
      case SoundEventsEnum.STARTED:
        this.updateButtonStates();
        break;
      case SoundEventsEnum.STOPPED:
        this.updateProgressVisual(0);
        this.updateTimeDisplay(0);
        this.updateButtonStates();
        break;
      case SoundEventsEnum.PAUSED:
        console.log("Handling pause event"); // Debug
        this.updateButtonStates();
        break;
      case SoundEventsEnum.RESUMED:
        this.updateButtonStates();
        break;
      case SoundEventsEnum.ENDED:
        this.updateProgressVisual(0);
        this.updateTimeDisplay(0);
        this.updateButtonStates();
        break;
      case SoundEventsEnum.ERROR:
        console.error("Sound error:", event.error);
        this.updateButtonStates();
        break;
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

  private updateProgress(): void {
    if (!this.soundManager.isPlaying(this.id)) return;

    const state = this.soundManager.getSoundState(this.id);
    if (!state) return;

    const progress = (state.currentTime / (state.duration || 1)) * 100;

    // Only update if not being dragged by user
    if (!this.userSeeking) {
      this.updateProgressVisual(progress);
      this.updateTimeDisplay(state.currentTime);
    }
  }

  private updateProgressVisual(progress: number): void {
    this.progressSlider.value = progress.toString();
    this.progressSlider.style.setProperty("--progress", `${progress}%`);
  }

  private async play(): Promise<void> {
    try {
      const progress = parseFloat(this.progressSlider.value);
      const panValue = parseFloat(this.panSlider.value);
      const infiniteLoopCheckbox = this.element.querySelector(
        ".infinite-loop-checkbox"
      ) as HTMLInputElement;
      const loopCountInput = this.element.querySelector(
        ".loop-count-input"
      ) as HTMLInputElement;

      const loopCount = parseInt(loopCountInput.value);
      const state = this.soundManager.getSoundState(this.id);

      // Simplified loop logic
      const options = this.getCurrentOptions({
        // Set loop to true if either infinite is checked OR we have a valid loop count
        loop: infiniteLoopCheckbox.checked || loopCount > 0,
        // Set loopCount only if infinite is not checked and we have a valid count
        loopCount: infiniteLoopCheckbox.checked
          ? undefined
          : loopCount > 0
          ? loopCount
          : undefined,
        startTime:
          state?.duration && progress > 0
            ? (progress / 100) * state.duration
            : undefined,
        pan: panValue,
      });

      console.log("Play options:", options); // Debug log
      this.currentOptions = options;
      await this.soundManager.playSound(this.id, options);
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
    if (state) {
      if (state.volume > 0) {
        this.soundManager.muteSoundById(this.id);
      } else {
        this.soundManager.unmuteSoundById(this.id);
      }
    }
  }

  private async fadeIn(): Promise<void> {
    try {
      await this.soundManager.playSound(this.id, { fadeIn: 2000 });
    } catch (error) {
      console.error("Error fading in sound:", error);
    }
  }

  private async fadeOut(): Promise<void> {
    try {
      await this.soundManager.fadeOut(this.id, 2000);
    } catch (error) {
      console.error("Error fading out sound:", error);
    }
  }

  private updateLoopSettings(infinite: boolean, count: number = 0): void {
    const options = this.getCurrentOptions({
      loop: infinite || count > 0,
      loopCount: infinite ? undefined : count > 0 ? count : undefined,
    });

    this.currentOptions = options;
    if (this.soundManager.isPlaying(this.id)) {
      this.soundManager.stopSound(this.id);
      this.soundManager.playSound(this.id, options);
    }
  }

  private updateButtonStates(): void {
    const state = this.soundManager.getSoundState(this.id);
    if (!state) return;

    const isPlaying = state.state === "playing";
    const isPaused = state.state === "paused";
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

    // Update mute button icons
    const muteIcon = this.element.querySelector(".mute-icon") as HTMLElement;
    const unmuteIcon = this.element.querySelector(
      ".unmute-icon"
    ) as HTMLElement;
    if (muteIcon && unmuteIcon) {
      muteIcon.style.display = isMuted ? "none" : "block";
      unmuteIcon.style.display = isMuted ? "block" : "none";
    }
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

    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    if (this.panSlider) {
      this.panSlider.removeEventListener("input", this.handlePanInput);
    }

    this.element.remove();
  }
}
