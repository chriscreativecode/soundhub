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

  /**
   * @param container  The `.audio-controller` element that already contains the SVG
   * @param analyser   An AnalyserNode connected to the audio pipeline
   */
  constructor(container: HTMLElement, analyser: AnalyserNode) {
    this.analyser = analyser;
    this.analyser.fftSize = 64;
    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength) as Uint8Array<ArrayBuffer>;

    // Find all .wave-bar rects inside the SVG
    this.bars = Array.from(container.querySelectorAll<SVGRectElement>(".wave-bar"));
    this.barCount = this.bars.length;

    if (this.barCount === 0) {
      console.warn("[Equalizer] No .wave-bar elements found in container");
      return;
    }

    // Disable CSS keyframe animation on each bar — we take over via RAF
    this.bars.forEach((bar) => {
      bar.style.animation = "none";
    });

    this.start();
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
    const isActive = average > 2;

    // Map frequency bins to available bars (averaging bins per bar)
    const step = Math.max(1, Math.floor(this.bufferLength / this.barCount));

    for (let i = 0; i < this.barCount && i < this.bars.length; i++) {
      let sum = 0;
      const startBin = i * step;
      const endBin = Math.min(startBin + step, this.bufferLength);
      for (let b = startBin; b < endBin; b++) {
        sum += this.dataArray[b];
      }
      const value = sum / (endBin - startBin);

      // Normalize to 0-1 and scale to bar height (max ~140px within 150-290 Y range)
      const norm = value / 255;
      // Minimum 2px when active so bars are always visible, flat line when silent
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