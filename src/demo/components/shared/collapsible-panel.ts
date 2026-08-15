/**
 * Shared utility for collapsible panel sections with icon rotation and
 * optional localStorage state persistence.
 */

export interface CollapsiblePanel {
  /** Opens or closes the panel from code; `persist` false leaves the saved preference alone */
  setCollapsed(collapsed: boolean, persist?: boolean): void;
  isCollapsed(): boolean;
  destroy(): void;
}

/**
 * Sets up a collapsible panel.
 *
 * @param header   The clickable header element
 * @param content  The content element that gets collapsed/expanded
 * @param options
 *   - collapsedByDefault  Whether to start collapsed (default: true)
 *   - storageKey          If provided, collapse state is persisted to localStorage
 *   - onToggle            Optional callback after each toggle
 * @returns A handle to drive the panel from code and to remove its listeners
 */
export function setupCollapsiblePanel(
  header: HTMLElement,
  content: HTMLElement,
  options?: {
    collapsedByDefault?: boolean;
    storageKey?: string;
    onToggle?: (isCollapsed: boolean) => void;
  }
): CollapsiblePanel {
  const { collapsedByDefault = true, storageKey, onToggle } = options ?? {};

  // Find the collapse button (or use any SVG in the header as rotation target)
  const button = header.querySelector(".collapse-btn") as HTMLButtonElement | null;
  const svgIcon = button?.querySelector("svg") ?? header.querySelector("svg");

  const setCollapsed = (collapsed: boolean, persist: boolean = true) => {
    content.classList.toggle("collapsed", collapsed);
    if (svgIcon) {
      svgIcon.style.transform = collapsed ? "rotate(0deg)" : "rotate(180deg)";
    }
    if (storageKey && persist) {
      try {
        localStorage.setItem(storageKey, String(collapsed));
      } catch { /* ignore */ }
    }
    onToggle?.(collapsed);
  };

  // Initial state
  let isCollapsed = collapsedByDefault;
  if (storageKey) {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "false") isCollapsed = false;
    } catch { /* ignore */ }
  }
  setCollapsed(isCollapsed, false);

  const toggle = () => {
    setCollapsed(!content.classList.contains("collapsed"));
  };

  // One handler on the header, with the button's click left to bubble into it.
  // The button used to swallow its own click to avoid a double toggle, which
  // made the one control that looks like the toggle the single spot in the
  // header that did nothing.
  header.addEventListener("click", toggle);

  return {
    setCollapsed,
    isCollapsed: () => content.classList.contains("collapsed"),
    destroy: () => header.removeEventListener("click", toggle),
  };
}
