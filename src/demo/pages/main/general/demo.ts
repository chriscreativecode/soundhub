import "../../../shared.css";
import "./demo.css";

// @ts-ignore
import { SoundManagerConfig } from "../../../../sound-manager/sound-manager-config";
import { AudioControllerComponent } from "../../../components/audio-controller-component/audio-controller.component";
import { MasterControl } from "../../../components/master-control-component/master-control.component";
import { SoundControl } from "../../../components/sound-control-component/sound-control.component";
import { SoundLoaderComponent } from "../../../components/sound-loader-component/sound-loader.component";
import { WaveVisualizerComponent } from "../../../components/wave-visualizer-component/wave-visualizer.component";
import { ConsoleDock } from "../../../components/console-dock-component/console-dock.component";
import { SoundscapeComponent } from "../../../components/soundscape-component/soundscape.component";
import { SoundManager } from '../../../../sound-manager/sound-manager';
// @ts-ignore
import demoTemplate from "./demo-template.html?raw";
import { DEMO_CONFIG } from "./demo.config";
import { LocalStorageManagerManager } from "../../../services/local-storage-manager";
import { ApiLogger, instrumentSoundManager } from "../../../services/api-logger";
import { SoundEventsEnum } from "../../../../sound-manager/sound-events.enum";
import { SoundEvent } from "../../../../sound-manager/sound-event.interface";
import { SOUNDSCAPES } from "./soundscapes";
import { getSoundMeta } from "./sound-catalog";
import { CategoryFilter, SoundListToolbar, ToolbarState } from "./sound-list-toolbar";
import { KeyboardShortcuts } from "./keyboard-shortcuts";

/**
 * Sound file manifests — keeps import lines shorter and centralised.
 * Add new sounds here by extending the array.
 */
const SOUND_MANIFEST: { id: string; url: () => Promise<{ default: string }> }[] = [
  { id: "intro-speach", url: () => import("../../../../sounds/intro-text-speach.mp3") },
  { id: "piano-tone", url: () => import("../../../../sounds/piano-tone.mp3") },
  { id: "game-sound", url: () => import("../../../../sounds/8-bit-game-sounds.mp3") },
  { id: "birds", url: () => import("../../../../sounds/birds-forest.mp3") },
  { id: "rain", url: () => import("../../../../sounds/rain.mp3") },
  { id: "crickets", url: () => import("../../../../sounds/crickets.mp3") },
  { id: "brook", url: () => import("../../../../sounds/brook.mp3") },
  { id: "magma", url: () => import("../../../../sounds/under-sea-magma.mp3") },
  { id: "little-wonders-song", url: () => import("../../../../sounds/little-wonders.mp3") },
  { id: "sound-surfer-constellations", url: () => import("../../../../sounds/sound-surfer-constellations.mp3") },
];

/**
 * Resolves all dynamic imports concurrently and returns an array
 * suitable for `soundManager.loadSounds()`.
 */
async function resolveSoundManifest(): Promise<{ id: string; url: string }[]> {
  const results = await Promise.all(
    SOUND_MANIFEST.map(async (entry) => ({
      id: entry.id,
      url: (await entry.url()).default,
    }))
  );
  return results;
}

export class SoundManagerDemo {
  private soundManager: SoundManager;
  private soundControls: Map<string, SoundControl> = new Map();
  private containerElement: HTMLElement;
  private soundManagerConfig: SoundManagerConfig = DEMO_CONFIG;

  private apiLogger = new ApiLogger();
  private consoleDock: ConsoleDock | null = null;
  private soundscapes: SoundscapeComponent | null = null;
  private toolbar: SoundListToolbar | null = null;
  private shortcuts: KeyboardShortcuts | null = null;
  private emptyState: HTMLElement | null = null;

  private filter: ToolbarState = { query: "", category: "all" };
  /** Controls in list order, filtered — the order the number keys address. */
  private visibleControls: SoundControl[] = [];

  constructor(container: HTMLElement) {
    if (!container) {
      throw new Error("Container element is required for SoundManagerDemo");
    }

    if (!(container instanceof HTMLElement)) {
      throw new Error("Container must be attached to the DOM");
    }

    if (!container.parentElement) {
      throw new Error("Container must be attached to the DOM");
    }

    this.containerElement = container;

    // Every control talks to the instrumented manager, so the console can
    // print the exact call behind whatever the visitor just did without a
    // single control having to know the console exists.
    this.soundManager = instrumentSoundManager(
      new SoundManager(<SoundManagerConfig>this.soundManagerConfig),
      this.apiLogger
    );

    this.initialize();
  }

  private initialize(): void {
    try {
      this.render();
      this.initializeAudioController();
      this.initializeTheme();
      this.initializeEventListeners();
      this.loadDemoSounds();
    } catch (error) {
      console.error("Failed to initialize SoundManagerDemo:", error);
    }
  }

  private render(): void {
    if (!this.containerElement) {
      throw new Error("Element not found");
    }
    this.containerElement.innerHTML = demoTemplate;
    this.emptyState = document.getElementById("listEmptyState");
  }

  private initializeAudioController(): void {
    const controllerEl = document.getElementById('generalAudioController');
    if (controllerEl) {
      new AudioControllerComponent(controllerEl);
    }
  }

  private initializeEventListeners(): void {
    // Anything that changes what is running refreshes the "n playing" readout.
    const transportEvents = [
      SoundEventsEnum.STARTED,
      SoundEventsEnum.RESUMED,
      SoundEventsEnum.PAUSED,
      SoundEventsEnum.STOPPED,
      SoundEventsEnum.ENDED,
      SoundEventsEnum.RESET,
    ];

    transportEvents.forEach((type) => {
      this.soundManager.addEventListener(type, () => this.updatePlayingCount());
    });
  }

  private initializeTheme(): void {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle') as HTMLInputElement;

    const storedTheme = LocalStorageManagerManager.getItem('sound-manager-ts-demo-theme');

    if (!storedTheme) {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      LocalStorageManagerManager.setItem('sound-manager-ts-demo-theme', systemTheme);
    }

    if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      body.classList.add('dark-theme');
      if (themeToggle) themeToggle.checked = true;
    } else {
      body.classList.remove('dark-theme');
      if (themeToggle) themeToggle.checked = false;
    }

    if (themeToggle) {
      themeToggle.addEventListener('change', function () {
        if (this.checked) {
          body.classList.add('dark-theme');
          LocalStorageManagerManager.setItem('sound-manager-ts-demo-theme', 'dark');
        } else {
          body.classList.remove('dark-theme');
          LocalStorageManagerManager.setItem('sound-manager-ts-demo-theme', 'light');
        }
      });
    }
  }

  private async loadDemoSounds(): Promise<void> {
    // The manifest resolves the URLs first, so the loader can show the real
    // number of channels rather than guessing.
    const soundsToLoad = await resolveSoundManifest();

    const loaderContainer = document.getElementById("soundLoaderContainer") as HTMLElement;
    const loader = new SoundLoaderComponent(loaderContainer, soundsToLoad.length);

    // The library reports each sound the moment it finishes decoding, so the
    // progress shown is the real thing rather than a timed animation.
    const onLoaded = (event: SoundEvent) => {
      if (event.soundId) loader.markLoaded(event.soundId);
    };
    const onError = () => loader.markFailed();

    this.soundManager.addEventListener(SoundEventsEnum.LOADED, onLoaded);
    this.soundManager.addEventListener(SoundEventsEnum.ERROR, onError);

    try {
      await this.soundManager.loadSounds(soundsToLoad);
    } catch (error) {
      console.error("Error loading sounds:", error);
    } finally {
      this.soundManager.removeEventListener(SoundEventsEnum.LOADED, onLoaded);
      this.soundManager.removeEventListener(SoundEventsEnum.ERROR, onError);
    }

    // Build the controls for whatever actually loaded, so one bad file does not
    // leave the page stuck on the loader.
    const loaded = soundsToLoad.filter(({ id }) => this.soundManager.isSoundLoaded(id));

    await loader.complete();

    const masterControlContainer = document.getElementById("masterControlContainer") as HTMLElement;
    const soundControlsContainer = document.getElementById("soundControlsContainer") as HTMLElement;
    soundControlsContainer.classList.add("show");

    this.createSoundscapes(loaded);
    this.createMasterControl(masterControlContainer);
    this.initializeVisualizer();
    this.createSoundControls(loaded);
    this.createToolbar();
    // Wiring up eleven channels means applying eleven sets of defaults, and
    // that setup is not what the visitor came to read. The log starts from
    // the first thing they actually do.
    this.apiLogger.clear();

    this.createConsoleDock();
    this.createShortcuts();
    this.updatePlayingCount();
  }

  private createSoundControls(soundsToLoad: Array<{ id: string; url: string }>): void {
    this.soundControls.clear();
    const container = document.getElementById("soundControlsContainer")!;
    container.innerHTML = "";

    soundsToLoad.forEach(({ id }) => {
      if (id === "game-sound") {
        const sprites: { [key: string]: [number, number] } = {
          levelup: [2.4, 4],
          jump: [4, 5],
        };

        this.soundManager.setSoundSprite(id, sprites);

        Object.entries(sprites).forEach(([spriteName]) => {
          const spriteId = `${id}_${spriteName}`;
          const control = new SoundControl(
            spriteId,
            this.soundManager,
            container,
            true,
            (removed) => this.forgetControl(removed),
            () => this.syncBulkToggle()
          );
          this.soundControls.set(spriteId, control);
        });
      } else {
        const control = new SoundControl(
          id,
          this.soundManager,
          container,
          false,
          (removed) => this.forgetControl(removed),
          () => this.syncBulkToggle()
        );
        this.soundControls.set(id, control);
      }
    });
  }

  /** A removed channel must leave the counts, the filter and the number keys. */
  private forgetControl(id: string): void {
    this.soundControls.delete(id);
    this.applyFilter();
    this.updatePlayingCount();
  }

  private createMasterControl(container: HTMLElement): void {
    new MasterControl(container, this.soundManagerConfig, this.soundManager);
  }

  private createSoundscapes(loaded: Array<{ id: string }>): void {
    const container = document.getElementById("soundscapesContainer");
    if (!container) return;

    const loadedIds = new Set(loaded.map(({ id }) => id));
    this.soundscapes = new SoundscapeComponent(
      container,
      this.soundManager,
      SOUNDSCAPES,
      (id) => loadedIds.has(id),
      // The scene places its layers in 3D; the strips show where they landed.
      (placements) => {
        placements.forEach(({ id, position }) => {
          this.soundControls.get(id)?.showSpatialPosition(position);
        });
      }
    );
  }

  private createToolbar(): void {
    const container = document.getElementById("soundListToolbarContainer");
    if (!container) return;

    const counts = { all: 0, ambience: 0, music: 0, voice: 0, game: 0 } as Record<CategoryFilter, number>;
    this.soundControls.forEach((_, id) => {
      counts.all += 1;
      counts[getSoundMeta(id).category] += 1;
    });

    this.toolbar = new SoundListToolbar(
      container,
      counts,
      (state) => {
        this.filter = state;
        this.applyFilter();
      },
      (expanded) => {
        this.visibleControls.forEach((control) => control.setExpanded(expanded));
      }
    );

    this.applyFilter();
  }

  private createConsoleDock(): void {
    const container = document.getElementById("consoleDockContainer");
    if (!container) return;
    this.consoleDock = new ConsoleDock(container, this.apiLogger, this.soundManager);
  }

  private createShortcuts(): void {
    const container = document.getElementById("shortcutsContainer");
    if (!container) return;

    this.shortcuts = new KeyboardShortcuts(container, {
      togglePlayAll: () => {
        if (this.countPlaying() > 0) {
          this.soundManager.pauseAllSounds();
        } else {
          this.soundManager.resumeAllSounds();
        }
      },
      stopAll: () => this.soundManager.stopAllSounds(),
      toggleMuteAll: () => this.soundManager.toggleGlobalMute(),
      toggleConsole: () => this.consoleDock?.toggle(),
      focusSearch: () => this.toolbar?.focusSearch(),
      playNth: (index) => this.visibleControls[index]?.togglePlayback(),
      startScene: (index) => this.soundscapes?.startByIndex(index),
    });

    document.getElementById("shortcutsButton")?.addEventListener("click", () => {
      this.shortcuts?.open();
    });
  }

  /** Filtering hides strips rather than rebuilding them, so nothing resets. */
  private applyFilter(): void {
    this.visibleControls = [];

    this.soundControls.forEach((control) => {
      const visible = control.matches(this.filter.query, this.filter.category);
      control.setVisible(visible);
      if (visible) this.visibleControls.push(control);
    });

    const total = this.soundControls.size;
    this.toolbar?.setResultCount(this.visibleControls.length, total);

    if (this.emptyState) {
      this.emptyState.hidden = this.visibleControls.length > 0;
    }

    this.syncBulkToggle();
  }

  /**
   * The bulk button offers whatever the list is not already doing, so it says
   * "collapse all" only while every visible strip is genuinely open, including
   * when that happened one disclosure at a time.
   */
  private syncBulkToggle(): void {
    const allExpanded =
      this.visibleControls.length > 0 && this.visibleControls.every((control) => control.isExpanded());
    this.toolbar?.setBulkExpanded(allExpanded);
  }

  private countPlaying(): number {
    let playing = 0;
    this.soundControls.forEach((control) => {
      if (control.isCurrentlyPlaying()) playing += 1;
    });
    return playing;
  }

  private updatePlayingCount(): void {
    this.toolbar?.setPlayingCount(this.countPlaying());
  }

  private initializeVisualizer(): void {
    const container = document.getElementById("waveVisualizerContainer") as HTMLElement;
    if (!container) return;

    const audioCtx = this.soundManager.getContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    this.soundManager.getMasterOutput().connect(analyser);

    new WaveVisualizerComponent(container, analyser);
  }
}
