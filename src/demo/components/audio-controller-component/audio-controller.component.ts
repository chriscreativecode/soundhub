/* @ts-ignore */
import "./audio-controller.component.css";

export interface AudioControllerOptions {
  /** Array of fill colors to cycle through the wave bars. Default: #4a6bff for all */
  waveFillColors?: string[];
}

const DEFAULT_WAVE_FILL = "#4a6bff";

/**
 * Renders the animated SVG audio controller graphic.
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

  constructor(container: HTMLElement, options: AudioControllerOptions = {}) {
    this.container = container;
    this.options = options;
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
    const fillColors = this.options.waveFillColors ?? [];
    const waveBars = this.buildWaveBars(fillColors);

    return `<svg viewBox="0 0 872 546" xmlns="http://www.w3.org/2000/svg">
      <rect class="outer-frame" width="864" height="536" x="5" y="5" fill="rgba(220,220,220,0.8)" stroke="#000000" stroke-width="4" />
      <rect class="display-panel" width="784" height="250" x="44" y="50" rx="20" ry="20" fill="#ffffff" stroke="#000000" stroke-width="4" />
      <g class="wave-container" transform="translate(33,27)">
        <svg x="0" y="60" width="800" height="270" viewBox="0 150 800 200" preserveAspectRatio="none" overflow="visible">
          ${waveBars}
        </svg>
      </g>
      <g class="control-knob">
        <ellipse cx="77" cy="75" rx="77" ry="75" fill="#ffffff" stroke="#000000" stroke-width="4" />
        <path d="M77 75L23 25" fill="none" stroke="#000000" stroke-width="4" />
      </g>
      <g class="equalizer-display" transform="translate(79.5,335.5)">
        <g>
          <rect class="eq-block" width="13" height="13" x="635" y="30" fill="#000000" />
          <rect class="eq-block" width="13" height="13" x="669" y="30" fill="#000000" />
          <rect class="eq-block" width="13" height="13" x="703" y="30" fill="#000000" />
          <rect class="eq-block" width="13" height="13" x="738" y="30" fill="#000000" />
        </g>
        <g transform="translate(0,36)">
          <rect class="eq-block" width="13" height="13" x="635" y="30" fill="#000000" />
          <rect class="eq-block" width="13" height="13" x="669" y="30" fill="#000000" />
          <rect class="eq-block" width="13" height="13" x="703" y="30" fill="#000000" />
          <rect class="eq-block" width="13" height="13" x="738" y="30" fill="#000000" />
        </g>
        <g transform="translate(0,72)">
          <rect class="eq-block" width="13" height="13" x="635" y="30" fill="#000000" />
          <rect class="eq-block" width="13" height="13" x="669" y="30" fill="#000000" />
          <rect class="eq-block" width="13" height="13" x="703" y="30" fill="#000000" />
          <rect class="eq-block" width="13" height="13" x="738" y="30" fill="#000000" />
        </g>
        <g transform="translate(0,108)">
          <rect class="eq-block" width="13" height="13" x="635" y="30" fill="#000000" />
          <rect class="eq-block" width="13" height="13" x="669" y="30" fill="#000000" />
          <rect class="eq-block" width="13" height="13" x="703" y="30" fill="#000000" />
          <rect class="eq-block" width="13" height="13" x="738" y="30" fill="#000000" />
        </g>
      </g>
      <g class="slider-container">
        <path class="slider-track bass-track" d="M77 358v155" fill="none" stroke="#000000" stroke-width="4" />
        <rect class="slider-handle bass-handle" width="53" height="25" x="51" y="394" fill="#cccccc" stroke="#000000" stroke-width="4" />
        <path class="slider-track mid-track" d="M239 358v155" fill="none" stroke="#000000" stroke-width="4" />
        <rect class="slider-handle mid-handle" width="53" height="25" x="212" y="416" fill="#eeeeee" stroke="#000000" stroke-width="4" />
        <path class="slider-track treble-track" d="M389 358v155" fill="none" stroke="#000000" stroke-width="4" />
        <rect class="slider-handle treble-handle" width="53" height="25" x="362" y="456" fill="#cccccc" stroke="#000000" stroke-width="4" />
      </g>
    </svg>`;
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

    return bars.map(([x, width, initialScale, peakScale, delay], index) => {
      const fill = fillColors.length > 0
        ? fillColors[index % fillColors.length]
        : DEFAULT_WAVE_FILL;
      return `<rect class="wave-bar" x="${x}" y="150" width="${width}" height="150" fill="${fill}" style="--initial-scale:${initialScale};--peak-scale:${peakScale};animation-delay:${delay}s" />`;
    }).join("\n          ");
  }

  private render(): void {
    this.container.innerHTML = this.svgHtml;
  }
}