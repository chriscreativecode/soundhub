import { SoundPannerConfig, DEFAULT_PANNER_CONFIG } from "../../../sound-manager/sound-panner-config";
import { SoundManager } from "../../../sound-manager/sound-manager";
// @ts-ignore
import templateHtml from "./spatial-settings.component.html?raw";

const PROPERTY_MAP: Record<string, keyof SoundPannerConfig> = {
  "panning-model-select": "panningModel",
  "distance-model-select": "distanceModel",
  "ref-distance-input": "refDistance",
  "max-distance-input": "maxDistance",
  "rolloff-factor-input": "rolloffFactor",
  "cone-inner-angle-input": "coneInnerAngle",
  "cone-outer-angle-input": "coneOuterAngle",
  "cone-outer-gain-input": "coneOuterGain",
};

/**
 * Renders a set of spatial audio settings controls (panning model,
 * distance model, ref distance, etc.) and fires a callback when
 * the user changes any value.
 */
export class SpatialSettings {
  private container: HTMLElement;
  private cleanupFns: (() => void)[] = [];

  /**
   * @param hostElement  The element into which this component's HTML is rendered
   * @param soundManager  The SoundManager instance (used for config defaults)
   * @param onChange  Called with the partial config whenever a value changes
   */
  constructor(
    hostElement: HTMLElement,
    soundManager: SoundManager,
    private onChange?: (config: Partial<SoundPannerConfig>) => void
  ) {
    hostElement.innerHTML = templateHtml;
    this.container = hostElement;

    const config: SoundPannerConfig = {
      ...DEFAULT_PANNER_CONFIG,
      ...(soundManager.getConfig().pannerNodeConfig || {}),
    };

    this.initializeValues(config);
    this.bindChangeHandlers();
  }

  private initializeValues(config: SoundPannerConfig): void {
    const setVal = (sel: string, val: string | number) => {
      const el = this.container.querySelector(`.${sel}`) as HTMLInputElement | HTMLSelectElement | null;
      if (el) el.value = String(val);
    };
    setVal("panning-model-select", config.panningModel!);
    setVal("distance-model-select", config.distanceModel!);
    setVal("ref-distance-input", config.refDistance!);
    setVal("max-distance-input", config.maxDistance!);
    setVal("rolloff-factor-input", config.rolloffFactor!);
    setVal("cone-inner-angle-input", config.coneInnerAngle!);
    setVal("cone-outer-angle-input", config.coneOuterAngle!);
    setVal("cone-outer-gain-input", config.coneOuterGain!);
  }

  private bindChangeHandlers(): void {
    const handler = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLSelectElement;
      const value = target.type === "number" ? parseFloat(target.value) : target.value;
      const property = PROPERTY_MAP[target.className];
      if (!property) return;

      this.onChange?.({ [property]: value });
    };

    const elements = this.container.querySelectorAll<HTMLElement>("select, input");
    elements.forEach((el) => {
      el.addEventListener("change", handler);
    });

    this.cleanupFns.push(() => {
      elements.forEach((el) => el.removeEventListener("change", handler));
    });
  }

  /**
   * Update all displayed values and optionally fire the onChange callback.
   * This is used by the spatial demo to prefill settings when the audio mode changes.
   */
  public setValues(config: Partial<SoundPannerConfig>, triggerOnChange: boolean = true): void {
    this.initializeValues({
      ...DEFAULT_PANNER_CONFIG,
      ...config,
    });
    if (triggerOnChange) {
      this.onChange?.({ ...config });
    }
  }

  /** Remove all internal event listeners */
  public destroy(): void {
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
  }
}
