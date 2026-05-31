/**
 * SVG-based frequency equalizer.
 *
 * Instead of drawing to a separate canvas, this component finds the existing
 * `.wave-bar` SVG `<rect>` elements inside an `AudioControllerComponent` SVG
 * and animates their height in real-time based on frequency data from an
 * AnalyserNode.
 *
 * Usage:
 * ```
 * const controllerEl = document.getElementById('myAudioController');
 * new AudioControllerComponent(controllerEl);
 *
 * const audioCtx = soundManager.getContext();
 * const analyser = audioCtx.createAnalyser();
 * soundManager.getMasterOutput().connect(analyser);
 *
 * new EqualizerComponent(controllerEl, analyser);
 * ```
 */
export class EqualizerComponent {
  private readonly bars: SVGRectElement[];
  private readonly analyser: AnalyserNode;
  private readonly bufferLength: number;
  private readonly dataArray: Uint8Array<ArrayBuffer>;
  private rafId: number | null = null;
  private running = false;
  private readonly barCount: number;
  // Precomputed [binLo, binHi] range for each bar (logarithmic frequency mapping)
  private readonly barBinRanges: Array<[number, number]>;

  /**
   * @param container  The `.audio-controller` element that already contains the SVG
   * @param analyser   An AnalyserNode connected to the audio pipeline
   */
  constructor(container: HTMLElement, analyser: AnalyserNode) {
    this.analyser = analyser;
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength) as Uint8Array<ArrayBuffer>;

    // Find all .wave-bar rects inside the SVG
    this.bars = Array.from(container.querySelectorAll<SVGRectElement>(".wave-bar"));
    this.barCount = this.bars.length;

    if (this.barCount === 0) {
      console.warn("[Equalizer] No .wave-bar elements found in container");
      this.barBinRanges = [];
      return;
    }

    // Precompute logarithmic frequency→bin ranges so all bars are spread
    // evenly across the musically relevant spectrum (40Hz–16kHz).
    this.barBinRanges = this.computeLogBinRanges();

    // Disable CSS keyframe animation on each bar — we take over via RAF
    this.bars.forEach((bar) => {
      bar.style.animation = "none";
    });

    this.start();
  }

  /**
   * Build a logarithmic frequency mapping from 40Hz to 16kHz across all bars.
   * Returns [binLo, binHi] (inclusive) for each bar.
   */
  private computeLogBinRanges(): Array<[number, number]> {
    const nyquist = this.analyser.context.sampleRate / 2;
    const minHz = 40;
    const maxHz = 16000;
    const logMin = Math.log(minHz);
    const logMax = Math.log(maxHz);

    const ranges: Array<[number, number]> = [];

    for (let i = 0; i < this.barCount; i++) {
      const freqLo = Math.exp(logMin + (logMax - logMin) * (i / this.barCount));
      const freqHi = Math.exp(logMin + (logMax - logMin) * ((i + 1) / this.barCount));

      let binLo = Math.floor((freqLo / nyquist) * this.bufferLength);
      let binHi = Math.ceil((freqHi / nyquist) * this.bufferLength);

      // Clamp to valid range
      binLo = Math.max(0, Math.min(binLo, this.bufferLength - 1));
      binHi = Math.max(binLo, Math.min(binHi, this.bufferLength - 1));

      ranges.push([binLo, binHi]);
    }

    return ranges;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.draw();
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    // Reset bars to a subtle resting state
    this.bars.forEach((bar) => {
      bar.setAttribute("height", "4");
      bar.style.transform = "";
    });
  }

  private draw = (): void => {
    if (!this.running) return;

    this.rafId = requestAnimationFrame(this.draw);

    this.analyser.getByteFrequencyData(this.dataArray);

    if (this.barCount === 0) return;

    // Determine if there's significant audio activity
    let total = 0;
    for (let i = 0; i < this.bufferLength; i++) {
      total += this.dataArray[i];
    }
    const average = total / this.bufferLength;
    const isActive = average > 0.5;

    for (let i = 0; i < this.barCount; i++) {
      const [binLo, binHi] = this.barBinRanges[i];

      // Average the frequency bins for this bar
      let sum = 0;
      const count = binHi - binLo + 1;
      for (let b = binLo; b <= binHi; b++) {
        sum += this.dataArray[b];
      }
      const value = sum / count;

      // Normalize to 0-1 and scale to bar height (max ~140px within 150-290 Y range)
      const norm = value / 255;
      let barHeight: number;
      if (isActive) {
        barHeight = Math.max(2, norm * 140);
      } else {
        barHeight = 1; // barely visible when silent
      }

      const bar = this.bars[i];

      // The viewBox Y range is 150-350, bars sit at y=150 with height extending downward.
      // Growing upward = decreasing y, increasing height.
      // Bottom of bar stays at y=290 (150 + 140 max height).
      const barTop = 290 - barHeight;

      bar.setAttribute("y", String(barTop));
      bar.setAttribute("height", String(barHeight));
      // Remove any leftover transform from CSS animation fallback
      bar.style.transform = "none";
    }
  };

  /** Clean up animation frame and disconnect from DOM */
  dispose(): void {
    this.stop();
  }
}
