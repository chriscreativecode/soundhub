import "../../../shared.css";
import "./demo.css";

declare function gtag(...args: any[]): void;

// @ts-ignore
import helicopterNew from "../../../../sounds/helicopter.mp3";
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

import { AudioControllerComponent } from '../../../components/audio-controller-component/audio-controller.component';
import { EqualizerComponent } from '../../../components/equalizer-component/equalizer.component';
import { SoundManager } from '../../../../sound-manager/sound-manager';
import { SoundManagerConfig } from '../../../../sound-manager/sound-manager-config';
import { SoundPanType } from '../../../../sound-manager/sound-pan-type.enum';
import { LocalStorageManagerManager } from '../../../services/local-storage-manager';
import { PanningModel, DistanceModel, SoundPannerConfig } from '../../../../sound-manager/sound-panner-config';
import { SpatialSettings } from '../../../components/spatial-settings-component/spatial-settings.component';

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

type AudioMode = 'headphones' | 'stereo' | '3.1' | '5.1' | '7.1';

// Standard ITU channel layout per surround mode
const CHANNEL_MAPS: Record<string, Record<string, number>> = {
  '3.1': { fl: 0, fr: 1, fc: 2, sub: 3, l: 0, r: 1, rl: 0, rr: 1, rc: 2 },
  '5.1': { fl: 0, fr: 1, fc: 2, sub: 3, rl: 4, rr: 5, l: 4, r: 5, rc: 4 },
  '7.1': { fl: 0, fr: 1, fc: 2, sub: 3, rl: 4, rr: 5, l: 6, r: 7, rc: 4 },
};

const MODE_CHANNEL_COUNTS: Record<string, number> = { '3.1': 4, '5.1': 6, '7.1': 8 };

const AUDIO_MODE_OPTIONS: { value: AudioMode; label: string }[] = [
  { value: 'headphones', label: '🎧 Headphones' },
  { value: 'stereo',     label: '🔊 Stereo / 2.1' },
  { value: '3.1',        label: '📺 3.1 Soundbar' },
  { value: '5.1',        label: '🎵 5.1 Surround' },
  { value: '7.1',        label: '🎵 7.1 Surround' },
];

const SVG_VOLUME_ON = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06C18.01 19.86 21 16.28 21 12c0-4.28-2.99-7.86-7-8.77z"/></svg>`;
const SVG_VOLUME_OFF = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
const SVG_STOP = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z"/></svg>`;
const SVG_PLAY = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z"/></svg>`;

export class SpatialDemo {
  private soundManager: SoundManager;
  private activeSpeaker: string | null = null;
  private loaded = false;
  private selectedSound = 'helicopter-new';
  // The orbit is what this demo is about, so that is the tab people land on
  private activeTab: 'speaker-grid' | 'free-move' = 'free-move';

  // Free Move state
  private freeMovePlaying = false;
  private freeMovePos = { x: 0, z: 0 };
  private autoRotate = true;
  /** Browsers keep audio silent until a click, so playback waits for one. */
  private audioStarted = false;
  private lastMouseRelative = { x: 0.5, z: 0.5 };
  private autoRotateRafId: number | null = null;
  private autoRotateAngle = 0;
  private isMouseOverRoom = false;
  private freeMoveSoundStarted = false;
  private speakerGridMuted = false;
  private speakerGridPlaying = false;
  private freeMoveMuted = false;
  private lastSpeakerAngle = 0;
  private equalizer: EqualizerComponent | null = null;

  // Channel isolation mode (Speaker Grid tab only)
  private audioMode: AudioMode = 'headphones';
  private channelMerger: ChannelMergerNode | null = null;
  private activeChannelIndex: number | null = null;

  // Spatial settings component
  private spatialSettingsInstance: SpatialSettings | null = null;

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
    this.audioMode = 'headphones';
    this.initAudioController();
    this.initEqualizer();
    this.initTheme();
    this.renderUI();
    this.initSpatialSettings();
    this.startOrbit();
    this.loadSounds();
  }

  /** Runs the orbit animation right away; sound joins in after the first click. */
  private startOrbit(): void {
    if (!this.autoRotate || this.activeTab !== 'free-move') return;
    const speakerEl = document.getElementById('freeMoveSpeaker');
    const labelEl = document.getElementById('freeMoveLabel');
    const coordsEl = document.getElementById('freeMoveCoords');
    if (speakerEl && labelEl && coordsEl) {
      this.startAutoRotate(speakerEl, labelEl, coordsEl);
    }
  }

  private beginPlayback(): void {
    this.audioStarted = true;
    document.getElementById('roomStart')?.classList.add('is-hidden');
    if (this.activeTab === 'free-move') this.startFreeMoveSound();
  }

  private initAudioController(): void {
    const controllerEl = document.getElementById('spatialAudioController');
    if (controllerEl) {
      new AudioControllerComponent(controllerEl);
    }
  }

  private initEqualizer(): void {
    const controllerEl = document.getElementById('spatialAudioController');
    if (controllerEl) {
      const audioCtx = this.soundManager.getContext();
      const analyser = audioCtx.createAnalyser();
      this.soundManager.getMasterOutput().connect(analyser);
      this.equalizer = new EqualizerComponent(controllerEl, analyser);
    }
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
      <div class="control-group spatial-intro">
        <div class="intro-main">
          <h2 class="intro-title">Put a sound anywhere around the listener</h2>
          <p class="intro-text">
            Every sound gets an x, y and z position in the room. SoundManager hands those coordinates to
            a Web Audio panner, so a helicopter can circle your head, rain can sit behind you, and a
            voice can stay locked to the screen in front of you. Move the source and the sound follows
            while it plays.
          </p>
          <ul class="intro-points">
            <li>
              <span class="intro-points__icon">🎯</span>
              <div><b>Move the sound</b>It orbits you by itself. Move your mouse into the room to place it yourself.</div>
            </li>
            <li>
              <span class="intro-points__icon">🔊</span>
              <div><b>Speaker check</b>Send the sound to one spot at a time: front, side, rear or the sub.</div>
            </li>
            <li>
              <span class="intro-points__icon">🎛️</span>
              <div><b>Panner settings</b>Change the panning model, distance model and rolloff while it plays.</div>
            </li>
          </ul>
        </div>

        <aside class="intro-note">
          <h3>🎧 Headphones give the real effect</h3>
          <p>
            The browser renders 3D audio with HRTF, a binaural technique made for headphones, and mixes
            the result down to two channels.
          </p>
          <p>
            So a 5.1 or 7.1 set hooked up to your TV does not receive separate channels from this page.
            Your TV or receiver gets a stereo signal and spreads it over the other speakers itself. That
            is a browser limit, not something the library can work around.
          </p>
          <details class="intro-details">
            <summary>When does per-speaker output actually work?</summary>
            <p>
              Only when the operating system exposes the audio device as a true multi-channel PCM
              output: a PC with a 5.1 or 7.1 sound card wired straight to powered speakers or an AV
              receiver. The browser can address those channels, and the Speaker check tab then routes
              the sound to one channel at a time.
            </p>
            <p>
              A soundbar over HDMI ARC, optical or Bluetooth shows up as a 2-channel device, so the
              isolation test cannot reach the individual speakers. For a real surround check, use your
              audio system's own app or a Dolby 5.1 stream such as Netflix.
            </p>
          </details>
        </aside>
      </div>

      <div class="control-group spatial-setup">
        <div class="spatial-setup__header">
          <span class="spatial-setup__step">Before you start</span>
          <h3 class="spatial-setup__title">Pick a sound and tell us what you listen on</h3>
        </div>
        <div class="spatial-setup__fields">
          <div class="setup-field">
            <label class="setup-field__label" for="soundSelect">
              <span class="setup-field__icon">🔈</span>Test sound
            </label>
            <select class="setup-field__select" id="soundSelect">
              ${SOUND_OPTIONS.map(s => `
                <option value="${s.id}" ${s.id === this.selectedSound ? 'selected' : ''}>${s.label}</option>
              `).join('')}
            </select>
            <p class="setup-field__hint">This is the source that travels through the room below.</p>
          </div>
          <div class="setup-field">
            <label class="setup-field__label" for="audioModeSelect">
              <span class="setup-field__icon">🎚️</span>Audio system
            </label>
            <select class="setup-field__select" id="audioModeSelect">
              ${AUDIO_MODE_OPTIONS.map(opt => `
                <option value="${opt.value}" ${opt.value === this.audioMode ? 'selected' : ''}>${opt.label}</option>
              `).join('')}
            </select>
            <p class="setup-field__hint">Sets the panner preset, and the per-speaker routing on a true multi-channel output.</p>
            <div class="channel-info" id="channelInfo"></div>
          </div>
        </div>
      </div>

      <div class="spatial-main-layout">

        <!-- Left: Room panel -->
        <div class="spatial-room-section">
          <div class="control-group spatial-room-panel">
            <!-- Tab navigation -->
            <div class="spatial-tabs" role="tablist">
              <button class="spatial-tab ${this.activeTab === 'free-move' ? 'active' : ''}" data-tab="free-move"
                role="tab" aria-selected="${this.activeTab === 'free-move'}">
                <span class="spatial-tab__title">🎯 Move the sound</span>
                <span class="spatial-tab__sub">Orbit around you, or take over with the mouse</span>
              </button>
              <button class="spatial-tab ${this.activeTab === 'speaker-grid' ? 'active' : ''}" data-tab="speaker-grid"
                role="tab" aria-selected="${this.activeTab === 'speaker-grid'}">
                <span class="spatial-tab__title">🔊 Speaker check</span>
                <span class="spatial-tab__sub">One position at a time, front to rear</span>
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
                <button class="mute-btn" id="speakerGridStopBtn" aria-label="Stop or play sound">
                  ${SVG_STOP}
                </button>
              </div>

              <div class="active-speaker-info" id="activeSpeakerInfo">
                <span class="active-label">Click a speaker to test it</span>
              </div>
            </div>

            <!-- Tab 2: Free Move -->
            <div class="spatial-tab-content" id="tabFreeMove" style="${this.activeTab === 'free-move' ? '' : 'display:none'}">
              <p class="free-move-desc">
                The sound circles the listener on its own. Move your mouse into the room to take over and
                place it yourself, move out again and the orbit picks up where you left it.
              </p>
              <div class="room-layout-wrapper">
                <div class="room-label-top">↑ Front (TV / screen)</div>
                <div class="room-layout">
                  <div class="room-border free-move-room" id="freeMoveRoom">
                    <span class="orbit-path" aria-hidden="true"></span>
                    <div class="free-move-tv-label">📺 TV</div>
                    <div class="free-move-listener" id="freeMoveListener">👤</div>
                    <div class="free-move-speaker" id="freeMoveSpeaker" style="left:50%;top:50%">🔊</div>
                    <div class="room-start" id="roomStart">
                      <button class="room-start__btn" type="button" id="roomStartBtn">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true"><path d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z"/></svg>
                        Start the sound
                      </button>
                      <span class="room-start__hint">Browsers keep audio muted until you click. Headphones on for the full effect.</span>
                    </div>
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
                <span class="active-label" id="freeMoveLabel">The sound is orbiting you</span>
                <span class="active-coords" id="freeMoveCoords">Move your mouse into the room to place it yourself</span>
              </div>
            </div>

            </div><!-- /.spatial-tab-content-wrapper -->
          </div>
        </div>

        <!-- Right: Spatial Audio Settings panel -->
        <div class="spatial-settings-panel">
          <h4>🌐 Spatial Audio Settings</h4>
          <p style="font-size:0.8rem;color:var(--color-text-secondary);margin:0 0 var(--spacing-sm) 0;line-height:1.5;">
            Adjust the spatial audio parameters below. Changes are applied to the currently playing sound in real time.
          </p>
          <div class="spatial-settings-scroll" id="spatialSettingsContainer"></div>
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
    // Sound selector dropdown
    const select = document.getElementById('soundSelect') as HTMLSelectElement;
    if (select) {
      select.addEventListener('change', () => {
        const wasPlaying = this.soundManager.isPlaying(this.selectedSound);
        if (wasPlaying) {
          try { this.soundManager.stop(this.selectedSound); } catch { /* ignore */ }
        }
        this.selectedSound = select.value;
        gtag('event', 'spatial_sound_select', { sound_id: this.selectedSound, demo: 'spatial' });
        this.speakerGridMuted = false;
        this.speakerGridPlaying = false;
        this.freeMoveMuted = false;
        this.freeMoveSoundStarted = false;
        const speakerGridMuteBtn = document.getElementById('speakerGridMuteBtn');
        const freeMoveMuteBtn = document.getElementById('freeMoveMuteBtn');
        const speakerGridStopBtn = document.getElementById('speakerGridStopBtn');
        if (speakerGridMuteBtn) this.updateMuteBtnUI(speakerGridMuteBtn, false);
        if (freeMoveMuteBtn) this.updateMuteBtnUI(freeMoveMuteBtn, false);
        if (speakerGridStopBtn) speakerGridStopBtn.innerHTML = SVG_STOP;
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

    // Speaker Grid stop/play button
    const speakerGridStopBtn = document.getElementById('speakerGridStopBtn');
    if (speakerGridStopBtn) {
      speakerGridStopBtn.addEventListener('click', () => {
        if (this.speakerGridPlaying) {
          // Stop the sound
          if (this.soundManager.isPlaying(this.selectedSound)) {
            try { this.soundManager.stop(this.selectedSound); } catch { /* ignore */ }
          }
          this.speakerGridPlaying = false;
          speakerGridStopBtn.innerHTML = SVG_PLAY;
          document.querySelectorAll('.speaker-btn').forEach(b => b.classList.remove('active'));
          this.activeSpeaker = null;
        } else {
          // Play the sound at the last active speaker position (or centered)
          const speaker = this.activeSpeaker ? SPEAKERS.find(s => s.id === this.activeSpeaker) : null;
          if (speaker) {
            this.playSpeaker(speaker.id);
          } else {
            this.soundManager.setSpatialPosition(0, 0, 0, this.selectedSound);
            this.soundManager.play(this.selectedSound);
            this.speakerGridPlaying = true;
            speakerGridStopBtn.innerHTML = SVG_STOP;
            const infoEl = document.getElementById('activeSpeakerInfo');
            if (infoEl) infoEl.innerHTML = '<span class="active-label">Playing centered</span>';
          }
        }
      });
    }

    // Audio mode selector
    const audioModeSelect = document.getElementById('audioModeSelect') as HTMLSelectElement;
    if (audioModeSelect) {
      audioModeSelect.addEventListener('change', () => this.setAudioMode(audioModeSelect.value as AudioMode));
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
      const startBtn = document.getElementById('roomStartBtn');
      startBtn?.addEventListener('click', () => this.beginPlayback());
      document.getElementById('roomStart')?.addEventListener('click', () => this.beginPlayback());

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
        if (this.autoRotate) {
          // Hand the sound back to the orbit where the pointer left it
          this.autoRotateAngle = Math.atan2(this.freeMovePos.z, this.freeMovePos.x);
          this.startAutoRotate(speakerEl, freeMoveLabel, freeMoveCoords);
        } else {
          this.stopFreeMoveSound();
        }
      });

      room.addEventListener('mousemove', (e) => {
        const rect = room.getBoundingClientRect();
        const relativeX = (e.clientX - rect.left) / rect.width;
        const relativeZ = (e.clientY - rect.top) / rect.height;
        this.lastMouseRelative = { x: relativeX, z: relativeZ };

        // The pointer takes priority over the orbit for as long as it is inside
        if (this.autoRotateRafId !== null) this.pauseOrbit();
        this.updateFreeMovePosition(relativeX, relativeZ, speakerEl, freeMoveLabel, freeMoveCoords);
      });

      autoRotateCheckbox.addEventListener('change', () => {
        this.autoRotate = autoRotateCheckbox.checked;
        this.updateToggleCard('autoRotateCard', this.autoRotate);
        if (this.autoRotate) {
          room.style.cursor = 'pointer';
          this.startAutoRotate(speakerEl, freeMoveLabel, freeMoveCoords);
        } else {
          room.style.cursor = '';
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
          room.style.cursor = this.autoRotate ? 'pointer' : '';
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

  // ── Spatial Audio Settings panel ───────────────────────────────────────

  private getSpatialConfigForMode(mode: AudioMode): SoundPannerConfig {
    switch (mode) {
      case 'headphones':
        return {
          panningModel: PanningModel.HRTF,
          distanceModel: DistanceModel.Inverse,
          refDistance: 1,
          maxDistance: 10000,
          rolloffFactor: 1,
          coneInnerAngle: 360,
          coneOuterAngle: 360,
          coneOuterGain: 0,
        };
      case 'stereo':
        return {
          panningModel: PanningModel.EqualPower,
          distanceModel: DistanceModel.Linear,
          refDistance: 1,
          maxDistance: 10000,
          rolloffFactor: 0.5,
          coneInnerAngle: 360,
          coneOuterAngle: 360,
          coneOuterGain: 0,
        };
      case '3.1':
        return {
          panningModel: PanningModel.EqualPower,
          distanceModel: DistanceModel.Inverse,
          refDistance: 1,
          maxDistance: 5000,
          rolloffFactor: 0.8,
          coneInnerAngle: 360,
          coneOuterAngle: 360,
          coneOuterGain: 0,
        };
      case '5.1':
        return {
          panningModel: PanningModel.HRTF,
          distanceModel: DistanceModel.Inverse,
          refDistance: 1,
          maxDistance: 10000,
          rolloffFactor: 1,
          coneInnerAngle: 360,
          coneOuterAngle: 360,
          coneOuterGain: 0,
        };
      case '7.1':
        return {
          panningModel: PanningModel.HRTF,
          distanceModel: DistanceModel.Inverse,
          refDistance: 1,
          maxDistance: 10000,
          rolloffFactor: 1,
          coneInnerAngle: 360,
          coneOuterAngle: 360,
          coneOuterGain: 0,
        };
    }
  }

  private initSpatialSettings(): void {
    const container = document.getElementById('spatialSettingsContainer');
    if (!container) return;

    this.spatialSettingsInstance = new SpatialSettings(
      container,
      this.soundManager,
      (config: Partial<SoundPannerConfig>) => {
        // Real-time update of the currently selected sound
        this.soundManager.updatePannerConfigById(this.selectedSound, config);
      }
    );

    // Prefill with current mode defaults
    this.prefillSpatialSettings();
  }

  private prefillSpatialSettings(): void {
    if (!this.spatialSettingsInstance) return;
    const config = this.getSpatialConfigForMode(this.audioMode);
    this.spatialSettingsInstance.setValues(config, true);
    // Apply to current sound
    this.soundManager.updatePannerConfigById(this.selectedSound, config);
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

    gtag('event', 'demo_tab_open', { tab_name: tab, demo: 'spatial' });

    // Only pause the orbit when switching away, so the toggle keeps its state
    // and the orbit picks up again when this tab comes back
    if (tab !== 'free-move') {
      this.pauseOrbit();
      if (this.soundManager.isPlaying(this.selectedSound)) {
        try { this.soundManager.stop(this.selectedSound); } catch { /* ignore */ }
      }
      this.freeMoveSoundStarted = false;
    }

    if (tab === 'free-move') {
      this.teardownChannelIsolation();
      this.startOrbit();
      this.startFreeMoveSound();
    } else if (tab === 'speaker-grid') {
      try { this.initChannelIsolation(); } catch { /* multi-channel not supported on this device */ }
    }
  }

  // ── Free Move ───────────────────────────────────────────────────────────

  private startFreeMoveSound(): void {
    if (!this.audioStarted) return;
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

    // Update spatial position using mode-appropriate panning
    const freePannerCfg: SoundPannerConfig = {
      panningModel: this.audioMode === 'stereo' ? PanningModel.EqualPower : PanningModel.HRTF,
    };
    this.soundManager.setSpatialPosition(
      Math.round(x * 100) / 100,
      0,
      Math.round(z * 100) / 100,
      this.selectedSound,
      freePannerCfg
    );

    // Update info (use textContent instead of innerHTML for performance)
    labelEl.textContent = 'You are placing the sound';
    coordsEl.textContent = `x ${x.toFixed(2)}   y 0.00   z ${z.toFixed(2)}`;
  }

  // ── Auto Rotate ─────────────────────────────────────────────────────────

  private startAutoRotate(speakerEl: HTMLElement, labelEl: HTMLElement, coordsEl: HTMLElement): void {
    if (this.autoRotateRafId !== null) return;

    if (this.audioStarted && !this.freeMoveSoundStarted) {
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

      const rotatePannerCfg: SoundPannerConfig = {
        panningModel: this.audioMode === 'stereo' ? PanningModel.EqualPower : PanningModel.HRTF,
      };
      this.soundManager.setSpatialPosition(
        Math.round(x * 100) / 100,
        0,
        Math.round(z * 100) / 100,
        this.selectedSound,
        rotatePannerCfg,
        true
      );

      // // Update info (use textContent instead of innerHTML for performance)
      labelEl.textContent = 'The sound is orbiting you';
      coordsEl.textContent = `x ${x.toFixed(2)}   y 0.00   z ${z.toFixed(2)}`;

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

  /** Halts the animation without touching the toggle, used for mouse takeover. */
  private pauseOrbit(): void {
    if (this.autoRotateRafId !== null) {
      cancelAnimationFrame(this.autoRotateRafId);
      this.autoRotateRafId = null;
    }
  }

  private stopAutoRotate(): void {
    this.pauseOrbit();
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

  // ── Audio mode & channel isolation (Speaker Grid tab) ──────────────────

  private setAudioMode(mode: AudioMode): void {
    if (this.audioMode === mode) return;
    this.audioMode = mode;
    if (this.soundManager.isPlaying(this.selectedSound)) {
      try { this.soundManager.stop(this.selectedSound); } catch { /* ignore */ }
    }
    this.activeSpeaker = null;
    this.teardownChannelIsolation();
    if (mode !== 'headphones' && mode !== 'stereo' && this.activeTab === 'speaker-grid') {
      try { this.initChannelIsolation(); } catch { /* multi-channel not supported on this device */ }
    }
    this.speakerGridPlaying = false;
    this.updateChannelInfo();
    this.prefillSpatialSettings();
    document.querySelectorAll('.speaker-btn').forEach(b => b.classList.remove('active'));
    const speakerGridStopBtn = document.getElementById('speakerGridStopBtn');
    if (speakerGridStopBtn) speakerGridStopBtn.innerHTML = SVG_STOP;
    const infoEl = document.getElementById('activeSpeakerInfo');
    if (infoEl) infoEl.innerHTML = '<span class="active-label">Click a speaker to test it</span>';
  }

  private updateChannelInfo(): void {
    const el = document.getElementById('channelInfo');
    if (!el) return;

    const maxCh = this.soundManager.getContext().destination.maxChannelCount;

    if (this.audioMode === 'headphones') {
      el.textContent = maxCh >= 4
        ? `HRTF binaural over 2 channels. Your output reports ${maxCh} channels, so the surround modes can address speakers directly.`
        : 'HRTF binaural, mixed down to 2 channels';
      el.className = 'channel-info';
      return;
    }
    if (this.audioMode === 'stereo') {
      el.textContent = 'Equal-power panning between left and right';
      el.className = 'channel-info';
      return;
    }

    const required = MODE_CHANNEL_COUNTS[this.audioMode];

    if (this.channelMerger) {
      el.textContent = `Routing to ${required} discrete channels, one speaker at a time`;
      el.className = 'channel-info channel-info--ok';
    } else if (maxCh < required) {
      el.textContent = `Your output reports ${maxCh} channels and ${required} are needed, so this falls back to simulated 3D over stereo`;
      el.className = 'channel-info channel-info--warn';
    } else {
      el.textContent = `Direct channel routing, ${required} channels`;
      el.className = 'channel-info';
    }
  }

  private initChannelIsolation(): void {
    if (this.channelMerger) return;
    if (this.audioMode === 'headphones' || this.audioMode === 'stereo') return;
    const channelCount = MODE_CHANNEL_COUNTS[this.audioMode];
    const ctx = this.soundManager.getContext();
    const masterOut = this.soundManager.getMasterOutput();
    ctx.destination.channelCount = channelCount;
    ctx.destination.channelCountMode = 'explicit';
    ctx.destination.channelInterpretation = 'discrete';
    this.channelMerger = ctx.createChannelMerger(channelCount);
    this.channelMerger.connect(ctx.destination);
    try { masterOut.disconnect(ctx.destination); } catch { /* already disconnected */ }
    this.updateChannelInfo();
  }

  private teardownChannelIsolation(): void {
    if (!this.channelMerger) return;
    const ctx = this.soundManager.getContext();
    const masterOut = this.soundManager.getMasterOutput();
    try { masterOut.disconnect(this.channelMerger); } catch { /* ignore */ }
    masterOut.connect(ctx.destination);
    ctx.destination.channelCountMode = 'max';
    try { this.channelMerger.disconnect(); } catch { /* ignore */ }
    this.channelMerger = null;
    this.activeChannelIndex = null;
    this.updateChannelInfo();
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

    this.initChannelIsolation();
    this.updateChannelInfo();
  }

  private playSpeaker(speakerId: string): void {
    // Clicking a speaker is a user gesture as well, so the orbit may sound later
    this.audioStarted = true;
    document.getElementById('roomStart')?.classList.add('is-hidden');
    const speaker = SPEAKERS.find(s => s.id === speakerId)!;
    const isCurrentlyPlaying = this.soundManager.isPlaying(this.selectedSound);

    if (this.channelMerger) {
      const channelMap = CHANNEL_MAPS[this.audioMode] ?? {};
      const rawChannel = channelMap[speakerId];
      const channelIndex = rawChannel ?? 0;
      // Neutralize HRTF so the signal reaching the channel merger is centered
      this.soundManager.setSpatialPosition(0, 0, 0, this.selectedSound);
      const masterOut = this.soundManager.getMasterOutput();
      if (this.activeChannelIndex !== null && this.activeChannelIndex !== channelIndex) {
        try { masterOut.disconnect(this.channelMerger, 0, this.activeChannelIndex); } catch { /* ignore */ }
      }
      if (this.activeChannelIndex !== channelIndex) {
        masterOut.connect(this.channelMerger, 0, channelIndex);
        this.activeChannelIndex = channelIndex;
      }
      const infoEl = document.getElementById('activeSpeakerInfo');
      if (infoEl) {
        infoEl.innerHTML = `
          <span class="active-label">Playing from: <strong>${speaker.label}</strong> <span class="channel-note">ch ${channelIndex}</span></span>
          <span class="active-coords">Position: (${speaker.x}, ${speaker.y}, ${speaker.z})</span>
        `;
      }
    } else {
      const pannerCfg: SoundPannerConfig = {
        panningModel: this.audioMode === 'stereo' ? PanningModel.EqualPower : PanningModel.HRTF,
      };
      this.soundManager.setSpatialPosition(speaker.x, speaker.y, speaker.z, this.selectedSound, pannerCfg);
      const infoEl = document.getElementById('activeSpeakerInfo');
      if (infoEl) {
        infoEl.innerHTML = `
          <span class="active-label">Playing from: <strong>${speaker.label}</strong></span>
          <span class="active-coords">Position: (${speaker.x}, ${speaker.y}, ${speaker.z})</span>
        `;
      }
    }

    if (!isCurrentlyPlaying) {
      this.soundManager.play(this.selectedSound);
    }

    // Update speaker grid stop/play button to show "stop" icon
    this.speakerGridPlaying = true;
    const speakerGridStopBtn = document.getElementById('speakerGridStopBtn');
    if (speakerGridStopBtn) speakerGridStopBtn.innerHTML = SVG_STOP;

    this.activeSpeaker = speakerId;

    document.querySelectorAll('.speaker-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll<HTMLButtonElement>(`[data-speaker="${speakerId}"]`).forEach(b => b.classList.add('active'));

    document.querySelectorAll('.coord-row').forEach(row => row.classList.remove('active'));
    document.querySelector(`.coord-row[data-speaker="${speakerId}"]`)?.classList.add('active');
  }
}