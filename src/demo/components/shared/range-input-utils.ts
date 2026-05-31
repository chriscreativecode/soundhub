/**
 * Shared utility for applying the `--range-progress` CSS custom property
 * to range inputs, giving them a filled track style.
 */

/**
 * Updates the `--range-progress` CSS custom property on a range input
 * based on its current value, min, and max attributes.
 */
export function updateRangeProgress(input: HTMLInputElement): void {
  const min = Number(input.min) || 0;
  const max = Number(input.max) || 1;
  const value = Number(input.value);
  const progress = ((value - min) / (max - min)) * 100;
  input.style.setProperty("--range-progress", `${progress}%`);
}

/**
 * Binds `input` events to auto-update `--range-progress` on one or more
 * range inputs.  Also initializes the property immediately.
 *
 * Returns a cleanup function that removes the event listeners.
 */
export function autoRangeProgress(
  ...inputs: (HTMLInputElement | null | undefined)[]
): () => void {
  const valid = inputs.filter((i): i is HTMLInputElement => i != null);
  if (valid.length === 0) return () => {};

  const handler = (e: Event) => updateRangeProgress(e.target as HTMLInputElement);

  valid.forEach((input) => {
    updateRangeProgress(input);
    input.addEventListener("input", handler);
  });

  return () => {
    valid.forEach((input) => input.removeEventListener("input", handler));
  };
}