import { SoundManager } from "../sound-manager/sound-manager";
import "./demo.css";
import demoTemplate from "./demo.html?raw";

// Import your sound files
import sound1 from "../sounds/birds.mp3";
import sound2 from "../sounds/piano.mp3";
import sound3 from "../sounds/ringtonex.mp3";
import { SoundState } from "../sound-manager/sound-state.interface";

export class SoundManagerDemo {
  private soundManager: SoundManager;
  private currentSoundId: string | null = null;
  private containerElement: HTMLElement;

  constructor(container: HTMLElement) {
    if (!container) {
      throw new Error("Container element is required for SoundManagerDemo");
    }

    if (!(container instanceof HTMLElement)) {
      throw new Error("Container must be an HTMLElement");
    }

    if (!container.parentElement) {
      throw new Error("Container must be attached to the DOM");
    }
    this.containerElement = container;
    this.soundManager = new SoundManager({ spatialAudio: true, debug: true });
    this.initialize();
  }

  private initialize(): void {
    try {
      this.render();
      this.initializeEventListeners();
      this.initializeEffectControls();
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
    // Load Sounds
    document
      .getElementById("loadSoundsBtn")
      ?.addEventListener("click", () => this.loadDemoSounds());

    // Sound Selection
    const soundSelect = document.getElementById(
      "soundSelect"
    ) as HTMLSelectElement;
    soundSelect?.addEventListener("change", (e) => {
      this.currentSoundId = (e.target as HTMLSelectElement).value;
      this.updateControlStates();
    });

    // Individual Sound Controls
    document
      .getElementById("playBtn")
      ?.addEventListener("click", () => this.playCurrentSound());
    document
      .getElementById("pauseBtn")
      ?.addEventListener("click", () => this.pauseCurrentSound());
    document
      .getElementById("resumeBtn")
      ?.addEventListener("click", () => this.resumeCurrentSound());
    document
      .getElementById("stopBtn")
      ?.addEventListener("click", () => this.stopCurrentSound());
    document
      .getElementById("muteBtn")
      ?.addEventListener("click", () => this.muteCurrentSound());
    document
      .getElementById("unmuteBtn")
      ?.addEventListener("click", () => this.unmuteCurrentSound());

    // Volume Controls
    document.getElementById("soundVolume")?.addEventListener("input", (e) => {
      const volume = parseFloat((e.target as HTMLInputElement).value);
      this.setCurrentSoundVolume(volume);
    });

    // Global Controls
    document
      .getElementById("pauseAllBtn")
      ?.addEventListener("click", () => this.soundManager.pauseAllSounds());
    document
      .getElementById("resumeAllBtn")
      ?.addEventListener("click", () => this.soundManager.resumeAllSounds());
    document
      .getElementById("stopAllBtn")
      ?.addEventListener("click", () => this.soundManager.stopAllSounds());
    document
      .getElementById("toggleMuteBtn")
      ?.addEventListener("click", () => this.soundManager.toggleMute());
    document.getElementById("masterVolume")?.addEventListener("input", (e) => {
      const volume = parseFloat((e.target as HTMLInputElement).value);
      this.setGlobalVolume(volume);
    });

    // Start status updates
    this.startStatusUpdates();
  }

  private async loadDemoSounds(): Promise<void> {
    try {
      await this.soundManager.preloadSounds([
        { id: "birds", url: sound1 },
        { id: "piano", url: sound2 },
        { id: "ringtone", url: sound3 },
      ]);

      this.updateSoundSelector();
      this.updateStatusPanel();
    } catch (error) {
      console.error("Error loading sounds:", error);
    }
  }

  private updateSoundSelector(): void {
    const selector = document.getElementById(
      "soundSelect"
    ) as HTMLSelectElement;
    selector.innerHTML = '<option value="">Select a sound...</option>';

    this.soundManager.getSoundIds().forEach((id) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = id;
      selector.appendChild(option);
    });
  }

  private pauseCurrentSound(): void {
    if (this.currentSoundId) {
      try {
        this.soundManager.pauseSound(this.currentSoundId);
        console.debug(`Paused sound: ${this.currentSoundId}`);

        // Check state immediately after pause
        const stateAfterPause = this.soundManager.getSoundState(
          this.currentSoundId
        );
        console.debug("State immediately after pause:", stateAfterPause);

        // Force immediate update
        this.updateControlStates();
      } catch (error) {
        console.error(`Error pausing sound: ${this.currentSoundId}`, error);
      }
    }
  }

  private resumeCurrentSound(): void {
    if (this.currentSoundId) {
      try {
        this.soundManager.resumeSound(this.currentSoundId);
        console.debug(`Resumed sound: ${this.currentSoundId}`);
        // Force immediate update
        requestAnimationFrame(() => this.updateControlStates());
      } catch (error) {
        console.error(`Error resuming sound: ${this.currentSoundId}`, error);
      }
    }
  }

  private async playCurrentSound(): Promise<void> {
    if (this.currentSoundId) {
      try {
        await this.soundManager.playSound(this.currentSoundId);
        console.debug(`Playing sound: ${this.currentSoundId}`);
        this.updateControlStates();
      } catch (error) {
        console.error(`Error playing sound: ${this.currentSoundId}`, error);
      }
    }
  }

  private stopCurrentSound(): void {
    if (this.currentSoundId) {
      try {
        this.soundManager.stopSound(this.currentSoundId);
        console.debug(`Stopped sound: ${this.currentSoundId}`);
        this.updateControlStates();
      } catch (error) {
        console.error(`Error stopping sound: ${this.currentSoundId}`, error);
      }
    }
  }
  private muteCurrentSound(): void {
    if (this.currentSoundId) {
      this.soundManager.muteSoundById(this.currentSoundId);
    }
  }

  private unmuteCurrentSound(): void {
    if (this.currentSoundId) {
      this.soundManager.unmuteSoundById(this.currentSoundId);
    }
  }

  private setCurrentSoundVolume(volume: number): void {
    if (this.currentSoundId) {
      this.soundManager.setVolumeById(this.currentSoundId, volume);
      document.getElementById("soundVolumeValue")!.textContent = `${Math.round(
        volume * 100
      )}%`;
    }
  }

  private setGlobalVolume(volume: number): void {
    this.soundManager.setGlobalVolume(volume);
    document.getElementById("masterVolumeValue")!.textContent = `${Math.round(
      volume * 100
    )}%`;
  }

  private updateControlStates(): void {
    if (!this.currentSoundId) {
      this.disableAllControls();
      return;
    }

    const state = this.soundManager.getSoundState(this.currentSoundId);
    if (!state) return;

    console.debug("Current sound state:", {
      id: this.currentSoundId,
      rawState: state,
      timestamp: new Date().toISOString(),
    });

    // Get all button elements
    const playBtn = document.getElementById("playBtn") as HTMLButtonElement;
    const pauseBtn = document.getElementById("pauseBtn") as HTMLButtonElement;
    const resumeBtn = document.getElementById("resumeBtn") as HTMLButtonElement;
    const stopBtn = document.getElementById("stopBtn") as HTMLButtonElement;
    const muteBtn = document.getElementById("muteBtn") as HTMLButtonElement;
    const unmuteBtn = document.getElementById("unmuteBtn") as HTMLButtonElement;
    const fadeInBtn = document.getElementById("fadeInBtn") as HTMLButtonElement;
    const spatialControls = document.querySelectorAll(
      ".spatial-controls input"
    );
    const resetPositionBtn = document.getElementById(
      "resetPositionBtn"
    ) as HTMLButtonElement;
    const masterFadeInBtn = document.getElementById(
      "masterFadeInBtn"
    ) as HTMLButtonElement;
    const masterFadeOutBtn = document.getElementById(
      "masterFadeOutBtn"
    ) as HTMLButtonElement;

    const isPlaying = state.state === SoundState.Playing;
    const isPaused = state.state === SoundState.Paused;
    const isStopped = state.state === SoundState.Stopped;
    const isMuted = this.soundManager.getGlobalVolume() === 0;

    // Update individual sound controls
    if (playBtn) playBtn.disabled = isPlaying;
    if (pauseBtn) pauseBtn.disabled = !isPlaying;
    if (resumeBtn) resumeBtn.disabled = !isPaused;
    if (stopBtn) stopBtn.disabled = isStopped;
    if (muteBtn) muteBtn.disabled = false;
    if (unmuteBtn) unmuteBtn.disabled = false;
    if (fadeInBtn) {
      fadeInBtn.disabled =
        !this.currentSoundId || state?.state === SoundState.Playing;
    }
    if (resetPositionBtn) {
      resetPositionBtn.disabled =
        !this.currentSoundId || !this.soundManager.isSpatialAudioEnabled();
    }

    // Update master fade controls
    if (masterFadeInBtn) {
      // Only disable if no sound is selected
      masterFadeInBtn.disabled = !this.currentSoundId;
    }
    if (masterFadeOutBtn) {
      // Only disable if no sound is selected
      masterFadeOutBtn.disabled = !this.currentSoundId;
    }

    // Update spatial controls
    spatialControls.forEach((control) => {
      (control as HTMLInputElement).disabled =
        !this.currentSoundId || !this.soundManager.isSpatialAudioEnabled();
    });

    console.debug("Sound state update:", {
      id: this.currentSoundId,
      state: state.state,
      isPlaying,
      isPaused,
      isStopped,
      isMuted,
      buttons: {
        play: playBtn?.disabled,
        pause: pauseBtn?.disabled,
        resume: resumeBtn?.disabled,
        stop: stopBtn?.disabled,
        masterFadeIn: masterFadeInBtn?.disabled,
        masterFadeOut: masterFadeOutBtn?.disabled,
      },
    });
  }

  private disableAllControls(): void {
    [
      "playBtn",
      "pauseBtn",
      "resumeBtn",
      "stopBtn",
      "muteBtn",
      "unmuteBtn",
      "fadeInBtn",
      "masterFadeInBtn",
      "masterFadeOutBtn",
    ].forEach((id) => {
      const button = document.getElementById(id) as HTMLButtonElement;
      if (button) button.disabled = true;
    });
  }

  private updateStatusPanel(): void {
    const statusPanel = document.getElementById("soundStatus");
    if (!statusPanel) return;

    const soundIds = this.soundManager.getSoundIds();
    if (soundIds.length === 0) {
      statusPanel.textContent = "No sounds loaded";
      return;
    }

    const statusHtml = soundIds
      .map((id) => {
        const state = this.soundManager.getSoundState(id);
        if (!state) return "";

        // Format time as mm:ss
        const formatTime = (time: number): string => {
          const minutes = Math.floor(time / 60);
          const seconds = Math.floor(time % 60);
          return `${minutes}:${seconds.toString().padStart(2, "0")}`;
        };

        const currentTime = formatTime(state.currentTime);
        const duration = state.duration ? formatTime(state.duration) : "0:00";

        return `
        <div>
            <strong>${id}</strong>: 
            ${state.state}
            (Volume: ${Math.round(state.volume * 100)}%)
            ${state.duration ? `Duration: ${duration}` : ""}
            ${
              state.state === SoundState.Playing ||
              state.state === SoundState.Paused
                ? `Position: ${currentTime} / ${duration}`
                : ""
            }
        </div>
    `;
      })
      .join("");

    statusPanel.innerHTML = statusHtml;
  }

  private updateSoundPosition(): void {
    if (!this.currentSoundId) return;

    const x = parseFloat(
      (document.getElementById("positionX") as HTMLInputElement).value
    );
    const y = parseFloat(
      (document.getElementById("positionY") as HTMLInputElement).value
    );
    const z = parseFloat(
      (document.getElementById("positionZ") as HTMLInputElement).value
    );

    try {
      this.soundManager.setSoundPosition(this.currentSoundId, x, y, z);
    } catch (error) {
      console.error("Error updating sound position:", error);
    }
  }

  private initializeEffectControls(): void {
    // Existing fade controls
    const fadeInBtn = document.getElementById("fadeInBtn");
    fadeInBtn?.addEventListener("click", () => this.handleFadeIn());

    // Reset position button
    const resetPositionBtn = document.getElementById("resetPositionBtn");
    resetPositionBtn?.addEventListener("click", () =>
      this.resetSoundPosition()
    );

    const masterFadeInBtn = document.getElementById("masterFadeInBtn");
    const masterFadeOutBtn = document.getElementById("masterFadeOutBtn");

    masterFadeInBtn?.addEventListener("click", () => this.handleMasterFadeIn());
    masterFadeOutBtn?.addEventListener("click", () =>
      this.handleMasterFadeOut()
    );

    // Existing spatial audio controls
    ["X", "Y", "Z"].forEach((axis) => {
      const slider = document.getElementById(
        `position${axis}`
      ) as HTMLInputElement;
      const valueDisplay = document.getElementById(`position${axis}Value`);

      slider?.addEventListener("input", (e) => {
        const value = (e.target as HTMLInputElement).value;
        if (valueDisplay) valueDisplay.textContent = value;
        this.updateSoundPosition();
      });
    });
  }

  private async handleFadeIn(): Promise<void> {
    if (!this.currentSoundId) return;

    const durationInput = document.getElementById(
      "fadeInDuration"
    ) as HTMLInputElement;
    const duration = parseFloat(durationInput.value) * 1000 || 2000; // Convert to milliseconds

    try {
      await this.soundManager.playSound(this.currentSoundId, {
        fadeIn: duration,
        volume: 1, // Ensure we have a target volume
      });
      this.updateControlStates();
    } catch (error) {
      console.error("Error during fade in:", error);
    }
  }

  private async handleMasterFadeIn(): Promise<void> {
    const durationInput = document.getElementById(
      "masterFadeDuration"
    ) as HTMLInputElement;
    const duration = parseFloat(durationInput.value) * 1000 || 2000; // Convert to milliseconds

    try {
      await this.soundManager.fadeMasterIn(duration);
      this.updateControlStates();
    } catch (error) {
      console.error("Error during master fade in:", error);
    }
  }

  private async handleMasterFadeOut(): Promise<void> {
    const durationInput = document.getElementById(
      "masterFadeDuration"
    ) as HTMLInputElement;
    const duration = parseFloat(durationInput.value) * 1000 || 2000; // Convert to milliseconds

    try {
      await this.soundManager.fadeMasterOut(duration);
      this.updateControlStates();
    } catch (error) {
      console.error("Error during master fade out:", error);
    }
  }

  private resetSoundPosition(): void {
    if (!this.currentSoundId) return;

    try {
      // Reset position to center (0,0,0)
      this.soundManager.setSoundPosition(this.currentSoundId, 0, 0, 0);

      // Reset slider values and displays
      ["X", "Y", "Z"].forEach((axis) => {
        const slider = document.getElementById(
          `position${axis}`
        ) as HTMLInputElement;
        const valueDisplay = document.getElementById(`position${axis}Value`);
        if (slider) slider.value = "0";
        if (valueDisplay) valueDisplay.textContent = "0";
      });
    } catch (error) {
      console.error("Error resetting sound position:", error);
    }
  }

  private startStatusUpdates(): void {
    setInterval(() => {
      if (this.currentSoundId) {
        const state = this.soundManager.getSoundState(this.currentSoundId);
        if (state?.state === SoundState.Playing) {
          this.updateStatusPanel();
          this.updateControlStates();
        }
      }
    }, 500);
  }
}
