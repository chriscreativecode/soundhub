/**
 * Per-channel level meters.
 *
 * Every strip needs a meter, but eleven independent animation frames would
 * cost more than the audio does. One loop reads every registered analyser and
 * writes a single custom property per channel; the bar itself is a scaled
 * element, so the browser keeps it on the compositor.
 */

interface Meter {
  analyser: AnalyserNode;
  element: HTMLElement;
  buffer: Uint8Array;
  level: number;
}

const meters = new Set<Meter>();
let frame: number | null = null;

/** A meter that snaps up and eases down reads as level; linear reads as noise. */
const ATTACK = 0.55;
const RELEASE = 0.09;

function tick(): void {
  meters.forEach((meter) => {
    meter.analyser.getByteTimeDomainData(meter.buffer);

    let sumOfSquares = 0;
    for (let i = 0; i < meter.buffer.length; i++) {
      const sample = (meter.buffer[i] - 128) / 128;
      sumOfSquares += sample * sample;
    }

    const rms = Math.sqrt(sumOfSquares / meter.buffer.length);
    // RMS of normal programme material sits low; the curve lifts it into a
    // range where small changes are still visible.
    const target = Math.min(1, Math.pow(rms * 2.6, 0.7));
    const smoothing = target > meter.level ? ATTACK : RELEASE;
    meter.level += (target - meter.level) * smoothing;

    meter.element.style.setProperty("--level", meter.level.toFixed(3));
    meter.element.classList.toggle("is-live", meter.level > 0.01);
  });

  frame = meters.size ? requestAnimationFrame(tick) : null;
}

/**
 * Taps the given node without changing what reaches the speakers: the
 * analyser is a leaf, so nothing downstream hears it.
 */
export function attachMeter(source: AudioNode, element: HTMLElement): () => void {
  const context = source.context;
  const analyser = context.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.4;
  source.connect(analyser);

  const meter: Meter = {
    analyser,
    element,
    buffer: new Uint8Array(analyser.fftSize),
    level: 0,
  };

  meters.add(meter);
  if (frame === null) frame = requestAnimationFrame(tick);

  return () => {
    meters.delete(meter);
    try {
      source.disconnect(analyser);
    } catch {
      /* already torn down */
    }
    element.style.removeProperty("--level");
    element.classList.remove("is-live");
  };
}
