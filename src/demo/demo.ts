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
    this.soundManager = new SoundManager();
    this.initialize();
  }

  private initialize(): void {
    try {
      this.render();
      this.initializeEventListeners();
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
    console.log("pauze sound", this.currentSoundId);
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

    const playBtn = document.getElementById("playBtn") as HTMLButtonElement;
    const pauseBtn = document.getElementById("pauseBtn") as HTMLButtonElement;
    const resumeBtn = document.getElementById("resumeBtn") as HTMLButtonElement;
    const stopBtn = document.getElementById("stopBtn") as HTMLButtonElement;
    const muteBtn = document.getElementById("muteBtn") as HTMLButtonElement;
    const unmuteBtn = document.getElementById("unmuteBtn") as HTMLButtonElement;

    const isPlaying = state.state === SoundState.Playing;
    const isPaused = state.state === SoundState.Paused;
    const isStopped = state.state === SoundState.Stopped;

    if (playBtn) playBtn.disabled = isPlaying;
    if (pauseBtn) pauseBtn.disabled = !isPlaying;
    if (resumeBtn) resumeBtn.disabled = !isPaused;
    if (stopBtn) stopBtn.disabled = isStopped;
    if (muteBtn) muteBtn.disabled = false;
    if (unmuteBtn) unmuteBtn.disabled = false;

    console.debug("Sound state update:", {
      id: this.currentSoundId,
      state: state.state,
      isPlaying,
      isPaused,
      isStopped,
      buttons: {
        play: playBtn?.disabled,
        pause: pauseBtn?.disabled,
        resume: resumeBtn?.disabled,
        stop: stopBtn?.disabled,
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

        return `
                <div>
                    <strong>${id}</strong>: 
                    ${
                      state.state
                    } <!-- Use the SoundState enum value directly -->
                    (Volume: ${Math.round(state.volume * 100)}%)
                    ${
                      state.duration
                        ? `Duration: ${state.duration.toFixed(2)}s`
                        : ""
                    }
                </div>
            `;
      })
      .join("");

    statusPanel.innerHTML = statusHtml;
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
