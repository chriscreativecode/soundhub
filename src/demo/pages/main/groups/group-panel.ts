/**
 * Live view of one sound group: which instances are playing right now, how much
 * room is left before maxInstances kicks in, and which instance got cut off.
 */

export interface PanelVoice {
  id: string;
  label: string;
  duration: number;
}

export interface GroupPanelSound {
  id: string;
  label: string;
  emoji: string;
}

export interface GroupPanelOptions {
  groupId: string;
  title: string;
  note: string;
  color: string;
  max: number;
  limitRange?: [number, number];
  sounds?: GroupPanelSound[];
  showLog?: boolean;
  compact?: boolean;
  onPlay?(soundId: string): void;
  onStopAll?(): void;
  onMaxChange?(max: number): void;
}

interface ActiveVoice extends PanelVoice {
  startedAt: number;
}

export class GroupPanel {
  readonly el: HTMLElement;

  private readonly options: GroupPanelOptions;
  private max: number;
  private voices: ActiveVoice[] = [];
  private evicted = new Set<string>();

  private rackEl!: HTMLElement;
  private slotsEl!: HTMLElement;
  private countEl!: HTMLElement;
  private maxEl!: HTMLElement;
  private limitEl: HTMLElement | null = null;
  private logEl: HTMLElement | null = null;

  constructor(options: GroupPanelOptions) {
    this.options = options;
    this.max = options.max;
    this.el = document.createElement('div');
    this.el.className = `group-panel${options.compact ? ' group-panel--compact' : ''}`;
    this.el.style.setProperty('--gp-color', options.color);
    this.build();
  }

  // ── DOM ────────────────────────────────────────────────────────────────────

  private build(): void {
    const { groupId, title, note, sounds, showLog, compact, limitRange } = this.options;
    const [minLimit, maxLimit] = limitRange ?? [1, 6];

    const soundButtons = (sounds ?? [])
      .map(sound => `
        <button class="voice-btn" type="button" data-play="${sound.id}" disabled>
          <span class="voice-btn__emoji">${sound.emoji}</span>${sound.label}
        </button>`)
      .join('');

    this.el.innerHTML = `
      <div class="group-panel__head">
        <div class="group-panel__id">
          <span class="group-panel__dot"></span>
          <code class="group-panel__name">${groupId}</code>
          <span class="group-panel__title">${title}</span>
        </div>
        <span class="group-panel__count"><b data-count>0</b> / <span data-max>${this.max}</span> voices</span>
      </div>
      <p class="group-panel__note">${note}</p>
      <div class="voice-rack" data-rack><div class="voice-rack__slots" data-slots></div></div>
      <div class="group-panel__limit">
        <code>maxInstances</code>
        <div class="limit-stepper">
          <button type="button" data-delta="-1" aria-label="Lower the limit">&minus;</button>
          <output data-limit>${this.max}</output>
          <button type="button" data-delta="1" aria-label="Raise the limit">+</button>
        </div>
        <span class="group-panel__limit-hint">min ${minLimit}, max ${maxLimit}</span>
      </div>
      ${soundButtons ? `<div class="voice-buttons">${soundButtons}</div>` : ''}
      ${compact ? '' : '<button class="stop-group-btn" type="button" data-stop>Stop every voice in this group</button>'}
      ${showLog ? '<ul class="group-log" data-log></ul>' : ''}
    `;

    this.rackEl = this.el.querySelector('[data-rack]')!;
    this.slotsEl = this.el.querySelector('[data-slots]')!;
    this.countEl = this.el.querySelector('[data-count]')!;
    this.maxEl = this.el.querySelector('[data-max]')!;
    this.limitEl = this.el.querySelector('[data-limit]');
    this.logEl = this.el.querySelector('[data-log]');

    this.el.querySelectorAll<HTMLButtonElement>('[data-delta]').forEach(button => {
      button.addEventListener('click', () => {
        const next = Math.min(maxLimit, Math.max(minLimit, this.max + Number(button.dataset.delta)));
        if (next === this.max) return;
        this.setMax(next);
        this.options.onMaxChange?.(next);
        this.pushLog('limit', `maxInstances set to ${next}`);
      });
    });

    this.el.querySelectorAll<HTMLButtonElement>('[data-play]').forEach(button => {
      button.addEventListener('click', () => this.options.onPlay?.(button.dataset.play!));
    });

    this.el.querySelector<HTMLButtonElement>('[data-stop]')
      ?.addEventListener('click', () => this.options.onStopAll?.());

    if (this.logEl) {
      this.logEl.innerHTML = '<li class="group-log__line group-log__line--idle">waiting for the first play()</li>';
    }

    this.renderRack();
  }

  setSoundsEnabled(enabled: boolean): void {
    this.el.querySelectorAll<HTMLButtonElement>('[data-play]').forEach(button => {
      button.disabled = !enabled;
    });
  }

  // ── State ──────────────────────────────────────────────────────────────────

  setMax(max: number): void {
    this.max = max;
    this.maxEl.textContent = String(max);
    if (this.limitEl) this.limitEl.textContent = String(max);
    this.renderRack();
  }

  addVoice(voice: PanelVoice): void {
    this.voices.push({ ...voice, startedAt: performance.now() });
    this.renderRack();
    this.pushLog('play', `play('${voice.label}') &rarr; ${voice.id}`);
  }

  /** Called just before SoundManager stops the oldest instance to free a slot. */
  markEvicted(instanceId: string): void {
    this.evicted.add(instanceId);
    const voice = this.voices.find(v => v.id === instanceId);
    this.showEvictionFlash(voice?.id ?? instanceId);
    this.pushLog('evict', `limit reached, stopped ${voice?.id ?? instanceId}`);
  }

  removeVoice(instanceId: string): void {
    const before = this.voices.length;
    this.voices = this.voices.filter(voice => voice.id !== instanceId);
    if (this.voices.length === before) return;

    if (this.evicted.has(instanceId)) {
      this.evicted.delete(instanceId);
    } else {
      this.pushLog('end', `${instanceId} finished, slot free`);
    }
    this.renderRack();
  }

  clear(): void {
    this.voices = [];
    this.evicted.clear();
    this.renderRack();
  }

  /** Drains the lifetime bar of every playing voice. */
  tick(now: number): void {
    const slots = this.slotsEl.children;
    for (let i = 0; i < this.voices.length && i < slots.length; i++) {
      const voice = this.voices[i];
      const elapsed = (now - voice.startedAt) / 1000;
      const left = Math.max(0, 1 - elapsed / voice.duration);
      (slots[i] as HTMLElement).style.setProperty('--voice-left', `${(left * 100).toFixed(1)}%`);
    }
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  private renderRack(): void {
    const slots: string[] = [];
    for (let i = 0; i < this.max; i++) {
      const voice = this.voices[i];
      if (voice) {
        const age = i === 0 && this.voices.length > 1 ? '<span class="voice-slot__age">oldest</span>' : '';
        slots.push(`
          <div class="voice-slot is-active" style="--voice-left:100%">
            <span class="voice-slot__label">${voice.id.replace(/^sfx-/, '')}</span>
            ${age}
            <span class="voice-slot__bar"></span>
          </div>`);
      } else {
        slots.push('<div class="voice-slot"><span class="voice-slot__label">free</span></div>');
      }
    }
    this.slotsEl.innerHTML = slots.join('');
    this.countEl.textContent = String(Math.min(this.voices.length, this.max));
    this.el.classList.toggle('is-full', this.voices.length >= this.max);
  }

  private showEvictionFlash(label: string): void {
    const flash = document.createElement('div');
    flash.className = 'evict-flash';
    flash.innerHTML = `<span class="evict-flash__mark">&#10005;</span>${label}`;
    this.rackEl.appendChild(flash);
    setTimeout(() => flash.remove(), 900);
  }

  private pushLog(kind: 'play' | 'evict' | 'end' | 'limit' | 'stop', message: string): void {
    if (!this.logEl) return;
    this.logEl.querySelector('.group-log__line--idle')?.remove();
    const line = document.createElement('li');
    line.className = `group-log__line group-log__line--${kind}`;
    line.innerHTML = message;
    this.logEl.prepend(line);
    while (this.logEl.children.length > 5) this.logEl.lastElementChild!.remove();
  }

  logStopAll(count: number): void {
    this.pushLog('stop', `stopped ${count} voice${count === 1 ? '' : 's'} in this group`);
  }
}
