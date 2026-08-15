/* @ts-ignore */
import "./audio-controller.component.css";

export interface AudioControllerOptions {
  /** Array of fill colors to cycle through the wave bars. Default: the page accent */
  waveFillColors?: string[];
}

/** Ids inside <defs> have to be unique per instance, in case a page shows two. */
let instanceCounter = 0;

/**
 * Renders the animated SVG audio controller graphic: a small amplifier
 * faceplate with a lit display, a knob and three sliders.
 *
 * Everything that carries colour reads a CSS custom property, so a page can
 * tint the whole unit by setting `--ac-accent` on the container.
 *
 * Usage:
 * ```
 * <div class="audio-controller" id="myController"></div>
 * ```
 * ```ts
 * new AudioControllerComponent(
 *   document.getElementById('myController')!,
 *   { waveFillColors: ['#8b5cf6', '#10b981'] }
 * );
 * ```
 */
export class AudioControllerComponent {
  private container: HTMLElement;
  private options: AudioControllerOptions;
  private svgHtml: string;
  private uid: string;

  constructor(container: HTMLElement, options: AudioControllerOptions = {}) {
    this.container = container;
    this.options = options;
    this.uid = `ac${++instanceCounter}`;
    this.svgHtml = this.buildSvg();
    this.render();
  }

  /**
   * Returns the raw SVG string, useful when interpolating into a template.
   */
  getSvgString(): string {
    return this.svgHtml;
  }

  private buildSvg(): string {
    const id = this.uid;
    const waveBars = this.buildWaveBars(this.options.waveFillColors ?? []);

    return `<svg viewBox="0 0 872 546" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Audio controller">
      <defs>
        <linearGradient id="${id}-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" class="ac-body-top" />
          <stop offset="0.45" class="ac-body-mid" />
          <stop offset="1" class="ac-body-bottom" />
        </linearGradient>

        <linearGradient id="${id}-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" class="ac-screen-top" />
          <stop offset="1" class="ac-screen-bottom" />
        </linearGradient>

        <!-- Phosphor haze behind the bars, so the panel reads as lit glass -->
        <radialGradient id="${id}-haze" cx="0.5" cy="0.95" r="0.85">
          <stop offset="0" class="ac-haze-in" />
          <stop offset="1" class="ac-haze-out" />
        </radialGradient>

        <!-- Curved reflection across the top of the glass -->
        <linearGradient id="${id}-glass" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" class="ac-glass-in" />
          <stop offset="1" class="ac-glass-out" />
        </linearGradient>

        <radialGradient id="${id}-knob" cx="0.35" cy="0.28" r="0.85">
          <stop offset="0" class="ac-knob-in" />
          <stop offset="1" class="ac-knob-out" />
        </radialGradient>

        <linearGradient id="${id}-handle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" class="ac-handle-top" />
          <stop offset="1" class="ac-handle-bottom" />
        </linearGradient>

        <clipPath id="${id}-screen-clip">
          <rect x="44" y="50" width="784" height="250" rx="22" ry="22" />
        </clipPath>
      </defs>

      <!-- Case -->
      <rect class="ac-case" x="6" y="6" width="860" height="534" rx="30" ry="30" fill="url(#${id}-body)" />
      <rect class="ac-case-edge" x="6" y="6" width="860" height="534" rx="30" ry="30" fill="none" />
      <path class="ac-case-shine" d="M36 26h800a22 22 0 0 1 22 22v6H14v-6a22 22 0 0 1 22-22z" />

      <!-- Display -->
      <rect class="ac-bezel" x="34" y="40" width="804" height="270" rx="28" ry="28" />
      <rect class="ac-screen" x="44" y="50" width="784" height="250" rx="22" ry="22" fill="url(#${id}-screen)" />

      <g clip-path="url(#${id}-screen-clip)">
        <rect class="ac-haze" x="44" y="50" width="784" height="250" fill="url(#${id}-haze)" />

        <g class="ac-grid">
          <path d="M44 112h784M44 175h784M44 237h784" />
          <path d="M175 50v250M306 50v250M436 50v250M567 50v250M698 50v250" />
        </g>

        <g class="wave-container" transform="translate(33,27)">
          <svg x="0" y="60" width="800" height="270" viewBox="0 150 800 200" preserveAspectRatio="none" overflow="visible">
            ${waveBars}
          </svg>
        </g>

        <!-- Baseline the bars stand on -->
        <path class="ac-baseline" d="M60 286h752" />
        <path class="ac-glass" d="M44 50h784v96c-180 54-604 54-784 0z" fill="url(#${id}-glass)" />
        <g class="ac-scanlines">
          <path d="M44 74h784M44 98h784M44 122h784M44 146h784M44 170h784M44 194h784M44 218h784M44 242h784M44 266h784M44 290h784" />
        </g>
      </g>
      <rect class="ac-screen-edge" x="44" y="50" width="784" height="250" rx="22" ry="22" fill="none" />

      <!-- Level meter, four columns of segments -->
      <g class="ac-meter" transform="translate(79.5,335.5)">
        ${this.buildMeter()}
      </g>

      <!-- Volume knob -->
      <g class="ac-knob-group" transform="translate(595,431.5)">
        <g class="ac-knob-ticks">
          ${this.buildKnobTicks()}
        </g>
        <circle class="ac-knob-base" r="78" />
        <circle class="ac-knob-face" r="66" fill="url(#${id}-knob)" />
        <circle class="ac-knob-ring" r="66" fill="none" />
        <g class="control-knob">
          <path class="ac-knob-pointer" d="M0 -8V-56" />
          <circle class="ac-knob-cap" r="10" />
        </g>
      </g>

      <!-- Power light -->
      <circle class="ac-led-halo" cx="47" cy="336" r="20" />
      <circle class="ac-led" cx="47" cy="336" r="9" />

      <!-- Faders -->
      <g class="slider-container">
        <rect class="ac-slot" x="70" y="356" width="14" height="159" rx="7" />
        <path class="slider-track bass-track" d="M77 358v155" fill="none" />
        <g class="slider-handle bass-handle">
          ${this.buildHandle(id, 51, 394)}
        </g>

        <rect class="ac-slot" x="232" y="356" width="14" height="159" rx="7" />
        <path class="slider-track mid-track" d="M239 358v155" fill="none" />
        <g class="slider-handle mid-handle">
          ${this.buildHandle(id, 212, 416)}
        </g>

        <rect class="ac-slot" x="382" y="356" width="14" height="159" rx="7" />
        <path class="slider-track treble-track" d="M389 358v155" fill="none" />
        <g class="slider-handle treble-handle">
          ${this.buildHandle(id, 362, 456)}
        </g>
      </g>
    </svg>`;
  }

  /** One fader cap: body, grip line and a highlight along the top edge. */
  private buildHandle(id: string, x: number, y: number): string {
    return `<rect class="ac-handle" x="${x}" y="${y}" width="53" height="27" rx="6" fill="url(#${id}-handle)" />
          <path class="ac-handle-grip" d="M${x + 8} ${y + 13.5}h37" />
          <path class="ac-handle-shine" d="M${x + 5} ${y + 4}h43" />`;
  }

  /**
   * The meter lights up column by column: the left columns are lit at rest and
   * the right-hand ones only peak, which is what gives it its idle wiggle.
   */
  private buildMeter(): string {
    const columns = [635, 669, 703, 738];
    const rows = [0, 36, 72, 108];

    return rows
      .map((rowOffset, row) =>
        columns
          .map((x, col) => {
            const level = (3 - row) + col; // higher rows and later columns light last
            return `<rect class="ac-meter-seg" data-level="${level}" width="13" height="13" x="${x}" y="${30 + rowOffset}" rx="2"
              style="animation-delay:${(level * 0.09).toFixed(2)}s" />`;
          })
          .join('\n          '),
      )
      .join('\n          ');
  }

  /** Tick marks around the knob, the detail that makes it read as a dial. */
  private buildKnobTicks(): string {
    const ticks: string[] = [];
    for (let i = 0; i <= 10; i++) {
      const angle = (-135 + i * 27) * (Math.PI / 180);
      const inner = 84;
      const outer = i % 5 === 0 ? 100 : 94;
      const sin = Math.sin(angle);
      const cos = -Math.cos(angle);
      ticks.push(
        `<path d="M${(sin * inner).toFixed(1)} ${(cos * inner).toFixed(1)}L${(sin * outer).toFixed(1)} ${(cos * outer).toFixed(1)}" />`,
      );
    }
    return ticks.join('\n          ');
  }

  private buildWaveBars(fillColors: string[]): string {
    // Wave bar definitions: [x, width, initialScale, peakScale, delay]
    const bars: [number, number, number, number, number][] = [
      [24, 18, 0.5, 0.7, -0.35],
      [48, 8, 0.2, 0.8, -0.3],
      [62, 22, 0.4, 0.6, -0.25],
      [90, 15, 0.6, 1.0, -0.2],
      [111, 10, 0.1, 0.5, -0.15],
      [127, 25, 0.3, 0.7, -0.1],
      [158, 14, 0.5, 0.9, -0.05],
      [178, 20, 0.2, 0.6, 0],
      [204, 9, 0.4, 0.8, 0.05],
      [219, 28, 0.6, 1.0, 0.1],
      [253, 16, 0.1, 0.5, 0.15],
      [275, 11, 0.3, 0.9, 0.2],
      [292, 24, 0.5, 0.7, 0.25],
      [322, 13, 0.2, 0.8, 0.3],
      [341, 19, 0.4, 0.6, 0.35],
      [366, 7, 0.6, 1.0, 0.4],
      [379, 26, 0.1, 0.5, 0.45],
      [411, 17, 0.3, 0.7, 0.5],
      [434, 21, 0.5, 0.9, 0.55],
      [461, 14, 0.2, 0.6, 0.6],
      [481, 30, 0.4, 0.8, 0.65],
      [517, 9, 0.6, 1.0, 0.7],
      [532, 23, 0.1, 0.5, 0.75],
      [561, 15, 0.3, 0.7, 0.8],
      [582, 27, 0.5, 0.9, 0.85],
      [615, 12, 0.2, 0.6, 0.9],
      [633, 19, 0.4, 0.8, 0.95],
      [658, 10, 0.6, 1.0, 1.0],
      [674, 22, 0.1, 0.5, 1.05],
      [702, 16, 0.3, 0.7, 1.1],
      [724, 13, 0.5, 0.9, 1.15],
      [743, 29, 0.2, 0.6, 1.2],
    ];

    return bars
      .map(([x, width, initialScale, peakScale, delay], index) => {
        // A per-bar override still works, it just feeds the same gradient stop
        const tint = fillColors.length > 0 ? `--ac-bar:${fillColors[index % fillColors.length]};` : '';
        return `<rect class="wave-bar" x="${x}" y="150" width="${width}" height="150" rx="3"
              style="${tint}--initial-scale:${initialScale};--peak-scale:${peakScale};animation-delay:${delay}s" />`;
      })
      .join('\n          ');
  }

  private render(): void {
    this.container.innerHTML = this.svgHtml;
  }
}
