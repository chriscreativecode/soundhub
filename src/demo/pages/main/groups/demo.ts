import "../../../shared.css";
import "./demo.css";

import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';

hljs.registerLanguage('typescript', typescript);

import { AudioControllerComponent } from '../../../components/audio-controller-component/audio-controller.component';
import { EqualizerComponent } from '../../../components/equalizer-component/equalizer.component';
import { SoundManager } from '../../../../sound-manager/sound-manager';
import { SoundEventsEnum } from '../../../../sound-manager/sound-events.enum';
import { LocalStorageManagerManager } from '../../../services/local-storage-manager';
import { GroupPanel, GroupPanelSound } from './group-panel';
import { ArcadeGame, GameState, GroupUsage } from './arcade-game';
import { GAME_SOUNDS, LAB_SOUNDS, renderRecipe, soundDuration } from './sound-bank';

interface GroupConfig {
  id: string;
  title: string;
  note: string;
  color: string;
  max: number;
  limitRange: [number, number];
  sounds?: GroupPanelSound[];
  compact?: boolean;
  showLog?: boolean;
}

const labSound = (id: string): GroupPanelSound => {
  const recipe = LAB_SOUNDS.find(sound => sound.id === id)!;
  return { id: recipe.id, label: recipe.label, emoji: recipe.emoji };
};

const LAB_GROUPS: GroupConfig[] = [
  {
    id: 'effects',
    title: 'Short effects',
    note: 'Fast, stacking sounds. Two at a time is plenty.',
    color: '#8b5cf6',
    max: 2,
    limitRange: [1, 6],
    sounds: ['laser', 'blip', 'pop', 'ping'].map(labSound),
    showLog: true,
  },
  {
    id: 'ambient',
    title: 'Long pads',
    note: 'Slow tones that hold for seconds, so slots stay busy.',
    color: '#10b981',
    max: 3,
    limitRange: [1, 6],
    sounds: ['drone', 'mid-tone', 'high-pad'].map(labSound),
    showLog: true,
  },
];

const GAME_GROUPS: GroupConfig[] = [
  {
    id: 'weapons',
    title: 'Laser shots',
    note: 'Set this to 1 and rapid fire turns into a stutter.',
    color: '#ffd83d',
    max: 3,
    limitRange: [1, 8],
    compact: true,
  },
  {
    id: 'impacts',
    title: 'Explosions',
    note: 'Invaders blowing up, shields crumbling and your ship taking a hit.',
    color: '#ff5555',
    max: 4,
    limitRange: [1, 8],
    compact: true,
  },
  {
    id: 'alerts',
    title: 'Alarms and jingles',
    note: 'One at a time, so a jingle never doubles up.',
    color: '#55ffff',
    max: 1,
    limitRange: [1, 3],
    compact: true,
  },
];

const GAME_SOUND_GROUP: Record<string, string> = {
  'sfx-laser': 'weapons',
  'sfx-boom': 'impacts',
  'sfx-hit': 'impacts',
  'sfx-shield': 'impacts',
  'sfx-alarm': 'alerts',
  'sfx-wave': 'alerts',
  'sfx-over': 'alerts',
  'sfx-blip': 'alerts',
};

export class GroupsDemo {
  private soundManager!: SoundManager;
  private panels = new Map<string, GroupPanel>();
  private instanceGroup = new Map<string, string>();
  private blobUrls: string[] = [];
  private game: ArcadeGame | null = null;
  private equalizer: EqualizerComponent | null = null;
  private loaded = false;

  constructor() {
    this.initTheme();
    void this.init();
  }

  private async init(): Promise<void> {
    this.soundManager = new SoundManager({
      autoMuteOnHidden: true,
      autoResumeOnFocus: true,
      debug: false,
    });

    for (const group of [...LAB_GROUPS, ...GAME_GROUPS]) {
      this.soundManager.createSoundGroup(group.id, { maxInstances: group.max });
    }

    this.buildLab();
    this.buildArcade();
    this.initAudioController();
    this.initEqualizer();
    this.setupEventListeners();
    this.startTicker();

    await this.loadSounds();

    this.loaded = true;
    this.panels.forEach(panel => panel.setSoundsEnabled(true));
    this.game?.setReady(true);
    this.buildInfoPanel();
  }

  // ── Sounds ─────────────────────────────────────────────────────────────────

  private async loadSounds(): Promise<void> {
    const sounds: { id: string; url: string }[] = [];
    for (const recipe of [...LAB_SOUNDS, ...GAME_SOUNDS]) {
      const url = await renderRecipe(recipe);
      this.blobUrls.push(url);
      sounds.push({ id: recipe.id, url });
    }
    await this.soundManager.loadSounds(sounds);
  }

  /**
   * The one call this whole page is about. SoundManager stops the oldest
   * instance itself once the group is full; the panel is told first so the UI
   * can point at the voice that is about to go.
   */
  private playInGroup(soundId: string, groupId: string): void {
    if (!this.loaded) return;

    const group = this.soundManager.getGroup(groupId);
    const panel = this.panels.get(groupId);
    if (group?.maxInstances && group.sounds.size >= group.maxInstances) {
      panel?.markEvicted([...group.sounds][0]);
    }

    const instance = this.soundManager.play(soundId, { createNewInstance: true, groupId });
    if (!instance) return;

    this.instanceGroup.set(instance.id, groupId);
    panel?.addVoice({ id: instance.id, label: soundId, duration: soundDuration(soundId) });
  }

  private stopGroup(groupId: string): void {
    const group = this.soundManager.getGroup(groupId);
    if (!group) return;
    const ids = [...group.sounds];
    ids.forEach(id => this.soundManager.stop(id));
    this.panels.get(groupId)?.logStopAll(ids.length);
  }

  private setupEventListeners(): void {
    const done = (event: { soundId?: string; instanceId?: string }) => {
      const instanceId = event.instanceId ?? event.soundId;
      if (!instanceId) return;
      const groupId = this.instanceGroup.get(instanceId);
      if (!groupId) return;
      this.soundManager.removeFromSoundGroup(groupId, instanceId);
      this.instanceGroup.delete(instanceId);
      this.panels.get(groupId)?.removeVoice(instanceId);
    };

    this.soundManager.addEventListener(SoundEventsEnum.ENDED, done as never);
    this.soundManager.addEventListener(SoundEventsEnum.STOPPED, done as never);
  }

  private startTicker(): void {
    const tick = (now: number) => {
      this.panels.forEach(panel => panel.tick(now));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ── Voice lab ──────────────────────────────────────────────────────────────

  private buildLab(): void {
    const host = document.getElementById('voiceLab');
    if (!host) return;

    for (const config of LAB_GROUPS) {
      const panel = this.createPanel(config);
      this.panels.set(config.id, panel);
      host.appendChild(panel.el);
    }
  }

  private createPanel(config: GroupConfig): GroupPanel {
    return new GroupPanel({
      groupId: config.id,
      title: config.title,
      note: config.note,
      color: config.color,
      max: config.max,
      limitRange: config.limitRange,
      sounds: config.sounds,
      showLog: config.showLog,
      compact: config.compact,
      onPlay: soundId => this.playInGroup(soundId, config.id),
      onStopAll: () => this.stopGroup(config.id),
      onMaxChange: max => {
        const group = this.soundManager.getGroup(config.id);
        if (group) group.maxInstances = max;
      },
    });
  }

  // ── Arcade ─────────────────────────────────────────────────────────────────

  private buildArcade(): void {
    const host = document.getElementById('arcade');
    if (!host) return;

    host.innerHTML = `
      <div class="section-head">
        <h2 class="section-title">Audio Invaders</h2>
        <p class="section-sub">
          A tiny DOS-era shooter wired to three groups. Fire fast and the weapons group runs out of
          slots, exactly like the lab above.
        </p>
      </div>
      <div class="arcade__body">
        <div class="arcade__screen">
          <div class="crt">
            <canvas class="crt__canvas" id="arcadeCanvas" width="320" height="200"
              aria-label="Audio Invaders arcade game"></canvas>
            <div class="crt__scanlines" aria-hidden="true"></div>
          </div>
          <div class="arcade__controls">
            <button class="pad-btn" type="button" data-pad="left" aria-label="Move left">&#9664;</button>
            <button class="pad-btn" type="button" data-pad="right" aria-label="Move right">&#9654;</button>
            <button class="pad-btn pad-btn--fire" type="button" data-pad="fire">FIRE</button>
            <button class="pad-btn pad-btn--wide" type="button" data-start>Start / Pause</button>
          </div>
          <p class="arcade__keys">
            <kbd>&larr;</kbd><kbd>&rarr;</kbd> or <kbd>A</kbd><kbd>D</kbd> move,
            <kbd>Space</kbd> fire, <kbd>P</kbd> pause, <kbd>Enter</kbd> start.
            Click the screen first so the game gets your keys.
          </p>
        </div>
        <div class="arcade__side" id="arcadeGroups"></div>
      </div>
    `;

    const canvas = host.querySelector<HTMLCanvasElement>('#arcadeCanvas')!;
    const side = host.querySelector<HTMLElement>('#arcadeGroups')!;

    for (const config of GAME_GROUPS) {
      const panel = this.createPanel(config);
      this.panels.set(config.id, panel);
      side.appendChild(panel.el);
    }

    this.game = new ArcadeGame(canvas, {
      play: soundId => this.playInGroup(soundId, GAME_SOUND_GROUP[soundId] ?? 'alerts'),
      stopCombatGroups: () => {
        this.stopGroup('weapons');
        this.stopGroup('impacts');
      },
      usage: () => this.groupUsage(),
      onState: (state: GameState) => host.classList.toggle('is-playing', state === 'playing'),
    });

    host.querySelectorAll<HTMLButtonElement>('[data-pad]').forEach(button => {
      const key = button.dataset.pad as 'left' | 'right' | 'fire';
      const set = (down: boolean) => (event: Event) => {
        event.preventDefault();
        this.game?.setVirtualKey(key, down);
      };
      button.addEventListener('pointerdown', set(true));
      button.addEventListener('pointerup', set(false));
      button.addEventListener('pointerleave', set(false));
      button.addEventListener('pointercancel', set(false));
    });

    host.querySelector<HTMLButtonElement>('[data-start]')?.addEventListener('click', () => {
      if (this.game?.getState() === 'playing') this.game.togglePause();
      else this.game?.startOrResume();
    });
  }

  private groupUsage(): GroupUsage[] {
    return GAME_GROUPS.map(config => {
      const group = this.soundManager.getGroup(config.id);
      return {
        label: config.id,
        used: group?.sounds.size ?? 0,
        max: group?.maxInstances ?? config.max,
        color: config.color,
      };
    });
  }

  // ── Chrome ─────────────────────────────────────────────────────────────────

  private initAudioController(): void {
    const controllerEl = document.getElementById('groupsAudioController');
    if (!controllerEl) return;
    new AudioControllerComponent(controllerEl, { waveFillColors: ['#10b981', '#8b5cf6'] });
  }

  private initEqualizer(): void {
    const controllerEl = document.getElementById('groupsAudioController');
    if (!controllerEl) return;
    const analyser = this.soundManager.getContext().createAnalyser();
    this.soundManager.getMasterOutput().connect(analyser);
    this.equalizer = new EqualizerComponent(controllerEl, analyser);
  }

  private buildInfoPanel(): void {
    const infoPanel = document.getElementById('groupsInfo');
    if (!infoPanel) return;

    const codeSnippet = `import { SoundManager, SoundEventsEnum } from 'sound-manager-ts';

const sm = new SoundManager();

// A group per kind of sound, each with its own voice limit
sm.createSoundGroup('weapons', { maxInstances: 3 });
sm.createSoundGroup('impacts', { maxInstances: 4 });

await sm.loadSounds([
  { id: 'laser', url: '/sounds/laser.wav' },
  { id: 'boom', url: '/sounds/boom.wav' },
]);

// Remember which group an instance went into
const live = new Map<string, string>();

function fire() {
  // Every shot is its own instance. Once 3 of them are playing,
  // SoundManager stops the oldest to make room for this one.
  const shot = sm.play('laser', { createNewInstance: true, groupId: 'weapons' });
  if (shot) live.set(shot.id, 'weapons');
}

// Give the slot back when an instance finishes
sm.addEventListener(SoundEventsEnum.ENDED, (event) => {
  const groupId = live.get(event.instanceId);
  if (!groupId) return;
  sm.removeFromSoundGroup(groupId, event.instanceId);
  live.delete(event.instanceId);
});

// Silence a whole group in one go
const weapons = sm.getGroup('weapons');
if (weapons) [...weapons.sounds].forEach(id => sm.stop(id));`;

    infoPanel.innerHTML = `
      <h3>The code behind this page</h3>
      <p>
        This is the whole pattern. <code>createSoundGroup</code> sets the limit,
        <code>play()</code> takes a <code>groupId</code>, and the group stops its oldest instance
        as soon as a new one would push it over the limit. Nothing else to keep track of.
      </p>
      <p>
        The bookkeeping worth copying is the <code>ENDED</code> listener: an instance that finished
        playing still counts against the limit until you remove it from the group.
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
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ── Theme ──────────────────────────────────────────────────────────────────

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
    if (toggle) {
      toggle.checked = isDark;
      toggle.addEventListener('change', function () {
        body.classList.toggle('dark-theme', this.checked);
        LocalStorageManagerManager.setItem('sound-manager-ts-demo-theme', this.checked ? 'dark' : 'light');
      });
    }
  }
}
