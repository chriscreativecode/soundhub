import "../../../shared.css";
import "./demo.css";

// @ts-ignore
import helicopterNew from "../../../../sounds/helicopter-new.mp3";
// @ts-ignore
import ambientSoundEffect from "../../../../sounds/ambient-sound-effect.mp3";
// @ts-ignore
import underSeaMagma from "../../../../sounds/under-sea-magma.mp3";
// @ts-ignore
import waterBubbles from "../../../../sounds/waterbubbles.mp3";
// @ts-ignore
import birdsForest from "../../../../sounds/birds-forest.mp3";
// @ts-ignore
import rain from "../../../../sounds/rain.mp3";

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
  { id: 'helicopter-new',       label: '🚁 Helicopter',      url: helicopterNew },
  { id: 'ambient-sound-effect', label: '🌌 Ambient Sound',   url: ambientSoundEffect },
  { id: 'under-sea-magma',      label: '🌋 Under-Sea Magma', url: underSeaMagma },
  { id: 'waterbubbles',         label: '🫧 Water Bubbles',   url: waterBubbles },
  { id: 'birds-forest',         label: '🌳 Forest & Birds',  url: birdsForest },
  { id: 'rain',                 label: '🌧️ Rain',            url: rain },
];

const SVG_VOLUME_ON = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06C18.01 19.86 21 16.28 21 12c0-4.28-2.99-7.86-7-8.77z"/></svg>`;
const SVG_VOLUME_OFF = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;

export class SpatialDemo {
  private soundManager: SoundManager;
  private activeSpeaker: string | null = null;
  private loaded = false;
  private selectedSound = 'helicopter-new';
  private activeTab: 'speaker-grid' | 'free-move' = 'speaker-grid';

  // Free Move state
  private freeMovePlaying = false;
  private freeMovePos = { x: 0, z: 0 };
  private autoRotate = false;
  private lastMouseRelative = { x: 0.5, z: 0.5 };
  private autoRotateRafId: number | null = null;
  private autoRotateAngle = 0;
  private isMouseOverRoom = false;
  private freeMoveSoundStarted = false;
  private speakerGridMuted = false;
  private freeMoveMuted = false;
  private lastSpeakerAngle = 0;
  constructor() {
    const config: SoundManagerConfig = {
      autoMuteOnHidden: false,
      autoResumeOnFocus: true,
      createNewInstance: false,
      debug: false,
      defaultPanType: SoundPanType.Spatial,
      loopSounds: true,
      maxLoops: 0,
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
          Test your surround sound speaker setup. Select a test sound, then use the Speaker Grid or
          Free Move tab to hear it from different positions.
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
        <!-- Tab navigation -->
        <div class="spatial-tabs">
          <button class="spatial-tab ${this.activeTab === 'speaker-grid' ? 'active' : ''}" data-tab="speaker-grid">
            🔊 Speaker Grid
          </button>
          <button class="spatial-tab ${this.activeTab === 'free-move' ? 'active' : ''}" data-tab="free-move">
            🎯 Free Move
          </button>
        </div>

        <div class="spatial-tab-content-wrapper">

        <!-- Tab 1: Speaker Grid -->
        <div class="spatial-tab-content" id="tabSpeakerGrid" style="${this.activeTab === 'speaker-grid' ? '' : 'display:none'}">
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

          <div class="free-move-controls">
            <button class="mute-btn" id="speakerGridMuteBtn" aria-label="Mute or unmute sound">
              ${SVG_VOLUME_ON}
            </button>
          </div>

          <div class="active-speaker-info" id="activeSpeakerInfo">
            <span class="active-label">Click a speaker to test it</span>
          </div>
        </div>

        <!-- Tab 2: Free Move -->
        <div class="spatial-tab-content" id="tabFreeMove" style="${this.activeTab === 'free-move' ? '' : 'display:none'}">
          <p class="free-move-desc">
            Move your mouse over the room to position the sound anywhere.
            The speaker icon follows your cursor for real-time spatial audio.
          </p>
          <div class="room-layout-wrapper">
            <div class="room-label-top">↑ Front (TV / Screen)</div>
            <div class="room-layout">
              <div class="room-border free-move-room" id="freeMoveRoom">
                <div class="free-move-tv-label">📺 TV</div>
                <div class="free-move-listener" id="freeMoveListener">👤</div>
                <div class="free-move-speaker" id="freeMoveSpeaker" style="left:50%;top:50%">🔊</div>
              </div>
            </div>
            <div class="room-label-bottom">↓ Behind you</div>
          </div>

          <div class="free-move-controls">
            <div class="toggle-card ${this.autoRotate ? 'is-active' : ''}" id="autoRotateCard">
              <div class="toggle-card-header">
                <span class="toggle-card-icon">🔄</span>
                <span class="toggle-card-label">Auto Rotate</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="autoRotateToggle" ${this.autoRotate ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
              <span class="toggle-card-status">${this.autoRotate ? 'ON' : 'OFF'}</span>
            </div>
            <button class="mute-btn" id="freeMoveMuteBtn" aria-label="Mute or unmute sound">
              ${SVG_VOLUME_ON}
            </button>
          </div>

          <div class="active-speaker-info" id="freeMoveInfo">
            <span class="active-label" id="freeMoveLabel">Move your mouse over the room</span>
            <span class="active-coords" id="freeMoveCoords"></span>
          </div>
        </div>

        </div><!-- /.spatial-tab-content-wrapper -->
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
    // Sound selector dropdown
    const select = document.getElementById('soundSelect') as HTMLSelectElement;
    if (select) {
      select.addEventListener('change', () => {
        const wasPlaying = this.soundManager.isPlaying(this.selectedSound);
        if (wasPlaying) {
          try { this.soundManager.stop(this.selectedSound); } catch { /* ignore */ }
        }
        this.selectedSound = select.value;
        this.speakerGridMuted = false;
        this.freeMoveMuted = false;
        this.freeMoveSoundStarted = false;
        const speakerGridMuteBtn = document.getElementById('speakerGridMuteBtn');
        const freeMoveMuteBtn = document.getElementById('freeMoveMuteBtn');
        if (speakerGridMuteBtn) this.updateMuteBtnUI(speakerGridMuteBtn, false);
        if (freeMoveMuteBtn) this.updateMuteBtnUI(freeMoveMuteBtn, false);
        if (this.activeTab === 'free-move' && this.isMouseOverRoom) {
          this.startFreeMoveSound();
        }
      });
    }

    // Speaker Grid mute button
    const speakerGridMuteBtn = document.getElementById('speakerGridMuteBtn');
    if (speakerGridMuteBtn) {
      speakerGridMuteBtn.addEventListener('click', () => {
        this.speakerGridMuted = !this.speakerGridMuted;
        this.soundManager.toggleMute(this.selectedSound);
        this.updateMuteBtnUI(speakerGridMuteBtn, this.speakerGridMuted);
      });
    }

    // Tab switching
    document.querySelectorAll<HTMLButtonElement>('.spatial-tab').forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        const tab = tabBtn.dataset.tab as 'speaker-grid' | 'free-move';
        this.switchTab(tab);
      });
    });

    // Free Move mouse tracking
    const room = document.getElementById('freeMoveRoom');
    const speakerEl = document.getElementById('freeMoveSpeaker');
    const freeMoveLabel = document.getElementById('freeMoveLabel');
    const freeMoveCoords = document.getElementById('freeMoveCoords');
    const autoRotateCheckbox = document.getElementById('autoRotateToggle') as HTMLInputElement;
    const muteBtn = document.getElementById('freeMoveMuteBtn');

    if (room && speakerEl && freeMoveLabel && freeMoveCoords && autoRotateCheckbox && muteBtn) {
      room.addEventListener('mouseenter', () => {
        this.isMouseOverRoom = true;
        room.classList.add('free-move-active');
        if (!this.freeMoveMuted && !this.freeMoveSoundStarted) {
          this.startFreeMoveSound();
        }
      });

      room.addEventListener('mouseleave', () => {
        this.isMouseOverRoom = false;
        room.classList.remove('free-move-active');
        if (!this.autoRotate) {
          this.stopFreeMoveSound();
        }
      });

      room.addEventListener('mousemove', (e) => {
        const rect = room.getBoundingClientRect();
        const relativeX = (e.clientX - rect.left) / rect.width;
        const relativeZ = (e.clientY - rect.top) / rect.height;
        this.lastMouseRelative = { x: relativeX, z: relativeZ };

        if (this.autoRotate) return;
        this.updateFreeMovePosition(relativeX, relativeZ, speakerEl, freeMoveLabel, freeMoveCoords);
      });

      autoRotateCheckbox.addEventListener('change', () => {
        this.autoRotate = autoRotateCheckbox.checked;
        this.updateToggleCard('autoRotateCard', this.autoRotate);
        if (this.autoRotate) {
          this.startAutoRotate(speakerEl, freeMoveLabel, freeMoveCoords);
        } else {
          this.stopAutoRotate();
          if (this.isMouseOverRoom) {
            // Restore speaker position to last known mouse position (sound keeps playing from that position)
            this.updateFreeMovePosition(this.lastMouseRelative.x, this.lastMouseRelative.z, speakerEl, freeMoveLabel, freeMoveCoords);
          } else {
            this.stopFreeMoveSound();
          }
        }
      });

      muteBtn.addEventListener('click', () => {
        this.freeMoveMuted = !this.freeMoveMuted;
        this.soundManager.toggleMute(this.selectedSound);
        this.updateMuteBtnUI(muteBtn, this.freeMoveMuted);

        if (this.freeMoveMuted) {
          room.style.cursor = 'default';
          speakerEl.style.display = 'none';
        } else {
          room.style.cursor = '';
          speakerEl.style.display = '';
          // If unmuting while mouse is over the room and sound hasn't started, start it
          if ((this.isMouseOverRoom || this.autoRotate) && !this.freeMoveSoundStarted) {
            this.startFreeMoveSound();
          }
        }
      });
    }
  }

  private updateMuteBtnUI(btn: Element, muted: boolean): void {
    btn.classList.toggle('is-muted', muted);
    btn.innerHTML = muted ? SVG_VOLUME_OFF : SVG_VOLUME_ON;
  }

  private switchTab(tab: 'speaker-grid' | 'free-move'): void {
    this.activeTab = tab;

    document.querySelectorAll('.spatial-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.spatial-tab[data-tab="${tab}"]`)?.classList.add('active');

    const gridTab = document.getElementById('tabSpeakerGrid')!;
    const freeTab = document.getElementById('tabFreeMove')!;
    gridTab.style.display = tab === 'speaker-grid' ? '' : 'none';
    freeTab.style.display = tab === 'free-move' ? '' : 'none';

    // Reset mute state: unmute if currently muted, reset both booleans, update both button UIs
    if (this.speakerGridMuted) {
      this.soundManager.toggleMute(this.selectedSound);
    }
    if (this.freeMoveMuted) {
      this.soundManager.toggleMute(this.selectedSound);
    }
    this.speakerGridMuted = false;
    this.freeMoveMuted = false;
    const speakerGridMuteBtn = document.getElementById('speakerGridMuteBtn');
    const freeMoveMuteBtn = document.getElementById('freeMoveMuteBtn');
    if (speakerGridMuteBtn) this.updateMuteBtnUI(speakerGridMuteBtn, false);
    if (freeMoveMuteBtn) this.updateMuteBtnUI(freeMoveMuteBtn, false);

    // Reset free-move room cursor and speaker visibility
    const freeMoveRoom = document.getElementById('freeMoveRoom');
    const freeMoveSpeaker = document.getElementById('freeMoveSpeaker');
    if (freeMoveRoom) freeMoveRoom.style.cursor = '';
    if (freeMoveSpeaker) freeMoveSpeaker.style.display = '';

    // Stop auto rotate & cancel pending free move frame when switching away
    if (tab !== 'free-move') {
      this.stopAutoRotate();
      if (this.soundManager.isPlaying(this.selectedSound)) {
        try { this.soundManager.stop(this.selectedSound); } catch { /* ignore */ }
      }
      this.freeMoveSoundStarted = false;
    }
  }

  // ── Free Move ───────────────────────────────────────────────────────────

  private startFreeMoveSound(): void {
    if (this.freeMoveSoundStarted) return;
    if (this.freeMoveMuted) return;
    try {
      this.soundManager.play(this.selectedSound);
      this.freeMoveSoundStarted = true;
    } catch { /* ignore */ }
  }

  private updateFreeMovePosition(
    relativeX: number,
    relativeZ: number,
    speakerEl: HTMLElement,
    labelEl: HTMLElement,
    coordsEl: HTMLElement
  ): void {
    // Map 0..1 to spatial -1..1
    const x = (relativeX - 0.5) * 2;
    const z = (relativeZ - 0.5) * 2;

    // Only update if changed significantly
    const dx = Math.abs(x - this.freeMovePos.x);
    const dz = Math.abs(z - this.freeMovePos.z);
    if (dx < 0.001 && dz < 0.001) return;

    this.freeMovePos = { x, z };

    // Move speaker icon
    speakerEl.style.left = `${relativeX * 100}%`;
    speakerEl.style.top = `${relativeZ * 100}%`;

    // Rotate speaker to face the listener (center of room)
    const angleDeg = this.computeSpeakerAngle(relativeX, relativeZ);
    speakerEl.style.setProperty('--speaker-angle', `${angleDeg}deg`);

    // Update spatial position
    this.soundManager.setSpatialPosition(
      Math.round(x * 100) / 100,
      0,
      Math.round(z * 100) / 100,
      this.selectedSound
    );

    // Update info (use textContent instead of innerHTML for performance)
    labelEl.textContent = `Position: (${x.toFixed(2)}, 0.00, ${z.toFixed(2)})`;
    coordsEl.textContent = 'Move your mouse to explore spatial audio';
  }

  // ── Auto Rotate ─────────────────────────────────────────────────────────

  private startAutoRotate(speakerEl: HTMLElement, labelEl: HTMLElement, coordsEl: HTMLElement): void {
    if (this.autoRotateRafId !== null) return;

    if (!this.freeMoveSoundStarted) {
      this.startFreeMoveSound();
    }

    const room = document.getElementById('freeMoveRoom')!;
    const radius = 0.65;
    let lastTime = performance.now();
    const SPEED = 0.6; // radians per second

    const animate = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      this.autoRotateAngle += SPEED * dt;

      const x = Math.cos(this.autoRotateAngle) * radius;
      const z = Math.sin(this.autoRotateAngle) * radius;

      const relativeX = (x + 1) / 2;
      const relativeZ = (z + 1) / 2;

      this.freeMovePos = { x, z };

      speakerEl.style.left = `${relativeX * 100}%`;
      speakerEl.style.top = `${relativeZ * 100}%`;

      // Rotate speaker to face the listener (center of room)
      const angleDeg = this.computeSpeakerAngle(relativeX, relativeZ);
      speakerEl.style.setProperty('--speaker-angle', `${angleDeg}deg`);

      this.soundManager.setSpatialPosition(
        Math.round(x * 100) / 100,
        0,
        Math.round(z * 100) / 100,
        this.selectedSound,
        undefined,
        true
      );

      // // Update info (use textContent instead of innerHTML for performance)
      labelEl.textContent = `Auto Rotate: (${x.toFixed(2)}, 0.00, ${z.toFixed(2)})`;
      coordsEl.textContent = 'Testing all spatial angles automatically';

      this.autoRotateRafId = requestAnimationFrame(animate);
    };

    this.autoRotateRafId = requestAnimationFrame(animate);
  }

  /**
   * Compute the rotation angle (in degrees) so the speaker icon points
   * toward the center of the room (the listener).
   *
   * @param relativeX  0..1 horizontal position of the speaker in the room
   * @param relativeZ  0..1 vertical position (top=0, bottom=1)
   * @returns          CSS rotation angle in degrees
   */
  private computeSpeakerAngle(relativeX: number, relativeZ: number): number {
    // Vector from speaker to center (50%, 50%)
    const dx = 50 - relativeX * 100;
    const dy = 50 - relativeZ * 100;
    const rawAngle = Math.atan2(dy, dx) * (180 / Math.PI);

    // Normalize lastSpeakerAngle to (-180, 180] before computing delta so the
    // shortest-path rotation is always found correctly, even after many full
    // revolutions where lastSpeakerAngle has accumulated to e.g. 3780°.
    const lastMod = ((this.lastSpeakerAngle % 360) + 360) % 360;
    let delta = rawAngle - lastMod;
    if (delta > 180) delta -= 360;
    else if (delta < -180) delta += 360;

    this.lastSpeakerAngle += delta;
    return this.lastSpeakerAngle;
  }

  private stopAutoRotate(): void {
    if (this.autoRotateRafId !== null) {
      cancelAnimationFrame(this.autoRotateRafId);
      this.autoRotateRafId = null;
    }
    this.autoRotate = false;
    const checkbox = document.getElementById('autoRotateToggle') as HTMLInputElement;
    if (checkbox) checkbox.checked = false;
    this.updateToggleCard('autoRotateCard', false);
  }

  private stopFreeMoveSound(): void {
    if (this.freeMoveSoundStarted) {
      try { this.soundManager.stop(this.selectedSound); } catch { /* ignore */ }
      this.freeMoveSoundStarted = false;
    }
  }

  private updateToggleCard(cardId: string, isActive: boolean): void {
    const card = document.getElementById(cardId);
    if (!card) return;
    card.classList.toggle('is-active', isActive);
    const statusEl = card.querySelector('.toggle-card-status');
    if (statusEl) {
      statusEl.textContent = isActive ? 'ON' : 'OFF';
    }
  }

  // ── Sound loading & Speaker Grid ────────────────────────────────────────

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
    const isCurrentlyPlaying = this.soundManager.isPlaying(this.selectedSound);

    this.soundManager.setSpatialPosition(speaker.x, speaker.y, speaker.z, this.selectedSound);

    if (!isCurrentlyPlaying) {
      this.soundManager.play(this.selectedSound);
    }

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