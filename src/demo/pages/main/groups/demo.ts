import "../../../shared.css";
import "./demo.css";

import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';

hljs.registerLanguage('typescript', typescript);

import { SoundManager } from '../../../../sound-manager/sound-manager';
import { SoundEventsEnum } from '../../../../sound-manager/sound-events.enum';
import { LocalStorageManagerManager } from '../../../services/local-storage-manager';

// ── WAV generation ──────────────────────────────────────────────────────────

function writeWavString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function audioBufferToWavBlobUrl(buffer: AudioBuffer): string {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const dataLength = buffer.length * numChannels * (bitDepth / 8);
  const ab = new ArrayBuffer(44 + dataLength);
  const view = new DataView(ab);

  writeWavString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeWavString(view, 8, 'WAVE');
  writeWavString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeWavString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }

  return URL.createObjectURL(new Blob([ab], { type: 'audio/wav' }));
}

interface SynthOptions {
  freqStart: number;
  freqEnd?: number;
  type: OscillatorType;
  duration: number;
  attack?: number;
  release?: number;
  volume?: number;
}

async function createSynthSound(opts: SynthOptions): Promise<string> {
  const { freqStart, freqEnd, type, duration, attack = 0.01, release = 0.1, volume = 0.65 } = opts;
  const sampleRate = 44100;
  const ctx = new OfflineAudioContext(1, Math.ceil(sampleRate * duration), sampleRate);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, 0);
  if (freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), duration);
  }

  gain.gain.setValueAtTime(0, 0);
  gain.gain.linearRampToValueAtTime(volume, attack);
  const sustainEnd = Math.max(attack + 0.001, duration - release);
  gain.gain.setValueAtTime(volume, sustainEnd);
  gain.gain.linearRampToValueAtTime(0, duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(0);
  osc.stop(duration);

  const buffer = await ctx.startRendering();
  return audioBufferToWavBlobUrl(buffer);
}

// ── Group & sound definitions ────────────────────────────────────────────────

const EFFECTS_GROUP = 'effects';
const AMBIENT_GROUP = 'ambient';
const EFFECTS_MAX = 2;
const AMBIENT_MAX = 3;
const EFFECTS_COLOR = '#8b5cf6';
const AMBIENT_COLOR = '#10b981';

interface SoundDef {
  id: string;
  label: string;
  emoji: string;
  groupId: string;
  opts: SynthOptions;
}

const SOUND_DEFS: SoundDef[] = [
  {
    id: 'laser', label: 'Laser', emoji: '⚡', groupId: EFFECTS_GROUP,
    opts: { freqStart: 880, freqEnd: 220, type: 'square', duration: 0.4, attack: 0.005, release: 0.05 },
  },
  {
    id: 'blip', label: 'Blip', emoji: '🔵', groupId: EFFECTS_GROUP,
    opts: { freqStart: 660, type: 'square', duration: 0.15, attack: 0.005, release: 0.05 },
  },
  {
    id: 'pop', label: 'Pop', emoji: '💥', groupId: EFFECTS_GROUP,
    opts: { freqStart: 330, freqEnd: 80, type: 'triangle', duration: 0.2, attack: 0.005, release: 0.1 },
  },
  {
    id: 'ping', label: 'Ping', emoji: '🔔', groupId: EFFECTS_GROUP,
    opts: { freqStart: 1320, type: 'sine', duration: 0.6, attack: 0.005, release: 0.4 },
  },
  {
    id: 'drone', label: 'Drone', emoji: '🌊', groupId: AMBIENT_GROUP,
    opts: { freqStart: 55, type: 'sine', duration: 2.5, attack: 0.3, release: 0.5 },
  },
  {
    id: 'mid-tone', label: 'Mid Tone', emoji: '🎵', groupId: AMBIENT_GROUP,
    opts: { freqStart: 165, type: 'sine', duration: 2.0, attack: 0.15, release: 0.5 },
  },
  {
    id: 'high-pad', label: 'High Pad', emoji: '✨', groupId: AMBIENT_GROUP,
    opts: { freqStart: 330, type: 'sine', duration: 3.0, attack: 0.2, release: 0.8 },
  },
];

// ── Demo class ───────────────────────────────────────────────────────────────

export class GroupsDemo {
  private soundManager!: SoundManager;
  private instanceToGroup = new Map<string, string>();
  private blobUrls: string[] = [];
  private loaded = false;

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

    this.soundManager.createSoundGroup(EFFECTS_GROUP, { maxInstances: EFFECTS_MAX });
    this.soundManager.createSoundGroup(AMBIENT_GROUP, { maxInstances: AMBIENT_MAX });

    this.render();
    this.setupEventListeners();
    this.setLoadingState(true);

    await this.generateAndLoadSounds();

    this.setLoadingState(false);
    this.loaded = true;
    this.buildInfoPanel();
  }

  // ── Sound generation ───────────────────────────────────────────────────────

  private async generateAndLoadSounds(): Promise<void> {
    const soundsToLoad: { id: string; url: string }[] = [];
    for (const def of SOUND_DEFS) {
      const url = await createSynthSound(def.opts);
      this.blobUrls.push(url);
      soundsToLoad.push({ id: def.id, url });
    }
    await this.soundManager.loadSounds(soundsToLoad);
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  private render(): void {
    const container = document.getElementById('groupsContainer');
    if (!container) return;

    const effectsSounds = SOUND_DEFS.filter(s => s.groupId === EFFECTS_GROUP);
    const ambientSounds = SOUND_DEFS.filter(s => s.groupId === AMBIENT_GROUP);

    container.innerHTML = `
      <div class="groups-grid">
        ${this.renderGroupCard(EFFECTS_GROUP, 'Effects', EFFECTS_MAX, EFFECTS_COLOR, effectsSounds)}
        ${this.renderGroupCard(AMBIENT_GROUP, 'Ambient', AMBIENT_MAX, AMBIENT_COLOR, ambientSounds)}
      </div>
    `;

    container.querySelectorAll<HTMLButtonElement>('[data-sound-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this.loaded) return;
        this.playSound(btn.dataset.soundId!, btn.dataset.groupId!);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-stop-group]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.stopGroup(btn.dataset.stopGroup!);
      });
    });
  }

  private renderGroupCard(
    groupId: string,
    title: string,
    maxInstances: number,
    color: string,
    sounds: SoundDef[],
  ): string {
    const slots = Array.from({ length: maxInstances }, (_, i) =>
      `<div class="group-slot" data-group="${groupId}" data-slot="${i}" style="--slot-color:${color}"></div>`
    ).join('');

    const buttons = sounds.map(s =>
      `<button class="sound-btn" data-sound-id="${s.id}" data-group-id="${s.groupId}" style="--btn-color:${color}" disabled>
        <span class="sound-btn__emoji">${s.emoji}</span>
        <span class="sound-btn__label">${s.label}</span>
      </button>`
    ).join('');

    return `
      <div class="group-card control-group" data-group-card="${groupId}" style="--group-color:${color}">
        <div class="group-card__header">
          <span class="group-card__title">${title}</span>
          <span class="group-card__badge">max ${maxInstances} instances</span>
        </div>
        <div class="group-slots-row">
          <span class="group-slots-label">Active</span>
          <div class="group-slots" data-slots-group="${groupId}">${slots}</div>
        </div>
        <div class="group-sounds">${buttons}</div>
        <button class="stop-all-btn" data-stop-group="${groupId}" style="--btn-color:${color}">■ Stop All</button>
      </div>
    `;
  }

  // ── Playback ───────────────────────────────────────────────────────────────

  private playSound(soundId: string, groupId: string): void {
    const result = this.soundManager.play(soundId, {
      createNewInstance: true,
      groupId,
    });
    if (result) {
      this.instanceToGroup.set(result.id, groupId);
      this.updateSlots(groupId);
    }
  }

  private stopGroup(groupId: string): void {
    const group = this.soundManager.getGroup(groupId);
    if (!group) return;
    [...group.sounds].forEach(id => this.soundManager.stop(id));
  }

  // ── Event listeners ────────────────────────────────────────────────────────

  private setupEventListeners(): void {
    this.soundManager.addEventListener(SoundEventsEnum.ENDED, (event: any) => {
      this.handleInstanceDone(event.instanceId ?? event.soundId);
    });

    this.soundManager.addEventListener(SoundEventsEnum.STOPPED, (event: any) => {
      this.handleInstanceDone(event.soundId);
    });
  }

  private handleInstanceDone(instanceId: string): void {
    if (!instanceId) return;
    const groupId = this.instanceToGroup.get(instanceId);
    if (!groupId) return;
    this.soundManager.removeFromSoundGroup(groupId, instanceId);
    this.instanceToGroup.delete(instanceId);
    this.updateSlots(groupId);
  }

  // ── Slot UI ────────────────────────────────────────────────────────────────

  private updateSlots(groupId: string): void {
    const activeCount = [...this.instanceToGroup.values()].filter(g => g === groupId).length;
    const slots = document.querySelectorAll<HTMLElement>(`[data-slots-group="${groupId}"] .group-slot`);

    slots.forEach((slot, i) => {
      const wasActive = slot.classList.contains('active');
      const isNowActive = i < activeCount;

      if (wasActive && !isNowActive) {
        slot.classList.remove('active');
        slot.classList.add('slot-deactivating');
        setTimeout(() => slot.classList.remove('slot-deactivating'), 350);
      } else if (!wasActive && isNowActive) {
        slot.classList.remove('slot-deactivating');
        slot.classList.add('active');
      }
    });
  }

  private setLoadingState(loading: boolean): void {
    const buttons = document.querySelectorAll<HTMLButtonElement>('.sound-btn');
    buttons.forEach(btn => (btn.disabled = loading));

    const existing = document.getElementById('loadingOverlay');
    if (loading && !existing) {
      const overlay = document.createElement('div');
      overlay.id = 'loadingOverlay';
      overlay.className = 'loading-overlay';
      overlay.textContent = 'Generating synthesizer sounds…';
      document.getElementById('groupsContainer')?.appendChild(overlay);
    } else if (!loading && existing) {
      existing.remove();
    }
  }

  // ── Info panel ─────────────────────────────────────────────────────────────

  private buildInfoPanel(): void {
    const infoPanel = document.getElementById('groupsInfo');
    if (!infoPanel) return;

    const codeSnippet = `import { SoundManager, SoundEventsEnum } from 'sound-manager-ts';

const sm = new SoundManager();

// 1️⃣ Create groups with independent instance limits
sm.createSoundGroup('effects', { maxInstances: 2 });
sm.createSoundGroup('ambient', { maxInstances: 3 });

// 2️⃣ Load sounds
await sm.loadSounds([
  { id: 'laser', url: laserUrl },
  { id: 'drone', url: droneUrl },
  // ...
]);

// 3️⃣ Play into a group — when maxInstances is reached,
//    the oldest instance stops automatically to make room
const instance = sm.play('laser', {
  createNewInstance: true,
  groupId: 'effects',
});

// 4️⃣ Track instance → group so you can clean up on end
const instanceToGroup = new Map();
if (instance) instanceToGroup.set(instance.id, 'effects');

sm.addEventListener(SoundEventsEnum.ENDED, (event) => {
  const groupId = instanceToGroup.get(event.instanceId);
  if (groupId) {
    sm.removeFromSoundGroup(groupId, event.instanceId);
    instanceToGroup.delete(event.instanceId);
  }
});

// 5️⃣ Stop all sounds in a group at once
const group = sm.getGroup('effects');
if (group) {
  [...group.sounds].forEach(id => sm.stop(id));
}`;

    infoPanel.innerHTML = `
      <h3>🎛️ Sound Groups</h3>
      <p>
        <strong>Sound groups</strong> let you organise sounds into named collections
        with a shared <code>maxInstances</code> limit. When the limit is reached,
        the <em>oldest playing instance stops automatically</em> to make room for
        the new one — no manual bookkeeping needed.
      </p>
      <p>
        Try it: rapidly click the Effects buttons until both slots are filled, then
        click again to see the oldest instance cut off as a new one starts.
        The Effects group allows <strong>2 simultaneous instances</strong> and
        Ambient allows <strong>3</strong> — each group is completely independent.
      </p>
      <p>
        A typical use case is game audio: a <em>weapons</em> group capped at
        3 simultaneous shots, or a <em>footsteps</em> group that never stacks
        more than 2 steps. The "Stop All" button shows collective group control.
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
    if (toggle) toggle.checked = isDark;
    if (toggle) {
      toggle.addEventListener('change', function () {
        body.classList.toggle('dark-theme', this.checked);
        LocalStorageManagerManager.setItem('sound-manager-ts-demo-theme', this.checked ? 'dark' : 'light');
      });
    }
  }
}
