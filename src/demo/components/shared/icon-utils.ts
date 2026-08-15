/**
 * Shared SVG icon utilities for the demo.
 * All icons are Heroicons-style at 14x14 unless otherwise specified.
 */

export type IconName =
  | "play"
  | "pause"
  | "stop"
  | "mute"
  | "unmute"
  | "fade-in"
  | "fade-out"
  | "reset"
  | "collapse"
  | "close"
  | "music-note"
  | "sprite"
  | "docs"
  | "npm"
  // Soundscape scenes
  | "cloud-rain"
  | "flame"
  | "waves"
  | "sunrise"
  // Console dock, toolbar and help
  | "code"
  | "pulse"
  | "keyboard"
  | "copy"
  | "check"
  | "search"
  | "trash"
  | "help"
  | "expand-all"
  | "collapse-all";

interface IconDef {
  viewBox: string;
  paths: string[];
  fill?: "currentColor" | "none";
  stroke?: string;
  strokeWidth?: string;
  style?: string;
  transform?: string;
}

const ICONS: Record<IconName, IconDef> = {
  play: {
    viewBox: "0 0 24 24",
    fill: "currentColor",
    paths: [
      'M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z',
    ],
  },
  pause: {
    viewBox: "0 0 24 24",
    fill: "currentColor",
    paths: [
      'M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z',
    ],
  },
  stop: {
    viewBox: "0 0 24 24",
    fill: "currentColor",
    paths: [
      'M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z',
    ],
  },
  mute: {
    viewBox: "0 0 24 24",
    fill: "currentColor",
    paths: [
      'M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06Z',
      'M17.78 9.22a.75.75 0 1 0-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 1 0 1.06-1.06L20.56 12l1.72-1.72a.75.75 0 1 0-1.06-1.06l-1.72 1.72-1.72-1.72Z',
    ],
  },
  unmute: {
    viewBox: "0 0 24 24",
    fill: "currentColor",
    paths: [
      'M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z',
      'M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z',
    ],
  },
  "fade-in": {
    viewBox: "0 0 24 24",
    fill: "currentColor",
    paths: [
      'M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75ZM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 0 1-1.875-1.875V8.625ZM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 0 1 3 19.875v-6.75Z',
    ],
  },
  "fade-out": {
    viewBox: "0 0 24 24",
    fill: "currentColor",
    style: "transform: scaleX(-1)",
    paths: [
      'M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75ZM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 0 1-1.875-1.875V8.625ZM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 0 1 3 19.875v-6.75Z',
    ],
  },
  reset: {
    viewBox: "0 0 24 24",
    fill: "currentColor",
    paths: [
      'M4.755 10.059a7.5 7.5 0 0 1 12.548-3.364l1.903 1.903h-3.183a.75.75 0 1 0 0 1.5h4.992a.75.75 0 0 0 .75-.75V4.356a.75.75 0 0 0-1.5 0v3.18l-1.9-1.9A9 9 0 0 0 3.306 9.67a.75.75 0 1 0 1.45.388Zm15.408 3.352a.75.75 0 0 0-.919.53 7.5 7.5 0 0 1-12.548 3.364l-1.902-1.903h3.183a.75.75 0 0 0 0-1.5H2.984a.75.75 0 0 0-.75.75v4.992a.75.75 0 0 0 1.5 0v-3.18l1.9 1.9a9 9 0 0 0 15.059-4.035.75.75 0 0 0-.53-.918Z',
    ],
  },
  collapse: {
    viewBox: "0 0 24 24",
    fill: "currentColor",
    paths: [
      'M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z',
    ],
  },
  close: {
    viewBox: "0 0 24 24",
    fill: "currentColor",
    paths: [
      'M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z',
    ],
  },
  "music-note": {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    paths: [
      'm9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z',
    ],
  },
  sprite: {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    paths: [
      'M3 12h2',
      'M7 9v6',
      'M11 6v12',
      'M15 9v6',
      'M19 12h2',
      'M4 4h16v16H4z',
    ],
  },
  docs: {
    viewBox: "0 0 24 24",
    fill: "currentColor",
    paths: [
      'M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z',
    ],
  },
  npm: {
    viewBox: "0 0 24 24",
    fill: "currentColor",
    paths: [
      'M12 1.5a.75.75 0 01.75.75v2.25h9a.75.75 0 01.75.75v12a.75.75 0 01-.75.75H1.5a.75.75 0 01-.75-.75v-12a.75.75 0 01.75-.75h9V2.25A.75.75 0 0112 1.5z',
    ],
  },

  /* ---------------------------------------------------------------
   * Soundscape scenes. Drawn in the same 24x24 grid and 1.7 stroke as
   * the rest of the outline set, so a scene button and a transport
   * button read as one icon family.
   * ------------------------------------------------------------- */
  "cloud-rain": {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.7",
    paths: [
      'M4 14.9A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.24',
      'M16 14v6',
      'M8 14v6',
      'M12 16v6',
    ],
  },
  flame: {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.7",
    paths: [
      'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5Z',
    ],
  },
  waves: {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.7",
    paths: [
      'M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1',
      'M2 12c.6.5 1.2 1 2.5 1C7 13 7 11 9.5 11c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1',
      'M2 18c.6.5 1.2 1 2.5 1C7 19 7 17 9.5 17c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1',
    ],
  },
  sunrise: {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.7",
    paths: [
      'M12 2v8',
      'M4.93 10.93l1.41 1.41',
      'M2 18h2',
      'M20 18h2',
      'M19.07 10.93l-1.41 1.41',
      'M22 22H2',
      'M8 6l4-4 4 4',
      'M16 18a4 4 0 0 0-8 0',
    ],
  },

  /* ---------------------------------------------------------------
   * Console dock, list toolbar and help
   * ------------------------------------------------------------- */
  code: {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.7",
    paths: [
      'M16 18l6-6-6-6',
      'M8 6l-6 6 6 6',
    ],
  },
  pulse: {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.7",
    paths: [
      'M22 12h-3.5l-2.5 7-6-16-2.5 9H2',
    ],
  },
  keyboard: {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.7",
    paths: [
      'M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
      'M6 9h.01',
      'M10 9h.01',
      'M14 9h.01',
      'M18 9h.01',
      'M8 15h8',
    ],
  },
  copy: {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.7",
    paths: [
      'M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2',
      'M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z',
    ],
  },
  check: {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    paths: [
      'M20 6L9 17l-5-5',
    ],
  },
  search: {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.9",
    paths: [
      'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z',
      'M21 21l-4.3-4.3',
    ],
  },
  trash: {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.7",
    paths: [
      'M3 6h18',
      'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
      'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
    ],
  },
  help: {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    paths: [
      'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
      'M9.1 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3',
      'M12 17h.01',
    ],
  },
  "expand-all": {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.9",
    paths: [
      'M8 4l4 4 4-4',
      'M16 20l-4-4-4 4',
    ],
  },
  "collapse-all": {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.9",
    paths: [
      'M8 9l4-4 4 4',
      'M16 15l-4 4-4-4',
    ],
  },
};

function renderSvg(def: IconDef, size: number = 14, extraClass?: string): string {
  const style = def.style ? ` style="${def.style}"` : "";
  const transform = def.transform ? ` transform="${def.transform}"` : "";
  const fill = def.fill ? ` fill="${def.fill}"` : "";
  const stroke = def.stroke ? ` stroke="${def.stroke}"` : "";
  const strokeWidth = def.strokeWidth ? ` stroke-width="${def.strokeWidth}"` : "";
  // Outline icons only look like one family when the joins match, so every
  // stroked icon gets round caps rather than the SVG default butt end.
  const lineStyle = def.stroke ? ` stroke-linecap="round" stroke-linejoin="round"` : "";
  const cls = extraClass ? ` class="${extraClass}"` : "";
  const paths = def.paths.map((d) => `          <path${d.startsWith("M") ? "" : " fill-rule=\"evenodd\""} d="${d}" ${d.startsWith("M") ? "" : "clip-rule=\"evenodd\""} />`).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg"${cls} viewBox="${def.viewBox}"${fill}${stroke}${strokeWidth}${lineStyle} width="${size}" height="${size}"${transform}${style} aria-hidden="true" focusable="false">\n${paths}\n        </svg>`;
}

/**
 * Returns a raw SVG string for the given icon name.
 * @param name  The icon identifier
 * @param size  Width/height in px (default 14)
 * @param extraClass  Optional CSS class to add to the <svg> element
 */
export function svgIcon(name: IconName, size: number = 14, extraClass?: string): string {
  const def = ICONS[name];
  if (!def) {
    console.warn(`Unknown icon "${name}"`);
    return "";
  }
  return renderSvg(def, size, extraClass);
}

/**
 * Returns an inline SVG string for an icon-button (includes wrapping SVG).
 * Convenience wrapper for the common case.
 */
export function iconButtonSvg(name: IconName): string {
  return svgIcon(name);
}