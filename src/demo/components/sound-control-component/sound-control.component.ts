import { PlayOptions } from "../../../sound-manager/play-sound-options.interface";
import { SoundEvent } from "../../../sound-manager/sound-event.interface";
import { SoundEventsEnum } from "../../../sound-manager/sound-events.enum";
import { SoundManager } from "../../../sound-manager/sound-manager";
import { DEFAULT_PANNER_CONFIG, SoundPannerConfig } from "../../../sound-manager/sound-panner-config";
import { SoundState } from "../../../sound-manager/sound-state.interface";
import { SoundManagerConfig } from "../../../sound-manager/sound-manager-config";
/* @ts-ignore */
import "./../../shared.css";
/* @ts-ignore */
import "./sound-control.component.css";
/* @ts-ignore */
import soundControlComponentHtml from "./sound-control.component.html?raw";
import { SpatialGrid } from "../spatial-grid-component/spatial-grid.component";
import { LocalStorageManagerManager } from "../../services/local-storage-manager";
import { svgIcon } from "../shared/icon-utils";
import { updateRangeProgress } from "../shared/range-input-utils";
import { setupCollapsiblePanel } from "../shared/collapsible-panel";
import { SpatialSettings } from "../spatial-settings-component/spatial-settings.component";

declare function gtag(...args: any[]): void;

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

// Build the icon map once, outside the class
const CONTROL_ICONS = {
  iconPlay: svgIcon("play"),
  iconPause: svgIcon("pause"),
  iconStop: svgIcon("stop"),
  iconMute: svgIcon("mute"),
  iconUnmute: svgIcon("unmute"),
  iconFadeIn: svgIcon("fade-in"),
  iconFadeOut: svgIcon("fade-out"),
  iconReset: svgIcon("reset"),
  iconClose: svgIcon("close"),
  iconMusicNote: svgIcon("music-note", 20, "music-note"),
  iconCollapse: svgIcon("collapse"),
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
  private isMasterMuted = false;
  private loopCheckbox: HTMLInputElement;
  private maxLoopsSelect: HTMLSelectElement;
  private loopSettings: HTMLElement;
  private maxLoopsInput: HTMLInputElement;
  private spatialSettings: SpatialSettings | null = null;
  private collapsibleCleanup: (() => void) | null = null;

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

    this.initializeCurrentOptions();
    this.initializeEventListeners();
    this.initializeSoundEventListeners();
    this.initializeLoopControls();
    this.spatialGrid = new SpatialGrid(this.element.querySelector(".spatial-grid-container-wrapper")!, this.soundManager, this.id, (position) => {
      this.currentOptions.panSpatialPosition = position;
    });
    this.container.appendChild(this.element);
    this.updateState();
  }

  private initializeCurrentOptions(): void {
    this.currentOptions = {
      loop: this.soundManagerConfig.loopSounds ?? this.loopCheckbox.checked,
      maxLoops: this.soundManagerConfig.maxLoops ?? parseInt(this.maxLoopsInput.value),
      volume: this.soundManagerConfig.defaultVolume ?? parseFloat(this.volumeSlider.value),
      pan: this.soundManagerConfig.defaultPan ?? parseFloat(this.panSlider.value),
      panSpatialPosition: this.soundManagerConfig.defaultPanSpatialPosition ?? { x: 0, y: 0, z: 0 },
      playbackRate: this.soundManagerConfig.defaultPlaybackRate ?? parseFloat(this.playbackRateInput.value),
      trackProgress: this.soundManagerConfig.trackProgress ?? true,
      createNewInstance: this.soundManagerConfig.createNewInstance ?? false,
      startTime: this.soundManagerConfig.defaultStartTime ?? 0,
      duration: this.soundManagerConfig.defaultDuration,
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

    if (this.currentOptions.panSpatialPosition !== undefined && this.currentOptions.panType === "spatial") {
      this.soundManager.setSpatialPosition(this.currentOptions.panSpatialPosition.x, this.currentOptions.panSpatialPosition.y, this.currentOptions.panSpatialPosition.z, this.id, this.soundManagerConfig.pannerNodeConfig, false);
    }

    if (this.currentOptions.playbackRate !== undefined) {
      this.soundManager.setPlaybackRate(this.id, this.currentOptions.playbackRate, true);
      this.playbackRateInput.value = this.currentOptions.playbackRate.toString();
    }

    if (this.currentOptions.loop !== undefined || this.currentOptions.maxLoops !== undefined) {
      this.soundManager.setLoop(
        this.id,
        this.currentOptions.loop ?? false,
        this.currentOptions.maxLoops
      );

      if (this.currentOptions.loop !== undefined) {
        this.loopCheckbox.checked = this.currentOptions.loop;
      }
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

  /** Interpolate placeholder markers with SVG icons and runtime values */
  private interpolateTemplate(tpl: string): string {
    return tpl
      .replace(/\{\{soundId\}\}/g, this.id)
      .replace(/\{\{spriteHeaderClass\}\}/g, this.isSprite ? "sprite-header" : "")
      .replace(/\{\{spriteBadge\}\}/g, this.isSprite
        ? `<div class="sprite-badge">${svgIcon("sprite")}<span>Sprite</span></div>`
        : ""
      )
      .replace(/\{\{iconPlay\}\}/g, CONTROL_ICONS.iconPlay)
      .replace(/\{\{iconPause\}\}/g, CONTROL_ICONS.iconPause)
      .replace(/\{\{iconStop\}\}/g, CONTROL_ICONS.iconStop)
      .replace(/\{\{iconMute\}\}/g, CONTROL_ICONS.iconMute)
      .replace(/\{\{iconUnmute\}\}/g, CONTROL_ICONS.iconUnmute)
      .replace(/\{\{iconFadeIn\}\}/g, CONTROL_ICONS.iconFadeIn)
      .replace(/\{\{iconFadeOut\}\}/g, CONTROL_ICONS.iconFadeOut)
      .replace(/\{\{iconReset\}\}/g, CONTROL_ICONS.iconReset)
      .replace(/\{\{iconClose\}\}/g, CONTROL_ICONS.iconClose)
      .replace(/\{\{iconMusicNote\}\}/g, CONTROL_ICONS.iconMusicNote)
      .replace(/\{\{iconCollapse\}\}/g, CONTROL_ICONS.iconCollapse);
  }

  private createControl(): HTMLElement {
    const html = this.interpolateTemplate(soundControlComponentHtml);
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    return wrapper.firstElementChild as HTMLElement;
  }

  private bindButtonEvents(): void {
    const buttonHandlers: Record<string, () => void> = {
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

    this.state = newState;
    this.updateUIFromState();
  }

  private updateUIFromState(): void {
    if (this.isUpdatingUI) return;
    this.isUpdatingUI = true;
    // Button states
    const buttons: Record<string, boolean> = {
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

    // When master is muted, force volume to 0 and show mute icon regardless of per-sound state
    const effectiveVolume = this.isMasterMuted ? 0 : this.state.volume;
    const effectiveMuted = this.isMasterMuted || this.state.isMuted;
    this.updateVolumeDisplay(effectiveVolume);
    this.updatePanDisplay(this.state.pan);
    this.updateMuteButtonIcon(effectiveMuted);
    this.updateProgress(this.state.progress);
    this.updateTimeDisplay(this.state.elapsedTime);

    // Commented out spatial grid position sync — keeping as-is
    this.isUpdatingUI = false;
  }

  private handleRangeInput(input: HTMLInputElement, value?: number): void {
    if (value !== undefined) {
      input.value = value.toString();
    }
    updateRangeProgress(input);
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

  private rangeInputHandlers: EventListener[] = [];

  private initializeRangeInputs(): void {
    const inputs = this.element.querySelectorAll('input[type="range"]');
    inputs.forEach((input: Element) => {
      const rangeInput = input as HTMLInputElement;
      this.handleRangeInput(rangeInput);
      const handler = () => this.handleRangeInput(rangeInput);
      this.rangeInputHandlers.push(handler);
      rangeInput.addEventListener("input", handler);
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
      const step = parseFloat(this.playbackRateInput.step) || 0.01;
      let newValue: number;

      if (action === 'stepUp') {
        newValue = currentValue + step;
      } else {
        newValue = currentValue - step;
      }

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
        if (repeatCount < 4) return 200;
        if (repeatCount < 8) return 100;
        if (repeatCount < 12) return 50;
        if (repeatCount < 24) return 40;
        if (repeatCount < 50) return 30;
        if (repeatCount < 100) return 25;
        return 20;
      };

      const startRepeating = () => {
        updateValue(action);
        repeatCount++;

        if (intervalId) clearInterval(intervalId);

        const intervalCallback = () => {
          updateValue(action);
          repeatCount++;
          const delay = getDelay();
          if (intervalId) clearInterval(intervalId);
          intervalId = window.setInterval(intervalCallback, delay);
          const value = parseFloat((this.playbackRateInput).value);
          this.updatePlaybackRateDisplay(value);
          this.soundManager.setPlaybackRate(this.id, value, false);
        };

        const initialDelay = getDelay();
        intervalId = window.setInterval(intervalCallback, initialDelay);
      };

      const stopRepeating = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (intervalId) clearInterval(intervalId);
        repeatCount = 0;
      };

      const startHandler = (e: Event) => {
        e.preventDefault();
        updateValue(action);
        repeatCount = 0;
        timeoutId = window.setTimeout(startRepeating, 100);
      };

      button.addEventListener('mousedown', startHandler);
      button.addEventListener('mouseup', stopRepeating);
      button.addEventListener('mouseleave', stopRepeating);
      button.addEventListener('touchstart', startHandler);
      button.addEventListener('touchend', stopRepeating);
      button.addEventListener('touchcancel', stopRepeating);
    };

    simulateSpinnerBehavior(stepUpButton, 'stepUp');
    simulateSpinnerBehavior(stepDownButton, 'stepDown');
  }

  private updateCurrentOptions(options: Partial<PlayOptions>): void {
    this.currentOptions = { ...this.currentOptions, ...options };
  }

  private handlePlaybackRateChange(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.updatePlaybackRateDisplay(value);
    this.updateCurrentOptions({ playbackRate: value });
    this.soundManager.setPlaybackRate(this.id, value);
    this.currentOptions.playbackRate = value;
    this.updateState();
  }

  private updatePlaybackRateDisplay(playbackRate: number): void {
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

    // Use SpatialSettings component instead of manual initialization
    const settingsContainer = this.element.querySelector(".spatial-settings") as HTMLElement;
    if (settingsContainer) {
      this.spatialSettings = new SpatialSettings(settingsContainer, this.soundManager, (config) => {
        this.spatialGrid.setSpatialPositionWithConfig(config);
      });
    }

    // Use shared collapsible panel
    const header = this.element.querySelector(".control-header") as HTMLElement;
    const content = this.element.querySelector(".spatial-content") as HTMLElement;
    if (header && content) {
      this.collapsibleCleanup = setupCollapsiblePanel(header, content, {
        collapsedByDefault: true,
        storageKey: `spatial-panel-${this.id}-collapsed`,
      });
    }
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
    this.currentOptions.volume = value;
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
    const volumeValueTop = this.element.querySelector(".volume-value-top") as HTMLSpanElement;
    if (volumeValueTop) {
      volumeValueTop.textContent = `${Math.round(value * 100)}%`;
    }
  }

  private handlePanInput = (e: Event): void => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    this.updatePanDisplay(value);
    this.currentOptions.pan = value;
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
    // Handle master mute/unmute — reflect in per-sound UI
    if (event.type === SoundEventsEnum.MUTE_GLOBAL) {
      this.isMasterMuted = true;
      this.updateUIFromState();
      return;
    }
    if (event.type === SoundEventsEnum.UNMUTE_GLOBAL) {
      this.isMasterMuted = false;
      this.updateUIFromState();
      return;
    }

    // Ignore other master events and events for other sounds
    if ((event.soundId && event.soundId !== this.id) ||
      event.type === SoundEventsEnum.MASTER_PAN_CHANGED ||
      event.type === SoundEventsEnum.MASTER_VOLUME_CHANGED) {
      return;
    }
    // Handle global events (those without soundId) or events specific to this sound
    switch (event.type) {
      case SoundEventsEnum.STARTED:
      case SoundEventsEnum.STOPPED:
      case SoundEventsEnum.ENDED:
      case SoundEventsEnum.PAUSED:
      case SoundEventsEnum.RESUMED:
      case SoundEventsEnum.VOLUME_CHANGED:
      case SoundEventsEnum.PROGRESS:
      case SoundEventsEnum.MUTED:
      case SoundEventsEnum.UNMUTED:
      case SoundEventsEnum.FADE_IN_COMPLETED:
        if (event.sound?.volume !== undefined) {
          this.currentOptions.volume = event.sound.volume;
        }
        break;
      case SoundEventsEnum.FADE_OUT_COMPLETED:
        break;
      case SoundEventsEnum.SEEKED:
      case SoundEventsEnum.ERROR:
        if (event.error) console.error("Sound error:", event.error);
        break;
      case SoundEventsEnum.PAN_CHANGED:
        if (!this.spatialGrid.isSamePostion(this.spatialGrid.getCurrentPosition(), { x: 50, y: 0, z: 50 })) {
          this.spatialGrid.updatePosition(50, 0, 50, true, true);
        }
        break;
      case SoundEventsEnum.SPATIAL_POSITION_CHANGED:
      case SoundEventsEnum.RESET:
      case SoundEventsEnum.LOOP_COMPLETED:
      case SoundEventsEnum.SPRITE_SET:
      case SoundEventsEnum.UPDATED_URL:
      case SoundEventsEnum.OPTIONS_UPDATED:
      case SoundEventsEnum.PLAYBACK_RATE_CHANGED:
      case SoundEventsEnum.FADE_MASTER_IN_COMPLETED:
      case SoundEventsEnum.FADE_MASTER_OUT_COMPLETED:
      case SoundEventsEnum.GLOBAL_SPATIAL_POSITION_CHANGED:
      case SoundEventsEnum.SPATIAL_POSITION_RESET:
        break;
      default:
        break;
    }
    this.updateState();
  }

  private updateTimeDisplay(currentTime: number): void {
    const timeDisplay = this.element.querySelector(".time-display");
    const state = this.soundManager.getSoundState(this.id);
    if (timeDisplay) {
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
      gtag('event', 'sound_play', { sound_id: this.id, action: 'resume', demo: 'general' });
    } else {
      this.soundManager.play(this.id, this.currentOptions);
      gtag('event', 'sound_play', { sound_id: this.id, action: 'play', demo: 'general' });
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
      this.currentOptions.volume = this.previousVolume;
    } else {
      this.previousVolume = state.volume;
      this.soundManager.mute(this.id);
      this.handleRangeInput(this.volumeSlider, 0);
      this.currentOptions.volume = 0;
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
    this.soundManager.fadeIn(this.id, this.currentOptions.fadeInDuration ?? this.soundManagerConfig.fadeInDuration ?? 1);
    this.updateState();
  }

  private fadeOut(): void {
    this.soundManager.fadeOut(this.id, this.currentOptions.fadeOutDuration ?? this.soundManagerConfig.fadeOutDuration ?? 1);
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

    if (shouldLoop && this.currentOptions.maxLoops === undefined) {
      this.updateCurrentOptions({ maxLoops: -1 });
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
      this.updateCurrentOptions({ loop: this.loopCheckbox.checked });
      this.loopSettings.style.display = this.loopCheckbox.checked ? "block" : "none";

      if (this.loopCheckbox.checked) {
        this.updateCurrentOptions({ maxLoops: -1 });
        this.maxLoopsSelect.value = "-1";
        this.maxLoopsInput.style.display = "none";
      } else {
        this.updateCurrentOptions({ maxLoops: undefined });
      }

      this.soundManager.updateSoundOptions(this.id, {
        loop: this.currentOptions.loop,
        maxLoops: this.currentOptions.loop ? this.currentOptions.maxLoops || -1 : 0,
      });
    });

    this.maxLoopsSelect.addEventListener("change", () => {
      if (this.maxLoopsSelect.value === "-1") {
        this.updateCurrentOptions({ maxLoops: -1 });
        this.maxLoopsInput.style.display = "none";
      } else {
        this.maxLoopsInput.style.display = "inline";
        this.updateCurrentOptions({ maxLoops: parseInt(this.maxLoopsInput.value) });
      }

      this.soundManager.updateSoundOptions(this.id, {
        maxLoops: this.currentOptions.maxLoops || 0,
      });
    });

    this.maxLoopsInput.addEventListener("change", () => {
      const value = parseInt(this.maxLoopsInput.value);
      if (value > 0) {
        this.updateCurrentOptions({ maxLoops: value });
      }
      this.soundManager.updateSoundOptions(this.id, {
        maxLoops: this.currentOptions.maxLoops || 0,
      });
    });
  }

  public destroy(): void {
    this.isUpdatingUI = true;
    try {
      this.soundManager.resetSound(this.id);

      if (this.isSprite) {
        this.soundManager.removeSpriteSound(this.id);
      }

      // Cleanup collapsible panel
      this.collapsibleCleanup?.();

      // Cleanup spatial settings
      this.spatialSettings?.destroy();

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
          const buttonHandlers: Record<string, () => void> = {
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

        // Remove range input listeners
        () => {
          const inputs = this.element.querySelectorAll('input[type="range"]');
          inputs.forEach((input, i) => {
            input.removeEventListener("input", this.rangeInputHandlers[i]);
          });
          this.rangeInputHandlers = [];
        },

        // Remove progress slider listeners
        () => {
          this.progressSlider?.removeEventListener("mousedown", this.boundHandlers.setDragging);
          this.progressSlider?.removeEventListener("input", this.boundHandlers.progressSeek);
          document.removeEventListener("mouseup", this.boundHandlers.clearDragging);
        },

        // Remove volume listener
        () => {
          this.volumeSlider?.removeEventListener("input", this.handleVolumeInput);
        },

        // Remove pan listener
        () => {
          this.panSlider?.removeEventListener("input", this.handlePanInput);
        },

        // Remove spatial audio listeners
        () => {
          this.listenersSpatialAudio.forEach(({ target, type, listener }) => {
            target.removeEventListener(type, listener);
          });
          this.listenersSpatialAudio = [];
        },
      ];

      cleanupTasks.forEach((task) => task());

      // Remove element from DOM
      if (this.element?.parentElement) {
        this.element.parentElement.removeChild(this.element);
      }
    } catch (error) {
      console.error("Error during destroy:", error);
    }
  }
}