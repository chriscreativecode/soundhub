/// <reference types="vite/client" />
import "./wave-visualizer.component.css";
// @ts-ignore
import template from "./wave-visualizer.component.html?raw";

const BAR_COUNT = 64;
const BAR_GAP = 2;
const PEAK_HOLD_FRAMES = 45;
const PEAK_FALL_SPEED = 1.2;

export class WaveVisualizerComponent {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private analyser: AnalyserNode;
  private dataArray: Uint8Array<ArrayBuffer>;
  private peaks: Float32Array;
  private peakHoldCounters: Int32Array;
  private rafId: number | null = null;
  private resizeObserver: ResizeObserver;
  private isDark: boolean = false;

  constructor(container: HTMLElement, analyser: AnalyserNode) {
    this.analyser = analyser;
    this.dataArray = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
    this.peaks = new Float32Array(BAR_COUNT);
    this.peakHoldCounters = new Int32Array(BAR_COUNT);

    container.innerHTML = template;
    this.canvas = container.querySelector(".wave-visualizer__canvas") as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d")!;

    this.resizeObserver = new ResizeObserver(() => this.syncCanvasSize());
    this.resizeObserver.observe(container);
    this.syncCanvasSize();

    this.isDark = document.body.classList.contains("dark-theme");
    this.watchTheme();

    this.animate();
  }

  private syncCanvasSize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(rect.width * devicePixelRatio);
    this.canvas.height = Math.round(rect.height * devicePixelRatio);
  }

  private watchTheme(): void {
    const observer = new MutationObserver(() => {
      this.isDark = document.body.classList.contains("dark-theme");
    });
    observer.observe(document.body, { attributeFilter: ["class"] });
  }

  private animate(): void {
    this.rafId = requestAnimationFrame(() => this.animate());
    this.analyser.getByteFrequencyData(this.dataArray);
    this.draw();
  }

  private draw(): void {
    const { canvas, ctx } = this;
    const W = canvas.width;
    const H = canvas.height;

    // Background
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = this.isDark ? "#0d0d1a" : "#f0f2ff";
    ctx.fillRect(0, 0, W, H);

    const binCount = this.analyser.frequencyBinCount;
    // Use lower ~60% of frequency bins (most musical content is there)
    const usedBins = Math.floor(binCount * 0.6);
    const binsPerBar = usedBins / BAR_COUNT;
    const barW = (W - BAR_GAP * (BAR_COUNT - 1)) / BAR_COUNT;

    for (let i = 0; i < BAR_COUNT; i++) {
      // Average the bins that map to this bar
      let sum = 0;
      const startBin = Math.floor(i * binsPerBar);
      const endBin = Math.floor((i + 1) * binsPerBar);
      for (let b = startBin; b < endBin; b++) {
        sum += this.dataArray[b];
      }
      const avg = endBin > startBin ? sum / (endBin - startBin) : 0;
      const barH = (avg / 255) * H;
      const x = i * (barW + BAR_GAP);
      const y = H - barH;

      // Bar gradient: blue (bottom) → cyan (top)
      const grad = ctx.createLinearGradient(0, H, 0, 0);
      grad.addColorStop(0, "#4a6bff");
      grad.addColorStop(0.6, "#00aaff");
      grad.addColorStop(1, "#00e5ff");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [2, 2, 0, 0]);
      ctx.fill();

      // Peak hold
      if (barH >= this.peaks[i]) {
        this.peaks[i] = barH;
        this.peakHoldCounters[i] = PEAK_HOLD_FRAMES;
      } else {
        if (this.peakHoldCounters[i] > 0) {
          this.peakHoldCounters[i]--;
        } else {
          this.peaks[i] = Math.max(0, this.peaks[i] - PEAK_FALL_SPEED);
        }
      }

      const peakY = H - this.peaks[i];
      ctx.fillStyle = this.isDark ? "rgba(0, 229, 255, 0.7)" : "rgba(74, 107, 255, 0.8)";
      ctx.fillRect(x, peakY - 2, barW, 2);
    }
  }

  public destroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.resizeObserver.disconnect();
  }
}
