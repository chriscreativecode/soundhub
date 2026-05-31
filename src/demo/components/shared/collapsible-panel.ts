/**
 * Shared utility for collapsible panel sections with icon rotation and
 * optional localStorage state persistence.
 */

/**
 * Sets up a collapsible panel.
 *
 * @param header   The clickable header element
 * @param content  The content element that gets collapsed/expanded
 * @param options
 *   - collapsedByDefault  Whether to start collapsed (default: true)
 *   - storageKey          If provided, collapse state is persisted to localStorage
 *   - onToggle            Optional callback after each toggle
 * @returns A function to destroy event listeners
 */
export function setupCollapsiblePanel(
  header: HTMLElement,
  content: HTMLElement,
  options?: {
    collapsedByDefault?: boolean;
    storageKey?: string;
    onToggle?: (isCollapsed: boolean) => void;
  }
): () => void {
  const { collapsedByDefault = true, storageKey, onToggle } = options ?? {};

  // Find the collapse button (or use any SVG in the header as rotation target)
  const button = header.querySelector(".collapse-btn") as HTMLButtonElement | null;
  const svgIcon = button?.querySelector("svg") ?? header.querySelector("svg");

  const setCollapsed = (collapsed: boolean) => {
    content.classList.toggle("collapsed", collapsed);
    if (svgIcon) {
      svgIcon.style.transform = collapsed ? "rotate(0deg)" : "rotate(180deg)";
    }
    if (storageKey) {
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
  setCollapsed(isCollapsed);

  const toggle = () => {
    const next = !content.classList.contains("collapsed");
    setCollapsed(next);
  };

  header.addEventListener("click", toggle);

  // Prevent double-trigger when clicking the button directly
  if (button) {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  return () => {
    header.removeEventListener("click", toggle);
  };
}