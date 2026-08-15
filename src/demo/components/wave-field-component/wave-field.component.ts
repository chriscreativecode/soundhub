/// <reference types="vite/client" />
import "./wave-field.component.css";

/** One drifting line in the field. Every layer is its own little signal:
 *  its own wavelength, its own drift speed and its own envelope, so the
 *  lines never lock into the same shape twice. */
interface WaveLayer {
  /** Vertical home of the line, as a fraction of the viewport height. */
  baseRatio: number;
  /** Peak deflection, as a fraction of the viewport height. */
  ampRatio: number;
  /** Fundamental wavelength, as a fraction of the viewport width. */
  waveLength: number;
  /** Horizontal drift in radians per second. Sign sets the direction. */
  speed: number;
  /** How fast the line swells and falls back, in radians per second. */
  envSpeed: number;
  /** Phase offsets for the three summed sines and the envelope. */
  phases: [number, number, number, number];
  lineWidth: number;
  alpha: number;
}

const LAYERS: WaveLayer[] = [
  { baseRatio: 0.13, ampRatio: 0.110, waveLength: 1.05, speed: 0.34, envSpeed: 0.19, phases: [0.0, 1.7, 4.2, 0.0], lineWidth: 2.0, alpha: 1.00 },
  { baseRatio: 0.32, ampRatio: 0.072, waveLength: 0.68, speed: -0.55, envSpeed: 0.27, phases: [2.1, 5.0, 0.8, 1.9], lineWidth: 1.4, alpha: 0.80 },
  { baseRatio: 0.52, ampRatio: 0.130, waveLength: 1.50, speed: 0.21, envSpeed: 0.13, phases: [4.4, 2.6, 3.1, 3.4], lineWidth: 2.4, alpha: 0.95 },
  { baseRatio: 0.71, ampRatio: 0.060, waveLength: 0.46, speed: 0.82, envSpeed: 0.36, phases: [1.2, 3.9, 5.5, 5.1], lineWidth: 1.2, alpha: 0.70 },
  { baseRatio: 0.89, ampRatio: 0.095, waveLength: 0.92, speed: -0.40, envSpeed: 0.23, phases: [5.8, 0.5, 2.2, 2.6], lineWidth: 1.8, alpha: 0.88 },
];

/** Deep, saturated lines read against the periwinkle light gradient; the
 *  dark theme gets the brighter end of the same hues so they glow. */
const LIGHT_COLORS = ["#2f4bc4", "#6d3fd0", "#0b8bc9", "#17976a", "#4a6bff"];
const DARK_COLORS = ["#4ade80", "#22d3ee", "#818cf8", "#34d399", "#38bdf8"];

const POINT_SPACING = 6;
const MAX_POINTS = 340;
const MAX_DPR = 2;
/** How wide the cursor's pull reaches along a line, in CSS pixels. */
const PLUCK_RADIUS = 190;
/** How far a line may be dragged toward the cursor, in CSS pixels. */
const PLUCK_MAX = 34;

export class WaveFieldComponent {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private width = 0;
  private height = 0;

  private time = 0;
  private lastFrame = 0;
  private rafId: number | null = null;

  private isDark = false;
  private reducedMotion: MediaQueryList;
  private finePointer: MediaQueryList;

  /** Cursor pull: position, how far it has faded in, and its target. */
  private pointerX = 0;
  private pointerY = 0;
  private pluck = 0;
  private pluckTarget = 0;

  /** Scroll energy, decaying back to zero once the page settles. */
  private energy = 0;
  private lastScrollY = 0;

  constructor(host: HTMLElement = document.body) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "wave-field";
    this.canvas.setAttribute("aria-hidden", "true");
    host.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d")!;

    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    this.isDark = document.body.classList.contains("dark-theme");
    this.lastScrollY = window.scrollY;

    this.resize();
    this.bindEvents();
    this.start();
  }

  private bindEvents(): void {
    window.addEventListener("resize", this.onResize);
    window.addEventListener("scroll", this.onScroll, { passive: true });
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    document.addEventListener("pointerleave", this.onPointerLeave);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    this.reducedMotion.addEventListener("change", this.onMotionPreferenceChange);

    // The theme toggle only flips a class on body, so watch that class.
    const observer = new MutationObserver(() => {
      const dark = document.body.classList.contains("dark-theme");
      if (dark !== this.isDark) {
        this.isDark = dark;
        if (this.reducedMotion.matches) this.draw();
      }
    });
    observer.observe(document.body, { attributeFilter: ["class"] });
  }

  private onResize = (): void => {
    this.resize();
    if (this.reducedMotion.matches) this.draw();
  };

  private onScroll = (): void => {
    const delta = Math.abs(window.scrollY - this.lastScrollY);
    this.lastScrollY = window.scrollY;
    this.energy = Math.min(1.1, this.energy + delta * 0.006);
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.finePointer.matches) return;
    this.pointerX = event.clientX;
    this.pointerY = event.clientY;
    this.pluckTarget = 1;
  };

  private onPointerLeave = (): void => {
    this.pluckTarget = 0;
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.stop();
    } else {
      this.start();
    }
  };

  private onMotionPreferenceChange = (): void => {
    this.stop();
    this.start();
  };

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private start(): void {
    if (this.rafId !== null) return;

    // Reduced motion keeps the field, loses the movement: one still frame of
    // the same signal, so the page still reads as a sound page.
    if (this.reducedMotion.matches) {
      this.pluck = 0;
      this.energy = 0;
      this.draw();
      return;
    }

    this.lastFrame = performance.now();
    this.rafId = requestAnimationFrame(this.frame);
  }

  private stop(): void {
    if (this.rafId === null) return;
    cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  private frame = (now: number): void => {
    // A tab that comes back from the background must not fast-forward.
    const dt = Math.min((now - this.lastFrame) / 1000, 0.05);
    this.lastFrame = now;
    this.time += dt;

    this.pluck += (this.pluckTarget - this.pluck) * Math.min(1, dt * 6);
    this.energy *= Math.pow(0.12, dt);

    this.draw();
    this.rafId = requestAnimationFrame(this.frame);
  };

  /** Three summed sines, normalised to roughly -1..1. One sine looks like a
   *  test tone; three that never line up look like something playing. */
  private signal(layer: WaveLayer, x: number): number {
    const k = (Math.PI * 2) / (this.width * layer.waveLength);
    const t = this.time * layer.speed;
    const [p1, p2, p3] = layer.phases;
    return (
      Math.sin(x * k + t + p1) * 0.6 +
      Math.sin(x * k * 2.3 - t * 1.6 + p2) * 0.28 +
      Math.sin(x * k * 4.1 + t * 0.7 + p3) * 0.12
    );
  }

  /** Slow swell and fall, shaped so the quiet stretches last longer than the
   *  loud ones. A plain sine breathes too evenly to pass for audio. */
  private envelope(layer: WaveLayer): number {
    const raw = (Math.sin(this.time * layer.envSpeed + layer.phases[3]) + 1) / 2;
    return 0.32 + 0.68 * Math.pow(raw, 2.2);
  }

  private draw(): void {
    const { ctx, width, height } = this;
    ctx.clearRect(0, 0, width, height);

    const colors = this.isDark ? DARK_COLORS : LIGHT_COLORS;
    // The dark panels are translucent, so the field reads through the whole
    // page there and needs less alpha than the light theme, where only the
    // gutters ever show it.
    const lineAlpha = this.isDark ? 0.46 : 0.48;
    const glowAlpha = this.isDark ? 0.10 : 0.09;

    const step = Math.max(POINT_SPACING, width / MAX_POINTS);
    const gain = 1 + this.energy;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = 0; i < LAYERS.length; i++) {
      const layer = LAYERS[i];
      const baseY = height * layer.baseRatio;
      const amp = height * layer.ampRatio * this.envelope(layer) * gain;

      // Lines near the cursor answer it more than the ones far away, so the
      // pull reads as touching one string rather than bending the whole page.
      const pull =
        this.pluck > 0.001
          ? this.pluck * Math.exp(-Math.abs(baseY - this.pointerY) / 240)
          : 0;

      ctx.beginPath();
      for (let x = 0; x <= width + step; x += step) {
        const px = Math.min(x, width);
        let y = baseY + this.signal(layer, px) * amp;

        if (pull > 0.001) {
          const dx = px - this.pointerX;
          const falloff = Math.exp(-(dx * dx) / (2 * PLUCK_RADIUS * PLUCK_RADIUS));
          const reach = Math.max(-PLUCK_MAX, Math.min(PLUCK_MAX, this.pointerY - y));
          y += reach * falloff * pull;
        }

        if (px === 0) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
      }

      ctx.strokeStyle = colors[i % colors.length];

      // Bloom first, then the crisp line on top of it.
      ctx.globalCompositeOperation = this.isDark ? "lighter" : "source-over";
      ctx.globalAlpha = glowAlpha * layer.alpha;
      ctx.lineWidth = layer.lineWidth * 6;
      ctx.stroke();

      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = lineAlpha * layer.alpha;
      ctx.lineWidth = layer.lineWidth;
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}
