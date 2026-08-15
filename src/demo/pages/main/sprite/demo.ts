import "../../../shared.css";
import "./demo.css";

declare function gtag(...args: any[]): void;

import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';

hljs.registerLanguage('typescript', typescript);

// @ts-ignore
import gameSounds from "../../../../sounds/8-bit-game-sounds.mp3";

import { AudioControllerComponent } from '../../../components/audio-controller-component/audio-controller.component';
import { EqualizerComponent } from '../../../components/equalizer-component/equalizer.component';
import { SoundManager } from '../../../../sound-manager/sound-manager';
import { SoundManagerConfig } from '../../../../sound-manager/sound-manager-config';
import { SoundEventsEnum } from '../../../../sound-manager/sound-events.enum';
import { LocalStorageManagerManager } from '../../../services/local-storage-manager';

const SPRITE_CONFIG: { [key: string]: [number, number] } = {
  nextLevel: [0, 2],
  powerUp:   [2.5, 4.5],
  jump:      [4.5, 5.5],
  fail:      [6, 8.5],
  catch:     [8.5, 9.2],
  danger:    [16.5, 18.5],
  victory:   [20.5, 22.5],
  attack:    [28, 29.5]
};

const SPRITE_META: { key: string; label: string; emoji: string }[] = [
  { key: 'nextLevel', label: 'Next Level',  emoji: '🏆' },
  { key: 'powerUp',   label: 'Power Up',    emoji: '⚡' },
  { key: 'jump',      label: 'Jump',        emoji: '🦘' },
  { key: 'fail',      label: 'Fail',        emoji: '💔' },
  { key: 'catch',     label: 'Catch',       emoji: '🎯' },
  { key: 'danger',    label: 'Danger',      emoji: '⚠️' },
  { key: 'victory',   label: 'Victory',     emoji: '🎉' },
  { key: 'attack',    label: 'Attack',      emoji: '🗡️' },
];

/** Position of a sprite key in SPRITE_META, used for the numbered badges. */
const spriteNumber = (key: string): number => SPRITE_META.findIndex(s => s.key === key) + 1;

export class SpriteDemo {
  private soundManager!: SoundManager;
  private loaded = false;
  private activeSprite: string | null = null;
  private equalizer: EqualizerComponent | null = null;

  /** Length of the whole sprite file, so the timeline can be drawn to scale. */
  private fileDuration = 0;
  private playheadRafId: number | null = null;
  /** Kept around because the waveform has to be redrawn on resize and theme change. */
  private spriteBuffer: AudioBuffer | null = null;

  constructor() {
    this.initTheme();
    this.init();
  }

  private async init(): Promise<void> {
    this.soundManager = new SoundManager({
      autoMuteOnHidden: true,
      autoResumeOnFocus: true,
      debug: false,
    });

    this.render();
    this.initAudioController();
    this.initEqualizer();
    this.setLoadingState(true);

    await this.loadAndConfigureSounds();

    this.setLoadingState(false);
    this.loaded = true;
    this.buildTimeline();
    this.buildInfoPanel();
  }

  // ── Audio visualiser ────────────────────────────────────────────────────

  private initAudioController(): void {
    const controllerEl = document.getElementById('spriteAudioController');
    if (controllerEl) {
      new AudioControllerComponent(controllerEl);
    }
  }

  private initEqualizer(): void {
    const controllerEl = document.getElementById('spriteAudioController');
    if (controllerEl) {
      const audioCtx = this.soundManager.getContext();
      const analyser = audioCtx.createAnalyser();
      this.soundManager.getMasterOutput().connect(analyser);
      this.equalizer = new EqualizerComponent(controllerEl, analyser);
    }
  }

  // ── Sound loading ───────────────────────────────────────────────────────

  private async loadAndConfigureSounds(): Promise<void> {
    await this.soundManager.loadSounds([
      { id: 'game-sounds', url: gameSounds }
    ]);

    // Set sprite configuration on the loaded sound
    this.soundManager.setSoundSprite('game-sounds', SPRITE_CONFIG);
  }

  // ── Rendering ───────────────────────────────────────────────────────────

  private render(): void {
    const container = document.getElementById('spriteContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="control-group sprite-description-panel">
        <p class="sprite-description">
          One file, eight sounds. <code>8-bit-game-sounds.mp3</code> is loaded once, and a
          <strong>sprite</strong> is nothing more than a start and an end time inside it. The
          bar below is that whole file: every numbered block is one sprite region.
        </p>
      </div>

      <div class="control-group sprite-timeline-panel">
        <div class="timeline-head">
          <span class="timeline-file">🎵 8-bit-game-sounds.mp3</span>
          <span class="timeline-length" id="timelineLength">loading…</span>
        </div>

        <div class="timeline" id="spriteTimeline">
          <canvas class="timeline__wave" id="timelineWave"></canvas>
          <div class="timeline__regions" id="timelineRegions">
            ${SPRITE_META.map(s => `
              <button class="tl-region" data-sprite="${s.key}" data-start="${SPRITE_CONFIG[s.key][0]}"
                data-end="${SPRITE_CONFIG[s.key][1]}" title="${s.emoji} ${s.label} — ${SPRITE_CONFIG[s.key][0]}s to ${SPRITE_CONFIG[s.key][1]}s" disabled>
                <span class="tl-region__fill"></span>
                <span class="tl-region__badge">${spriteNumber(s.key)}</span>
                <span class="tl-region__tag">${s.emoji} ${s.label}</span>
              </button>
            `).join('')}
            <div class="timeline__playhead" id="timelinePlayhead"></div>
          </div>
        </div>
        <div class="timeline__axis" id="timelineAxis"></div>

        <p class="timeline__legend">
          The grey stretches between the blocks are parts of the file no sprite points at.
          Play one and watch the marker travel through that region only.
        </p>
      </div>

      <div class="sprite-grid" id="spriteGrid">
        ${SPRITE_META.map(s => `
          <button class="sprite-btn" data-sprite="${s.key}" disabled>
            <span class="sprite-btn__no">${spriteNumber(s.key)}</span>
            <span class="sprite-btn__emoji">${s.emoji}</span>
            <span class="sprite-btn__label">${s.label}</span>
            <span class="sprite-btn__time">${SPRITE_CONFIG[s.key][0].toFixed(1)}s → ${SPRITE_CONFIG[s.key][1].toFixed(1)}s</span>
          </button>
        `).join('')}
      </div>
      <div class="sprite-status" id="spriteStatus">
        <span class="sprite-status__label" id="spriteStatusLabel">Click a sprite to play it</span>
      </div>
    `;

    container.querySelectorAll<HTMLButtonElement>('[data-sprite]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this.loaded) return;
        this.playSprite(btn.dataset.sprite!);
      });
    });
  }

  // ── Timeline ────────────────────────────────────────────────────────────

  /**
   * Lays the sprite regions out over the real length of the file and draws the
   * waveform behind them, so the blocks line up with what you hear.
   */
  private buildTimeline(): void {
    const buffer = this.soundManager.getBuffer('game-sounds');
    if (!buffer) return;

    this.spriteBuffer = buffer;
    this.fileDuration = buffer.duration;

    const lengthEl = document.getElementById('timelineLength');
    if (lengthEl) lengthEl.textContent = `${buffer.duration.toFixed(1)}s · ${SPRITE_META.length} sprites`;

    document.querySelectorAll<HTMLElement>('.tl-region').forEach(region => {
      const start = Number(region.dataset.start);
      const end = Number(region.dataset.end);
      region.style.left = `${(start / this.fileDuration) * 100}%`;
      region.style.width = `${((end - start) / this.fileDuration) * 100}%`;
    });

    this.buildAxis();
    this.drawWaveform(buffer);

    // The canvas is sized in device pixels, so it has to be redrawn on resize
    const timeline = document.getElementById('spriteTimeline');
    if (timeline && 'ResizeObserver' in window) {
      new ResizeObserver(() => this.drawWaveform(buffer)).observe(timeline);
    }
  }

  /** The waveform is painted with the theme's ink, so a theme flip needs a repaint. */
  private redrawWaveform(): void {
    if (this.spriteBuffer) this.drawWaveform(this.spriteBuffer);
  }

  private buildAxis(): void {
    const axis = document.getElementById('timelineAxis');
    if (!axis) return;

    const step = 5;
    const marks: string[] = [];
    for (let t = 0; t <= this.fileDuration; t += step) {
      marks.push(`<span class="timeline__tick" style="left:${(t / this.fileDuration) * 100}%">${t}s</span>`);
    }
    axis.innerHTML = marks.join('');
  }

  private drawWaveform(buffer: AudioBuffer): void {
    const canvas = document.getElementById('timelineWave') as HTMLCanvasElement | null;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const data = buffer.getChannelData(0);
    const samplesPerPixel = Math.max(1, Math.floor(data.length / rect.width));
    const mid = rect.height / 2;

    ctx.fillStyle = getComputedStyle(canvas).color;

    // One vertical bar per pixel column, spanning that column's peak range
    for (let x = 0; x < rect.width; x++) {
      let min = 1;
      let max = -1;
      const from = x * samplesPerPixel;
      const to = Math.min(from + samplesPerPixel, data.length);
      for (let i = from; i < to; i++) {
        const v = data[i];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      if (min > max) continue;
      const top = mid + min * mid;
      const height = Math.max(1, (max - min) * mid);
      ctx.fillRect(x, top, 1, height);
    }
  }

  /** Runs the marker through the region that is playing, and only that region. */
  private startPlayhead(spriteKey: string): void {
    this.stopPlayhead();

    const [start, end] = SPRITE_CONFIG[spriteKey];
    const playhead = document.getElementById('timelinePlayhead');
    const region = document.querySelector<HTMLElement>(`.tl-region[data-sprite="${spriteKey}"]`);
    const fill = region?.querySelector<HTMLElement>('.tl-region__fill');
    if (!playhead || !this.fileDuration) return;

    const ctx = this.soundManager.getContext();
    const startedAt = ctx.currentTime;
    const span = end - start;

    playhead.classList.add('is-visible');

    const step = () => {
      const elapsed = Math.min(ctx.currentTime - startedAt, span);
      const position = start + elapsed;

      playhead.style.left = `${(position / this.fileDuration) * 100}%`;
      if (fill) fill.style.width = `${(elapsed / span) * 100}%`;

      if (elapsed >= span) {
        this.stopPlayhead();
        return;
      }
      this.playheadRafId = requestAnimationFrame(step);
    };

    this.playheadRafId = requestAnimationFrame(step);
  }

  private stopPlayhead(): void {
    if (this.playheadRafId !== null) {
      cancelAnimationFrame(this.playheadRafId);
      this.playheadRafId = null;
    }
    document.getElementById('timelinePlayhead')?.classList.remove('is-visible');
    document.querySelectorAll<HTMLElement>('.tl-region__fill').forEach(f => (f.style.width = '0%'));
  }

  // ── Playback ────────────────────────────────────────────────────────────

  private playSprite(spriteKey: string): void {
    // If the same sprite is already playing, stop it first
    if (this.activeSprite && this.activeSprite === spriteKey) {
      if (this.soundManager.isPlaying(`game-sounds_${spriteKey}`)) {
        this.soundManager.stop(`game-sounds_${spriteKey}`);
        return;
      }
    }

    // Stop any currently playing sprite
    if (this.activeSprite) {
      const prevId = `game-sounds_${this.activeSprite}`;
      if (this.soundManager.isPlaying(prevId)) {
        this.soundManager.stop(prevId);
      }
    }

    // Play the sprite
    this.soundManager.playSprite('game-sounds', spriteKey, {
      createNewInstance: true,
      trackProgress: false,
    });

    this.activeSprite = spriteKey;
    this.updateUI(spriteKey);
    this.startPlayhead(spriteKey);

    gtag('event', 'sprite_play', { sprite: spriteKey, demo: 'sprite' });
  }

  private updateUI(activeSpriteKey: string | null): void {
    // Update button states
    document.querySelectorAll<HTMLButtonElement>('[data-sprite]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sprite === activeSpriteKey);
    });

    // Update status
    const statusLabel = document.getElementById('spriteStatusLabel');
    if (statusLabel) {
      if (activeSpriteKey) {
        const meta = SPRITE_META.find(s => s.key === activeSpriteKey);
        const [start, end] = SPRITE_CONFIG[activeSpriteKey];
        statusLabel.textContent = meta
          ? `▶ ${meta.emoji} ${meta.label} — playing ${start.toFixed(1)}s to ${end.toFixed(1)}s of the file`
          : `▶ Playing: ${activeSpriteKey}`;
      } else {
        statusLabel.textContent = 'Click a sprite to play it';
      }
    }
  }

  // ── Event listeners (cleanup when sprite ends) ──────────────────────────

  private setupEventListeners(): void {
    this.soundManager.addEventListener(SoundEventsEnum.ENDED, (event: any) => {
      const soundId: string = event.soundId ?? '';
      if (soundId.startsWith('game-sounds_')) {
        const spriteKey = soundId.replace('game-sounds_', '');
        if (spriteKey === this.activeSprite) {
          this.activeSprite = null;
          this.updateUI(null);
          this.stopPlayhead();
        }
      }
    });

    this.soundManager.addEventListener(SoundEventsEnum.STOPPED, (event: any) => {
      const soundId: string = event.soundId ?? '';
      if (soundId.startsWith('game-sounds_')) {
        const spriteKey = soundId.replace('game-sounds_', '');
        if (spriteKey === this.activeSprite) {
          this.activeSprite = null;
          this.updateUI(null);
          this.stopPlayhead();
        }
      }
    });
  }

  // ── Loading state ───────────────────────────────────────────────────────

  private setLoadingState(loading: boolean): void {
    const buttons = document.querySelectorAll<HTMLButtonElement>('[data-sprite]');
    buttons.forEach(btn => (btn.disabled = loading));

    const existing = document.getElementById('loadingOverlay');
    if (loading && !existing) {
      const overlay = document.createElement('div');
      overlay.id = 'loadingOverlay';
      overlay.className = 'loading-overlay';
      overlay.textContent = 'Loading game sounds…';
      document.getElementById('spriteContainer')?.appendChild(overlay);
    } else if (!loading && existing) {
      existing.remove();
      // Enable buttons after load
      document.querySelectorAll<HTMLButtonElement>('[data-sprite]').forEach(btn => {
        btn.disabled = false;
      });
      // Attach event listeners now that loading is done
      this.setupEventListeners();
    }
  }

  // ── Info panel ──────────────────────────────────────────────────────────

  private buildInfoPanel(): void {
    const infoPanel = document.getElementById('spriteInfo');
    if (!infoPanel) return;

    const codeSnippet = `import { SoundManager } from 'sound-manager-ts';

const sm = new SoundManager();

// 1️⃣ Define sprite regions: [startTime, endTime] in seconds
const spriteConfig = {
  nextLevel: [0, 2],
  powerUp:   [2.5, 4.5],
  jump:      [4.5, 5.5],
  fail:      [6, 8.5],
  catch:     [8.5, 9.2],
  danger:    [16.5, 18.5],
  victory:   [20.5, 22.5],
  attack:    [28, 29.5]
};

// 2️⃣ Load the audio file
await sm.loadSounds([
  { id: 'game-sounds', url: '8-bit-game-sounds.mp3' }
]);

// 3️⃣ Register sprites on the loaded sound
sm.setSoundSprite('game-sounds', spriteConfig);

// 4️⃣ Play any sprite by key
sm.playSprite('game-sounds', 'jump');
sm.playSprite('game-sounds', 'victory');`;

    infoPanel.innerHTML = `
      <h3>🎮 Sound Sprites</h3>
      <p>
        <strong>Sound sprites</strong> let you split a single audio file into
        multiple named regions, each defined by a <code>[startTime, endTime]</code>
        tuple in seconds. This is a common technique in game development where
        many short sound effects are packed into one audio file to reduce
        network requests and loading time.
      </p>
      <p>
        Use <code>setSoundSprite(id, spriteConfig)</code> to register the
        regions, then <code>playSprite(id, spriteKey)</code> to play any
        individual sprite. Internally, each sprite creates a separate instance
        (<code>id + "_" + spriteKey</code>) so you can control them independently.
      </p>
      <p>
        The sprite file used here contains 8 game sounds: level-up, power-up,
        jump, fail, catch, danger, victory, and attack, packed into a single
        ${this.fileDuration.toFixed(0)}-second MP3. The timeline at the top of the page is that
        file drawn to scale, so you can see each region sitting inside it.
      </p>
      <div class="info-code-block">
        <pre><code class="language-typescript">${this.escapeHtml(codeSnippet)}</code></pre>
      </div>
    `;

    const codeEl = infoPanel.querySelector<HTMLElement>('pre code');
    if (codeEl) hljs.highlightElement(codeEl);
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#039;');
  }

  // ── Theme ───────────────────────────────────────────────────────────────

  private initTheme(): void {
    const body = document.body;
    const toggle = document.getElementById('themeToggle') as HTMLInputElement | null;
    const stored = LocalStorageManagerManager.getItem('sound-manager-ts-demo-theme');
    if (!stored) {
      LocalStorageManagerManager.setItem(
        'sound-manager-ts-demo-theme',
        window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      );
    }
    const isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    body.classList.toggle('dark-theme', isDark);
    if (toggle) toggle.checked = isDark;
    if (toggle) {
      toggle.addEventListener('change', () => {
        body.classList.toggle('dark-theme', toggle.checked);
        LocalStorageManagerManager.setItem('sound-manager-ts-demo-theme', toggle.checked ? 'dark' : 'light');
        this.redrawWaveform();
      });
    }
  }
}