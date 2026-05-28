import "../../../shared.css";
import "./demo.css";

// @ts-ignore
import laserZap from "../../../../sounds/laser-zap.wav";
// @ts-ignore
import explosion from "../../../../sounds/explosion.wav";
// @ts-ignore
import whoosh from "../../../../sounds/whoosh.wav";
// @ts-ignore
import powerUp from "../../../../sounds/power-up.wav";
// @ts-ignore
import glitch from "../../../../sounds/glitch.wav";
// @ts-ignore
import alienSignal from "../../../../sounds/alien-signal.wav";

import { SoundManager } from '../../../../sound-manager/sound-manager';
import { SoundManagerConfig } from '../../../../sound-manager/sound-manager-config';
import { SoundPanType } from '../../../../sound-manager/sound-pan-type.enum';
import { LocalStorageManagerManager } from '../../../services/local-storage-manager';

interface SpeakerDef {
  id: string;
  label: string;
  shortLabel: string;
  x: number;
  y: number;
  z: number;
  gridRow: number;
  gridCol: number;
  description: string;
}

const SPEAKERS: SpeakerDef[] = [
  { id: 'fl',  label: 'Front Left',    shortLabel: 'FL',  x: -1,   y: 0, z: -1,  gridRow: 1, gridCol: 1, description: 'Front left speaker' },
  { id: 'fc',  label: 'Front Center',  shortLabel: 'FC',  x: 0,    y: 0, z: -1,  gridRow: 1, gridCol: 2, description: 'Center channel (dialogue)' },
  { id: 'fr',  label: 'Front Right',   shortLabel: 'FR',  x: 1,    y: 0, z: -1,  gridRow: 1, gridCol: 3, description: 'Front right speaker' },
  { id: 'l',   label: 'Left',          shortLabel: 'L',   x: -1.2, y: 0, z: 0,   gridRow: 2, gridCol: 1, description: 'Side left speaker' },
  { id: 'r',   label: 'Right',         shortLabel: 'R',   x: 1.2,  y: 0, z: 0,   gridRow: 2, gridCol: 3, description: 'Side right speaker' },
  { id: 'rl',  label: 'Rear Left',     shortLabel: 'RL',  x: -1,   y: 0, z: 1,   gridRow: 3, gridCol: 1, description: 'Rear left surround' },
  { id: 'rc',  label: 'Rear Center',   shortLabel: 'RC',  x: 0,    y: 0, z: 1,   gridRow: 3, gridCol: 2, description: 'Rear center surround' },
  { id: 'rr',  label: 'Rear Right',    shortLabel: 'RR',  x: 1,    y: 0, z: 1,   gridRow: 3, gridCol: 3, description: 'Rear right surround' },
  { id: 'sub', label: 'Subwoofer',     shortLabel: 'SUB', x: 0,    y: -1, z: 0,  gridRow: 4, gridCol: 2, description: 'Low-frequency effects (LFE)' },
];

const SOUND_OPTIONS = [
  { id: 'laser-zap', label: '🔫 Laser Zap', url: laserZap },
  { id: 'explosion', label: '💥 Explosion', url: explosion },
  { id: 'whoosh', label: '🌬️ Whoosh', url: whoosh },
  { id: 'power-up', label: '⚡ Power Up', url: powerUp },
  { id: 'glitch', label: '🤖 Glitch', url: glitch },
  { id: 'alien-signal', label: '👽 Alien Signal', url: alienSignal },
];

export class SpatialDemo {
  private soundManager: SoundManager;
  private activeSpeaker: string | null = null;
  private loaded = false;
  private selectedSound = 'laser-zap';

  constructor() {
    const config: SoundManagerConfig = {
      autoMuteOnHidden: false,
      autoResumeOnFocus: true,
      createNewInstance: false,
      debug: false,
      defaultPanType: SoundPanType.Spatial,
      loopSounds: false,
      maxLoops: 1,
      defaultVolume: 1,
      defaultPlaybackRate: 1,
      defaultPan: 0,
      defaultPanSpatialPosition: { x: 0, y: 0, z: 0 },
      spatialAudio: true,
      trackProgress: false,
    };
    this.soundManager = new SoundManager(config);
    this.initTheme();
    this.renderUI();
    this.loadSounds();
  }

  private initTheme(): void {
    const body = document.body;
    const toggle = document.getElementById('themeToggle') as HTMLInputElement;
    const stored = LocalStorageManagerManager.getItem('sound-manager-ts-demo-theme');
    if (!stored) {
      LocalStorageManagerManager.setItem('sound-manager-ts-demo-theme',
        window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
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

  private renderUI(): void {
    const container = document.getElementById('spatialContainer')!;
    container.innerHTML = `
      <div class="control-group spatial-info">
        <p class="spatial-description">
          Test your surround sound speaker setup. Select a test sound, then click a speaker button to
          hear it from that position. Useful for verifying your TV or home theatre speaker placement.
          <br><br>
          <strong>Note:</strong> For best results, use headphones or a proper surround sound system.
          The listener is positioned at the center of the room.
        </p>
        <div class="sound-selector-row">
          <label class="sound-selector-label" for="soundSelect">Test sound:</label>
          <select class="sound-select-dropdown" id="soundSelect">
            ${SOUND_OPTIONS.map(s => `
              <option value="${s.id}" ${s.id === this.selectedSound ? 'selected' : ''}>${s.label}</option>
            `).join('')}
          </select>
        </div>
      </div>

      <div class="control-group spatial-room-panel">
        <div class="room-layout-wrapper">
          <div class="room-label-top">↑ Front (TV / Screen)</div>
          <div class="room-layout">
            <div class="room-border">
              ${SPEAKERS.filter(s => s.id !== 'sub').map(s => `
                <button
                  class="speaker-btn"
                  data-speaker="${s.id}"
                  style="grid-row:${s.gridRow};grid-column:${s.gridCol}"
                  title="${s.description}"
                  disabled
                >
                  <span class="speaker-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06Z" />
                      <path d="M18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
                      <path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.061Z" />
                    </svg>
                  </span>
                  <span class="speaker-short-label">${s.shortLabel}</span>
                  <span class="speaker-label">${s.label}</span>
                </button>
              `).join('')}

              <div class="listener-dot" style="grid-row:2;grid-column:2" title="You are here">
                <span class="listener-icon">👤</span>
                <span class="listener-label">You</span>
              </div>
            </div>
          </div>
          <div class="room-label-bottom">↓ Behind you</div>
        </div>

        <!-- Subwoofer separate -->
        <div class="sub-row">
          <button class="speaker-btn sub-btn" data-speaker="sub" disabled>
            <span class="speaker-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.757 3.63 8.25 4.51 8.25H6.75Z" />
              </svg>
            </span>
            <span class="speaker-short-label">SUB</span>
            <span class="speaker-label">Subwoofer (LFE)</span>
          </button>
        </div>

        <div class="active-speaker-info" id="activeSpeakerInfo">
          <span class="active-label">Click a speaker to test it</span>
        </div>
      </div>

      <div class="control-group spatial-coords-panel">
        <h4>3D Coordinates</h4>
        <p class="coords-desc">The Web Audio API places the listener at (0, 0, 0) facing the negative Z axis. Speaker positions use (X, Y, Z) where X is left/right, Y is up/down, Z is front/back.</p>
        <div class="coords-grid" id="coordsGrid">
          ${SPEAKERS.map(s => `
            <div class="coord-row ${s.id === this.activeSpeaker ? 'active' : ''}" data-speaker="${s.id}">
              <span class="coord-label">${s.shortLabel}</span>
              <span class="coord-value">(${s.x}, ${s.y}, ${s.z})</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.attachUIListeners();
  }

  private attachUIListeners(): void {
    const select = document.getElementById('soundSelect') as HTMLSelectElement;
    if (select) {
      select.addEventListener('change', () => {
        this.selectedSound = select.value;
      });
    }
  }

  private async loadSounds(): Promise<void> {
    if (this.loaded) return;

    await this.soundManager.loadSounds(SOUND_OPTIONS.map(s => ({ id: s.id, url: s.url })));

    this.loaded = true;

    document.querySelectorAll<HTMLButtonElement>('.speaker-btn').forEach(btn => {
      btn.disabled = false;
      btn.addEventListener('click', () => this.playSpeaker(btn.dataset.speaker!));
    });
  }

  private playSpeaker(speakerId: string): void {
    const speaker = SPEAKERS.find(s => s.id === speakerId)!;

    try { this.soundManager.stop(this.selectedSound); } catch { /* ignore */ }

    this.soundManager.setSpatialPosition(speaker.x, speaker.y, speaker.z, this.selectedSound);
    this.soundManager.play(this.selectedSound);

    this.activeSpeaker = speakerId;

    document.querySelectorAll('.speaker-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll<HTMLButtonElement>(`[data-speaker="${speakerId}"]`).forEach(b => b.classList.add('active'));

    const infoEl = document.getElementById('activeSpeakerInfo');
    if (infoEl) {
      infoEl.innerHTML = `
        <span class="active-label">Playing from: <strong>${speaker.label}</strong></span>
        <span class="active-coords">Position: (${speaker.x}, ${speaker.y}, ${speaker.z})</span>
      `;
    }

    document.querySelectorAll('.coord-row').forEach(row => row.classList.remove('active'));
    document.querySelector(`.coord-row[data-speaker="${speakerId}"]`)?.classList.add('active');
  }
}
