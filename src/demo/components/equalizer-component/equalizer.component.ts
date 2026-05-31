import "./equalizer.component.css";

/**
 * Compact canvas-based frequency equalizer.
 *
 * Connects to an AnalyserNode (already created and connected to the audio pipeline)
 * and renders frequency-bar animations in real-time.
 */
export class EqualizerComponent {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly analyser: AnalyserNode;
  private readonly barCount = 32;
  private readonly bufferLength: number;
  private readonly dataArray: Uint8Array;
  private rafId: number | null = null;
  private running = false;

  constructor(container: HTMLElement, analyser: AnalyserNode) {
    // Create the canvas element
    this.canvas = document.createElement("canvas");
    this.canvas.width = 240;   // logical pixels (CSS scales down)
    this.canvas.height = 64;
    container.classList.add("equalizer-container");
    container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext("2d")!;
    this.analyser = analyser;
    this.analyser.fftSize = 64;
    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength) as Uint8Array<ArrayBuffer>;

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
    // Clear the canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private draw = (): void => {
    if (!this.running) return;

    this.rafId = requestAnimationFrame(this.draw);

    this.analyser.getByteFrequencyData(this.dataArray);

    const w = this.canvas.width;
    const h = this.canvas.height;

    // Get theme-aware colors
    const isDark = document.body.classList.contains("dark-theme");
    const bgColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
    const barColor = isDark ? "rgba(14,142,232,0.8)" : "rgba(74,107,255,0.75)";
    const barColorPeak = isDark ? "rgba(14,142,232,1)" : "rgba(74,107,255,1)";

    // Clear
    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, w, h);

    // Determine if there's significant audio activity
    let total = 0;
    for (let i = 0; i < this.bufferLength; i++) {
      total += this.dataArray[i];
    }
    const average = total / this.bufferLength;
    const isActive = average > 2; // silence threshold

    if (!isActive) {
      // Draw subtle flat line when silent
      this.ctx.strokeStyle = barColor;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(0, h / 2);
      this.ctx.lineTo(w, h / 2);
      this.ctx.stroke();
      return;
    }

    // Draw frequency bars
    const barWidth = w / this.barCount;
    const step = Math.max(1, Math.floor(this.bufferLength / this.barCount));

    for (let i = 0; i < this.barCount; i++) {
      // Average several frequency bins per bar for smoother look
      let sum = 0;
      const startBin = i * step;
      const endBin = Math.min(startBin + step, this.bufferLength);
      for (let b = startBin; b < endBin; b++) {
        sum += this.dataArray[b];
      }
      const value = sum / (endBin - startBin);

      // Normalize: 0-255 → 0-1
      const norm = value / 255;
      // Scale bar height, minimum 2px when active
      const barH = Math.max(2, norm * h * 0.9);

      const x = i * barWidth + 1;
      const y = h - barH;

      // Gradient based on height
      const gradient = this.ctx.createLinearGradient(0, h, 0, 0);
      gradient.addColorStop(0, barColor);
      gradient.addColorStop(0.7, barColorPeak);
      this.ctx.fillStyle = gradient;

      // Rounded bars
      this.ctx.fillRect(x, y, Math.max(1, barWidth - 2), barH);
    }
  };

  /** Clean up animation frame and resources */
  dispose(): void {
    this.stop();
    this.canvas.remove();
  }
}