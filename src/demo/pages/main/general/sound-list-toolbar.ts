import { svgIcon } from "../../../components/shared/icon-utils";
import { CATEGORY_META, SoundCategory } from "./sound-catalog";

export type CategoryFilter = SoundCategory | "all";

export interface ToolbarState {
  query: string;
  category: CategoryFilter;
}

/**
 * Header for the channel list: what is loaded, what is running, and the two
 * ways of cutting the list down. Eleven strips are scannable; the filter is
 * for when a visitor already knows they only came for the ambience beds.
 */
export class SoundListToolbar {
  private root: HTMLElement;
  private searchInput!: HTMLInputElement;
  private clearButton!: HTMLButtonElement;
  private playingCount!: HTMLElement;
  private resultCount!: HTMLElement;
  private bulkButton!: HTMLButtonElement;

  /** What the list is doing now, which decides what the one bulk button offers. */
  private bulkExpanded = false;

  private state: ToolbarState = { query: "", category: "all" };

  constructor(
    container: HTMLElement,
    private counts: Record<CategoryFilter, number>,
    private onChange: (state: ToolbarState) => void,
    private onExpandAll: (expanded: boolean) => void
  ) {
    this.root = container;
    this.render();
    this.bind();
  }

  public setResultCount(visible: number, total: number): void {
    this.resultCount.textContent =
      visible === total ? `${total} sounds` : `${visible} of ${total} sounds`;
  }

  public setPlayingCount(count: number): void {
    this.playingCount.textContent = count === 1 ? "1 playing" : `${count} playing`;
    this.playingCount.classList.toggle("is-live", count > 0);
  }

  public focusSearch(): void {
    this.searchInput.focus();
    this.searchInput.select();
  }

  /**
   * Keeps the single bulk button honest. Everything open means the only useful
   * offer left is to close it again, and a strip opened by hand counts too.
   */
  public setBulkExpanded(expanded: boolean): void {
    if (this.bulkExpanded === expanded) return;
    this.bulkExpanded = expanded;
    this.renderBulkButton();
  }

  private render(): void {
    const chips = (["all", "ambience", "music", "voice", "game"] as CategoryFilter[])
      .filter((key) => key === "all" || this.counts[key] > 0)
      .map((key) => {
        const label = key === "all" ? "All" : CATEGORY_META[key as SoundCategory].label;
        const icon = key === "all" ? "" : svgIcon(CATEGORY_META[key as SoundCategory].icon, 13);
        return `
          <button type="button" class="chip ${key === "all" ? "is-active" : ""}"
                  data-category="${key}" aria-pressed="${key === "all"}">
            ${icon}<span>${label}</span><span class="chip__count">${this.counts[key] ?? 0}</span>
          </button>`;
      })
      .join("");

    this.root.innerHTML = `
      <div class="list-toolbar">
        <div class="list-toolbar__lead">
          <h2 class="list-toolbar__title">Channels</h2>
          <div class="list-toolbar__status">
            <span class="list-toolbar__result" data-result>0 sounds</span>
            <span class="list-toolbar__playing" data-playing>0 playing</span>
          </div>
        </div>

        <div class="list-toolbar__search">
          <span class="list-toolbar__search-icon">${svgIcon("search", 15)}</span>
          <input type="search" class="list-toolbar__input" data-search placeholder="Search sounds"
                 aria-label="Search sounds by name or id" autocomplete="off" spellcheck="false" />
          <button type="button" class="list-toolbar__clear" data-clear hidden aria-label="Clear search">
            ${svgIcon("close", 13)}
          </button>
        </div>

        <div class="list-toolbar__chips" role="group" aria-label="Filter by family">${chips}</div>

        <div class="list-toolbar__bulk">
          <button type="button" class="bulk-button" data-bulk-toggle></button>
        </div>
      </div>`;

    this.searchInput = this.root.querySelector("[data-search]")!;
    this.clearButton = this.root.querySelector("[data-clear]")!;
    this.playingCount = this.root.querySelector("[data-playing]")!;
    this.resultCount = this.root.querySelector("[data-result]")!;
    this.bulkButton = this.root.querySelector("[data-bulk-toggle]")!;
    this.renderBulkButton();
  }

  /** One button that swaps sides, rather than two where one is always a no-op. */
  private renderBulkButton(): void {
    const label = this.bulkExpanded ? "Collapse all" : "Expand all";
    this.bulkButton.innerHTML = `${svgIcon(this.bulkExpanded ? "collapse-all" : "expand-all", 14)}<span>${label}</span>`;
    this.bulkButton.title = label;
    this.bulkButton.setAttribute("aria-label", label);
  }

  private bind(): void {
    this.searchInput.addEventListener("input", () => {
      this.state.query = this.searchInput.value.trim();
      this.clearButton.hidden = this.state.query.length === 0;
      this.onChange({ ...this.state });
    });

    this.searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.searchInput.value) {
        event.stopPropagation();
        this.resetSearch();
      }
    });

    this.clearButton.addEventListener("click", () => {
      this.resetSearch();
      this.searchInput.focus();
    });

    this.root.querySelectorAll<HTMLButtonElement>("[data-category]").forEach((chip) => {
      chip.addEventListener("click", () => {
        this.state.category = chip.dataset.category as CategoryFilter;
        this.root.querySelectorAll<HTMLButtonElement>("[data-category]").forEach((other) => {
          const active = other === chip;
          other.classList.toggle("is-active", active);
          other.setAttribute("aria-pressed", String(active));
        });
        this.onChange({ ...this.state });
      });
    });

    this.bulkButton.addEventListener("click", () => {
      const expand = !this.bulkExpanded;
      this.onExpandAll(expand);
      this.setBulkExpanded(expand);
    });
  }

  private resetSearch(): void {
    this.searchInput.value = "";
    this.state.query = "";
    this.clearButton.hidden = true;
    this.onChange({ ...this.state });
  }
}
