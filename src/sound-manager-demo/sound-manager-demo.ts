import { SoundManager } from "../sound-manager/sound-manager";
import "./sound-manager-demo.css";
import demoTemplate from "./sound-manager-demo.html?raw";

// Import your sound files
import sound1 from "../sounds/birds.mp3";
import sound2 from "../sounds/piano.mp3";
import sound3 from "../sounds/ringtonex.mp3";

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

  private playCurrentSound(): void {
    if (this.currentSoundId) {
      this.soundManager.playSound(this.currentSoundId);
    }
  }

  private pauseCurrentSound(): void {
    if (this.currentSoundId) {
      this.soundManager.pauseSound(this.currentSoundId);
    }
  }

  private resumeCurrentSound(): void {
    if (this.currentSoundId) {
      this.soundManager.resumeSound(this.currentSoundId);
    }
  }

  private stopCurrentSound(): void {
    if (this.currentSoundId) {
      this.soundManager.stopSound(this.currentSoundId);
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
    const hasSound = !!this.currentSoundId;
    const buttons = [
      "playBtn",
      "pauseBtn",
      "resumeBtn",
      "stopBtn",
      "muteBtn",
      "unmuteBtn",
    ];
    buttons.forEach((id) => {
      const button: HTMLButtonElement = document.getElementById(
        id
      ) as HTMLButtonElement;
      if (button) button.disabled = !hasSound;
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
        return `
                <div>
                    <strong>${id}</strong>: 
                    ${
                      state?.isPlaying
                        ? "Playing"
                        : state?.isPaused
                        ? "Paused"
                        : "Stopped"
                    }
                    (Volume: ${Math.round((state?.volume || 0) * 100)}%)
                    ${
                      state?.duration
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
    setInterval(() => this.updateStatusPanel(), 100);
  }
}
