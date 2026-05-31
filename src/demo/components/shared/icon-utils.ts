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
  | "npm";

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
};

function renderSvg(def: IconDef, size: number = 14, extraClass?: string): string {
  const style = def.style ? ` style="${def.style}"` : "";
  const transform = def.transform ? ` transform="${def.transform}"` : "";
  const fill = def.fill ? ` fill="${def.fill}"` : "";
  const stroke = def.stroke ? ` stroke="${def.stroke}"` : "";
  const strokeWidth = def.strokeWidth ? ` stroke-width="${def.strokeWidth}"` : "";
  const cls = extraClass ? ` class="${extraClass}"` : "";
  const paths = def.paths.map((d) => `          <path${d.startsWith("M") ? "" : " fill-rule=\"evenodd\""} d="${d}" ${d.startsWith("M") ? "" : "clip-rule=\"evenodd\""} />`).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg"${cls} viewBox="${def.viewBox}"${fill}${stroke}${strokeWidth} width="${size}" height="${size}"${transform}${style}>\n${paths}\n        </svg>`;
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