import { SoundManager } from "../sound-manager/sound-manager";
import { SoundControl } from "./sound-control.component";
import "./demo.css";
import demoTemplate from "./demo.html?raw";

// Import your sound files
import sound1 from "../sounds/birds.mp3";
import sound2 from "../sounds/piano.mp3";
import sound3 from "../sounds/ringtonex.mp3";
import bounce from "../sounds/pong-bounce.mp3";

export class SoundManagerDemo {
  private soundManager: SoundManager;
  private soundControls: Map<string, SoundControl> = new Map();
  private containerElement: HTMLElement;
  private loadingState: boolean = false;

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
    this.soundManager = new SoundManager({ spatialAudio: true, debug: false });
    this.initialize();
  }

  private initialize(): void {
    try {
      this.render();
      // Wait for next frame to ensure DOM is updated
      requestAnimationFrame(() => {
        this.initializeEventListeners();
        this.initializeGlobalControls();
      });
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
    const preloadBtn = document.querySelector('.preload-btn') as HTMLButtonElement;
    const masterVolumeInput = document.getElementById("masterVolume");

    if (preloadBtn) {
      preloadBtn.addEventListener("click", () => this.loadDemoSounds());
    }

    if (masterVolumeInput) {
      masterVolumeInput.addEventListener("input", (e) => {
        const volume = parseFloat((e.target as HTMLInputElement).value);
        this.setGlobalVolume(volume);
      });
    }
  }

  private initializeGlobalControls(): void {
    const controls = {
      pauseAllBtn: () => this.soundManager.pauseAllSounds(),
      resumeAllBtn: () => this.soundManager.resumeAllSounds(),
      stopAllBtn: () => this.soundManager.stopAllSounds(),
      toggleMuteBtn: () => this.soundManager.toggleMute(),
    };

    Object.entries(controls).forEach(([id, handler]) => {
      const button = document.getElementById(id);
      if (button) {
        button.addEventListener("click", handler);
      }
    });
  }

  private async loadDemoSounds(): Promise<void> {
    const preloadBtn = document.querySelector('.preload-btn') as HTMLButtonElement;
    if (!preloadBtn || this.loadingState) return;

    try {
      // Set loading state
      this.loadingState = true;
      this.updateLoadingState(true);

      await this.soundManager.preloadSounds([
        { id: "birds", url: sound1 },
        { id: "piano", url: sound2 },
        { id: "ringtone", url: sound3 },
        { id: "bounce", url: bounce },
      ]);

      this.createSoundControls();
    } catch (error) {
      console.error("Error loading sounds:", error);
    } finally {
      // Reset loading state
      this.loadingState = false;
      this.updateLoadingState(false);
    }
  }

  private updateLoadingState(loading: boolean): void {
    const preloadBtn = document.querySelector('.preload-btn') as HTMLButtonElement;
    if (!preloadBtn) return;

    preloadBtn.disabled = loading;
    if (loading) {
      preloadBtn.classList.add('loading');
    } else {
      preloadBtn.classList.remove('loading');
    }
  }

  private createSoundControls(): void {
    // Clear existing controls
    this.soundControls.clear();
    const container = document.getElementById("soundControlsContainer")!;
    container.innerHTML = "";

    // Create new controls for each sound
    this.soundManager.getSoundIds().forEach((id) => {
      const control = new SoundControl(id, this.soundManager, container);
      this.soundControls.set(id, control);
    });
  }

  private setGlobalVolume(volume: number): void {
    this.soundManager.setGlobalVolume(volume);
    document.getElementById("masterVolumeValue")!.textContent = 
      `${Math.round(volume * 100)}%`;
  }
}