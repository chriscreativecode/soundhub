/**
 * soundhub.js example page.
 *
 * Imports the library straight from source, so the page doubles as a smoke
 * test. If the public API changes shape, this file stops compiling.
 *
 * Each card prints the soundhub calls behind the reader's last click. The hub
 * is wrapped in a Proxy for that, so nothing is logged by hand.
 */
import './demo.css';
import { SoundHub, SoundEventsEnum } from '../src/index';
import type { SoundEvent } from '../src/index';

import spriteSheetUrl from './sounds/sprites.mp3';
import laserUrl from './sounds/laser.wav';
import explosionUrl from './sounds/explosion.wav';
import powerUpUrl from './sounds/power-up.wav';
import whooshUrl from './sounds/whoosh.wav';
import musicUrl from './sounds/music.mp3';
import rainUrl from './sounds/rain.mp3';
import birdsUrl from './sounds/birds.mp3';
import helicopterUrl from './sounds/helicopter.mp3';

// ------------------------------------------------------------- helpers ----

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
};

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
};

const panLabel = (pan: number): string =>
  Math.abs(pan) < 0.01 ? 'centre' : pan < 0 ? `left ${Math.round(-pan * 100)}%` : `right ${Math.round(pan * 100)}%`;

// ------------------------------------------------------------ call log ----

/** Calls worth printing. Getters and polling would drown everything else. */
const LOGGED = new Set([
  'play', 'playSprite', 'pause', 'resume', 'stop', 'seek', 'stopAllSounds',
  'fadeIn', 'fadeOut', 'setSoundVolume', 'setGlobalVolume', 'setGlobalPan',
  'mute', 'unmute', 'toggleMute', 'toggleGlobalMute', 'setPlaybackRate',
  'setSpatialPosition', 'setListenerOrientation', 'resetListener',
  'setMasterLimiter', 'loadSound', 'setMediaSession',
]);

const formatValue = (value: unknown): string => {
  if (typeof value === 'string') return value.length > 32 ? `'${value.slice(0, 18)}…${value.slice(-8)}'` : `'${value}'`;
  if (typeof value === 'number') return String(Math.round(value * 100) / 100);
  if (value === undefined) return 'undefined';
  if (value === null || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined);
    return entries.length ? `{ ${entries.map(([k, v]) => `${k}: ${formatValue(v)}`).join(', ')} }` : '{}';
  }
  return String(value);
};

/** The card the reader last touched, so a call lands in the right footer. */
let activeCard: string | null = null;
let lastInputAt = 0;
document.addEventListener('pointerdown', (e) => {
  activeCard = (e.target as HTMLElement).closest<HTMLElement>('[data-card]')?.dataset.card ?? null;
  lastInputAt = performance.now();
}, true);
['keydown', 'input', 'change'].forEach((type) => document.addEventListener(type, (e) => {
  const card = (e.target as HTMLElement).closest?.<HTMLElement>('[data-card]')?.dataset.card;
  if (card) activeCard = card;
  lastInputAt = performance.now();
}, true));

interface Line { text: string; repeats: number; at: number }
const footers = new Map<string, { el: HTMLElement; lines: Line[] }>();

const record = (method: string, args: unknown[]): void => {
  // Only what the reader caused: setup at boot and timers stay out
  if (!activeCard || performance.now() - lastInputAt > 900) return;
  const footer = footers.get(activeCard);
  if (!footer) return;
  const trimmed = [...args];
  while (trimmed.length && trimmed[trimmed.length - 1] === undefined) trimmed.pop();
  const text = `soundHub.${method}(${trimmed.map(formatValue).join(', ')});`;
  const last = footer.lines[footer.lines.length - 1];
  // A dragged slider sends the same call many times; show it once with a count
  const sameCall = last && last.text.split('(')[0] === text.split('(')[0] && performance.now() - last.at < 1200;
  if (sameCall) footer.lines[footer.lines.length - 1] = { text, repeats: last.repeats + 1, at: performance.now() };
  else footer.lines = [...footer.lines, { text, repeats: 1, at: performance.now() }].slice(-3);
  renderFooter(footer);
};

const renderFooter = (footer: { el: HTMLElement; lines: Line[] }): void => {
  const box = footer.el.querySelector('.code__lines')!;
  box.replaceChildren(...footer.lines.map((line) => {
    const span = document.createElement('span');
    span.textContent = line.text;
    if (line.repeats > 1) {
      const em = document.createElement('em');
      em.textContent = `×${line.repeats}`;
      span.append(em);
    }
    return span;
  }));
};

const addFooters = (): void => {
  document.querySelectorAll<HTMLElement>('[data-card]').forEach((card) => {
    const el = document.createElement('div');
    el.className = 'code';
    el.innerHTML = '<span class="code__label">CODE</span><div class="code__lines"><span class="code__idle">Click something to see the calls</span></div>';
    card.append(el);
    footers.set(card.dataset.card!, { el, lines: [] });
  });
};

const instrument = (target: SoundHub): SoundHub => {
  const cache = new Map<PropertyKey, unknown>();
  return new Proxy(target, {
    get(obj, prop) {
      const value = Reflect.get(obj, prop, obj);
      if (typeof value !== 'function') return value;
      if (!cache.has(prop)) {
        cache.set(prop, LOGGED.has(String(prop))
          ? (...args: unknown[]) => { record(String(prop), args); return value.apply(obj, args); }
          : value.bind(obj));
      }
      return cache.get(prop);
    },
  });
};

// ---------------------------------------------------------------- setup ----

const hub = instrument(new SoundHub({
  debug: false,
  masterLimiter: true,
  spatialAudio: true,
  trackProgress: true,
}));

const SOUNDS = [
  { id: 'sprites', url: spriteSheetUrl },
  { id: 'laser', url: laserUrl },
  { id: 'music', url: musicUrl },
  { id: 'rain', url: rainUrl },
  { id: 'birds', url: birdsUrl },
  { id: 'helicopter', url: helicopterUrl },
];

// Known about, not fetched. The button that needs one loads it.
const DEFERRED_SOUNDS = [
  { id: 'explosion', url: explosionUrl, label: 'Explosion' },
  { id: 'power-up', url: powerUpUrl, label: 'Power up' },
  { id: 'whoosh', url: whooshUrl, label: 'Whoosh' },
];

const SPRITES: { [key: string]: [number, number] } = {
  nextLevel: [0, 2],
  powerUp: [2.5, 4.5],
  jump: [4.5, 5.5],
  fail: [6, 8.5],
  catch: [8.5, 9.2],
  danger: [16.5, 18.5],
  victory: [20.5, 22.5],
  attack: [28, 29.5],
};

const SPRITE_LABELS: { [key: string]: string } = {
  nextLevel: 'Next level', powerUp: 'Power up', jump: 'Jump', fail: 'Fail',
  catch: 'Catch', danger: 'Danger', victory: 'Victory', attack: 'Attack',
};

const PLAY_ICON = 'M8 5.5v13l11-6.5z';
const PAUSE_ICON = 'M7 5h3.5v14H7zm6.5 0H17v14h-3.5z';

// ------------------------------------------------------ sound states ----

/** Which sounds are playing, from the hub's own events. */
const playing = new Set<string>();
const stateListeners = new Set<() => void>();
const onState = (fn: () => void): void => { stateListeners.add(fn); };
const emitState = (): void => stateListeners.forEach((fn) => fn());

const markOn = (e: SoundEvent): void => { if (e.soundId) { playing.add(e.soundId); emitState(); } };
const markOff = (e: SoundEvent): void => { if (e.soundId) { playing.delete(e.soundId); emitState(); } };
hub.addEventListener(SoundEventsEnum.STARTED, markOn);
hub.addEventListener(SoundEventsEnum.RESUMED, markOn);
hub.addEventListener(SoundEventsEnum.PAUSED, markOff);
hub.addEventListener(SoundEventsEnum.STOPPED, markOff);
hub.addEventListener(SoundEventsEnum.ENDED, markOff);
hub.addEventListener(SoundEventsEnum.UNLOADED, markOff);

const stateOf = (id: string): string => hub.getSoundState(id).state ?? 'stopped';

const setBadge = (el: HTMLElement, state: string): void => {
  el.textContent = state;
  el.classList.toggle('is-playing', state === 'playing');
  el.classList.toggle('is-paused', state === 'paused');
};

// ----------------------------------------------------------- event log ----

const logEl = $<HTMLOListElement>('log');
const showProgress = $<HTMLInputElement>('showProgress');
const logPaused = $<HTMLInputElement>('logPaused');

const describe = (event: SoundEvent): string => {
  const bits: string[] = [];
  if (event.soundId) bits.push(event.soundId);
  if (event.volume !== undefined) bits.push(`volume ${event.volume.toFixed(2)}`);
  if (event.pan !== undefined) bits.push(`pan ${event.pan.toFixed(2)}`);
  if (event.playbackRate !== undefined) bits.push(`rate ${event.playbackRate.toFixed(2)}`);
  if (event.progress !== undefined) bits.push(`${(event.progress * 100).toFixed(0)}%`);
  if (event.position) bits.push(`xyz ${event.position.x.toFixed(1)}, ${event.position.y.toFixed(1)}, ${event.position.z.toFixed(1)}`);
  if (event.isMuted !== undefined) bits.push(event.isMuted ? 'muted' : 'unmuted');
  if (event.error) bits.push(event.error.message);
  return bits.join(' · ');
};

const toneOf = (type: string): string => {
  if (type.includes('error')) return 't-danger';
  if (type.includes('start') || type.includes('resume') || type === 'loaded') return 't-on';
  if (type.includes('stop') || type.includes('end') || type.includes('pause')) return 't-warn';
  if (type.includes('fade') || type.includes('mute')) return 't-accent';
  return '';
};

const appendLog = (event: SoundEvent): void => {
  if (logPaused.checked) return;
  if (event.type === SoundEventsEnum.PROGRESS && !showProgress.checked) return;
  logEl.querySelector('.log__empty')?.remove();

  const li = document.createElement('li');
  const time = document.createElement('time');
  const type = document.createElement('b');
  const detail = document.createElement('span');
  time.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false });
  type.textContent = event.type;
  type.className = toneOf(event.type);
  detail.textContent = describe(event);
  li.append(time, type, detail);
  logEl.prepend(li);
  while (logEl.childElementCount > 200) logEl.lastElementChild?.remove();
};

// One listener per event type: the whole surface of the library on one bus
Object.values(SoundEventsEnum).forEach((type) => hub.addEventListener(type as SoundEventsEnum, appendLog));

$('logClear').addEventListener('click', () => {
  logEl.innerHTML = '<li class="log__empty">Nothing yet. Play something.</li>';
});

// -------------------------------------------------------------- master ----

const masterVol = $<HTMLInputElement>('masterVol');
masterVol.addEventListener('input', () => {
  const value = Number(masterVol.value);
  hub.setGlobalVolume(value);
  $('masterVolOut').textContent = `${Math.round(value * 100)}%`;
});

const masterPan = $<HTMLInputElement>('masterPan');
masterPan.addEventListener('input', () => {
  const value = Number(masterPan.value);
  hub.setGlobalPan(value);
  $('masterPanOut').textContent = panLabel(value);
});

const masterMute = $<HTMLButtonElement>('masterMute');
masterMute.addEventListener('click', () => {
  hub.toggleGlobalMute();
  const muted = masterMute.getAttribute('aria-pressed') !== 'true';
  masterMute.setAttribute('aria-pressed', String(muted));
  masterMute.textContent = muted ? 'Unmute all' : 'Mute all';
});

$('stopAll').addEventListener('click', () => {
  stopOrbit();
  hub.stopAllSounds();
});

const limiterEl = $<HTMLInputElement>('limiter');
limiterEl.addEventListener('change', () => hub.setMasterLimiter(limiterEl.checked));

/** A stereo level meter on the master output. It only listens, it does not play. */
const startMeter = (): void => {
  const ctx = hub.getContext();
  const splitter = ctx.createChannelSplitter(2);
  const analysers = [ctx.createAnalyser(), ctx.createAnalyser()];
  hub.getMasterOutput().connect(splitter);
  analysers.forEach((analyser, i) => {
    analyser.fftSize = 512;
    splitter.connect(analyser, i);
  });
  const bars = [$('levelL'), $('levelR')];
  const data = new Float32Array(512);
  const tick = (): void => {
    analysers.forEach((analyser, i) => {
      analyser.getFloatTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v));
      bars[i].style.width = `${Math.min(100, peak * 100)}%`;
    });
    requestAnimationFrame(tick);
  };
  tick();
};

// ------------------------------------------------------------- sprites ----

const buildSprites = (): void => {
  const pads = $('spritePads');
  const timeline = $('spriteTimeline');
  const total = hub.getDuration('sprites') || 30;
  Object.entries(SPRITES).forEach(([key, [start, end]]) => {
    const pad = document.createElement('button');
    pad.className = 'pad';
    pad.innerHTML = `<b>${SPRITE_LABELS[key]}</b><small>${start} to ${end} s</small>`;
    pad.addEventListener('click', () => hub.playSprite('sprites', key));
    pads.append(pad);

    const region = document.createElement('i');
    region.style.left = `${(start / total) * 100}%`;
    region.style.width = `${((end - start) / total) * 100}%`;
    region.title = SPRITE_LABELS[key];
    timeline.append(region);

    // playSprite plays each key as its own sound, under this id
    onState(() => {
      const on = playing.has(`sprites_${key}`);
      pad.classList.toggle('is-playing', on);
      region.classList.toggle('is-playing', on);
    });
  });
};

// ------------------------------------------------------------- overlap ----

const slots = $('laserSlots');
for (let i = 0; i < 16; i += 1) slots.append(document.createElement('i'));

/** Overlapping instances play under ids like laser:1; the base id stays stopped. */
const laserInstances = (): string[] => [...playing].filter((id) => id !== 'laser' && id.startsWith('laser'));

onState(() => {
  const count = laserInstances().length;
  $('laserCount').textContent = String(count);
  [...slots.children].forEach((slot, i) => slot.classList.toggle('is-on', i < count));
});

const fireLaser = (): void => { hub.play('laser', { overlap: true, groupId: 'lasers', volume: 0.7 }); };
$('laser').addEventListener('click', fireLaser);
$('laserBurst').addEventListener('click', () => {
  for (let i = 0; i < 12; i += 1) window.setTimeout(fireLaser, i * 40);
});
$('laserStop').addEventListener('click', () => laserInstances().forEach((id) => hub.stop(id)));

// -------------------------------------------------------------- player ----

const seekEl = $<HTMLInputElement>('seek');
const musicToggle = $<HTMLButtonElement>('musicToggle');
const musicMute = $<HTMLButtonElement>('musicMute');
const musicVol = $<HTMLInputElement>('musicVol');
let scrubbing = false;

hub.addEventListener(SoundEventsEnum.PROGRESS, (event) => {
  const info = event.progressInfo;
  if (scrubbing || !info) return;
  seekEl.value = String(Math.round(info.progress * 1000));
  $('timeNow').textContent = formatTime(info.currentTime);
}, { soundId: 'music' });

onState(() => {
  const state = stateOf('music');
  setBadge($('musicState'), state);
  $('musicIcon').setAttribute('d', state === 'playing' ? PAUSE_ICON : PLAY_ICON);
  musicToggle.setAttribute('aria-label', state === 'playing' ? 'Pause' : 'Play');
  if (state === 'stopped') { seekEl.value = '0'; $('timeNow').textContent = '0:00'; }
});

musicToggle.addEventListener('click', () => {
  const state = stateOf('music');
  if (state === 'playing') hub.pause('music');
  else if (state === 'paused') hub.resume('music');
  else hub.play('music', { volume: Number(musicVol.value), trackProgress: true });
});
$('musicStop').addEventListener('click', () => hub.stop('music'));
$('musicFadeIn').addEventListener('click', () => {
  if (stateOf('music') !== 'playing') hub.play('music', { volume: 0, trackProgress: true });
  hub.fadeIn('music', 3, 0, Number(musicVol.value));
});
$('musicFadeOut').addEventListener('click', () => hub.fadeOut('music', 3, undefined, 0, true));

const refreshMute = (button: HTMLButtonElement, muted: boolean): void => {
  button.setAttribute('aria-pressed', String(muted));
  button.textContent = muted ? 'Unmute' : 'Mute';
};

musicMute.addEventListener('click', () => hub.toggleMute('music'));
hub.addEventListener(SoundEventsEnum.MUTED, () => refreshMute(musicMute, true), { soundId: 'music' });
hub.addEventListener(SoundEventsEnum.UNMUTED, () => refreshMute(musicMute, false), { soundId: 'music' });
// setSoundVolume ends a mute without an unmuted event, so the slider resets the button too
musicVol.addEventListener('input', () => {
  const value = Number(musicVol.value);
  $('musicVolOut').textContent = `${Math.round(value * 100)}%`;
  hub.setSoundVolume('music', value);
  refreshMute(musicMute, false);
});

seekEl.addEventListener('pointerdown', () => { scrubbing = true; });
seekEl.addEventListener('input', () => {
  $('timeNow').textContent = formatTime((Number(seekEl.value) / 1000) * hub.getDuration('music'));
});
seekEl.addEventListener('change', () => {
  // A position in the file: getDuration and seek share that scale at any rate
  hub.seek('music', (Number(seekEl.value) / 1000) * hub.getDuration('music'));
  scrubbing = false;
});

const rateEl = $<HTMLInputElement>('rate');
rateEl.addEventListener('input', () => {
  const rate = Number(rateEl.value);
  hub.setPlaybackRate('music', rate);
  $('rateOut').textContent = `${rate.toFixed(2)}×`;
});

// -------------------------------------------------------------- groups ----

const refreshGroup = (): void => {
  const members = Array.from(hub.getGroup('ambience')?.sounds ?? []);
  $('groupMembers').textContent = members.length ? members.join(', ') : 'empty';
};

(['rain', 'birds'] as const).forEach((id) => {
  const button = $<HTMLButtonElement>(id);
  button.addEventListener('click', () => {
    // No options: the group's playOptions apply
    if (playing.has(id)) hub.stop(id);
    else hub.play(id, { groupId: 'ambience' });
    refreshGroup();
  });
  onState(() => {
    const on = playing.has(id);
    button.classList.toggle('is-playing', on);
    button.setAttribute('aria-pressed', String(on));
  });
});

$('ambienceStop').addEventListener('click', () => {
  hub.getGroup('ambience')?.sounds.forEach((id) => hub.stop(id));
  refreshGroup();
});

// ------------------------------------------------------------- spatial ----

const RANGE = 10;
const radar = $('radar');
const heliDot = $('radarHeli');
const heliToggle = $<HTMLButtonElement>('heliToggle');
const orbitBtn = $<HTMLButtonElement>('heliOrbit');
const heli = { x: 3, z: -4 };
let orbiting = false;
let facingBackwards = false;

const drawHeli = (): void => {
  heliDot.style.left = `${((heli.x + RANGE) / (2 * RANGE)) * 100}%`;
  heliDot.style.top = `${((heli.z + RANGE) / (2 * RANGE)) * 100}%`;
  $('heliPos').textContent = `${heli.x.toFixed(1)}, 0, ${heli.z.toFixed(1)}`;
};

const placeHeli = (x: number, z: number): void => {
  heli.x = Math.max(-RANGE, Math.min(RANGE, x));
  heli.z = Math.max(-RANGE, Math.min(RANGE, z));
  drawHeli();
  if (playing.has('helicopter')) hub.setSpatialPosition(heli.x, 0, heli.z, 'helicopter');
};

const fromPointer = (e: PointerEvent): void => {
  const box = radar.getBoundingClientRect();
  const x = ((e.clientX - box.left) / box.width) * 2 * RANGE - RANGE;
  const z = ((e.clientY - box.top) / box.height) * 2 * RANGE - RANGE;
  placeHeli(Math.round(x * 10) / 10, Math.round(z * 10) / 10);
};

let dragging = false;
radar.addEventListener('pointerdown', (e) => {
  dragging = true;
  stopOrbit();
  radar.setPointerCapture(e.pointerId);
  fromPointer(e);
});
radar.addEventListener('pointermove', (e) => { if (dragging) fromPointer(e); });
radar.addEventListener('pointerup', () => { dragging = false; });

onState(() => {
  const on = playing.has('helicopter');
  heliDot.classList.toggle('is-playing', on);
  heliToggle.textContent = on ? 'Stop helicopter' : 'Start helicopter';
  heliToggle.classList.toggle('btn--primary', !on);
  orbitBtn.disabled = !on;
  if (!on) stopOrbit();
});

heliToggle.addEventListener('click', () => {
  if (playing.has('helicopter')) {
    hub.stop('helicopter');
    return;
  }
  hub.play('helicopter', { loop: true, volume: 0.8 });
  // Positioning it is what gives the sound its 3D panner
  hub.setSpatialPosition(heli.x, 0, heli.z, 'helicopter');
});

const stopOrbit = (): void => {
  orbiting = false;
  orbitBtn.setAttribute('aria-pressed', 'false');
};

orbitBtn.addEventListener('click', () => {
  orbiting = !orbiting;
  orbitBtn.setAttribute('aria-pressed', String(orbiting));
  if (!orbiting) return;
  let angle = Math.atan2(heli.z, heli.x);
  const radius = Math.max(3, Math.hypot(heli.x, heli.z));
  let last = performance.now();
  const step = (now: number): void => {
    if (!orbiting) return;
    angle += ((now - last) / 1000) * 0.9;
    last = now;
    placeHeli(Math.cos(angle) * radius, Math.sin(angle) * radius);
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
});

const earTurn = $<HTMLButtonElement>('earTurn');
earTurn.addEventListener('click', () => {
  facingBackwards = !facingBackwards;
  earTurn.setAttribute('aria-pressed', String(facingBackwards));
  $('radarMe').classList.toggle('is-turned', facingBackwards);
  hub.setListenerOrientation(0, 0, facingBackwards ? 1 : -1);
});

$('earReset').addEventListener('click', () => {
  facingBackwards = false;
  earTurn.setAttribute('aria-pressed', 'false');
  $('radarMe').classList.remove('is-turned');
  hub.resetListener();
});

// -------------------------------------------------------------- stream ----

const streamSeek = $<HTMLInputElement>('streamSeek');
const streamToggle = $<HTMLButtonElement>('streamToggle');
const streamMute = $<HTMLButtonElement>('streamMute');
let streamScrubbing = false;

hub.addEventListener(SoundEventsEnum.PROGRESS, (event) => {
  const info = event.progressInfo;
  if (streamScrubbing || !info) return;
  streamSeek.value = String(Math.round(info.progress * 1000));
  $('streamNow').textContent = formatTime(info.currentTime);
  $('streamTotal').textContent = formatTime(info.duration);
  // Only a media element can tell how much has actually arrived
  const element = hub.getStreamElement('podcast');
  if (element?.buffered.length && info.duration) {
    $('streamBuffered').style.width = `${(element.buffered.end(element.buffered.length - 1) / info.duration) * 100}%`;
  }
}, { soundId: 'podcast' });

onState(() => {
  const state = stateOf('podcast');
  setBadge($('streamState'), state);
  $('streamIcon').setAttribute('d', state === 'playing' ? PAUSE_ICON : PLAY_ICON);
  streamToggle.setAttribute('aria-label', state === 'playing' ? 'Pause' : 'Play');
});

// once(): say something the first time the stream reaches the end, then stop listening
hub.once(SoundEventsEnum.ENDED, () => { $('streamState').textContent = 'finished'; }, { soundId: 'podcast' });

streamToggle.addEventListener('click', () => {
  const state = stateOf('podcast');
  if (state === 'playing') return hub.pause('podcast');
  if (state === 'paused') return hub.resume('podcast');
  hub.play('podcast', { trackProgress: true });
  // Puts it on the lock screen and makes the media keys work
  hub.setMediaSession('podcast', {
    title: 'soundhub.js streaming example',
    artist: 'Chris Schardijn',
    seekBackwardOffset: 15,
    seekForwardOffset: 30,
  });
});

$('streamBack').addEventListener('click', () => hub.seek('podcast', Math.max(0, hub.getCurrentTime('podcast') - 15)));
$('streamForward').addEventListener('click', () => hub.seek('podcast', hub.getCurrentTime('podcast') + 30));

streamMute.addEventListener('click', () => hub.toggleMute('podcast'));
hub.addEventListener(SoundEventsEnum.MUTED, () => refreshMute(streamMute, true), { soundId: 'podcast' });
hub.addEventListener(SoundEventsEnum.UNMUTED, () => refreshMute(streamMute, false), { soundId: 'podcast' });

streamSeek.addEventListener('pointerdown', () => { streamScrubbing = true; });
streamSeek.addEventListener('change', () => {
  hub.seek('podcast', (Number(streamSeek.value) / 1000) * hub.getDuration('podcast'));
  streamScrubbing = false;
});

const streamRate = $<HTMLInputElement>('streamRate');
streamRate.addEventListener('input', () => {
  const rate = Number(streamRate.value);
  hub.setPlaybackRate('podcast', rate);
  $('streamRateOut').textContent = `${rate.toFixed(2)}×`;
});

// ------------------------------------------------------------ deferred ----

const buildDeferred = (): void => {
  const list = $('deferredList');
  DEFERRED_SOUNDS.forEach(({ id, label }) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="name">${id}</span><span class="state"></span>`;
    const state = li.querySelector<HTMLElement>('.state')!;
    const button = document.createElement('button');
    button.className = 'btn';
    button.textContent = label;
    li.append(button);
    list.append(li);

    const refresh = (): void => {
      const load = hub.getLoadState(id);
      state.textContent = load;
      state.dataset.state = load;
      button.disabled = load === 'loading';
    };
    refresh();

    button.addEventListener('click', async () => {
      if (hub.getLoadState(id) !== 'loaded') {
        const pending = hub.loadSound(id);
        refresh();
        await pending;
      }
      hub.play(id, { overlap: true });
      refresh();
    });
  });
};

// ------------------------------------------------------------- status ----

const refreshStatus = (): void => {
  const ctxState = hub.getContext().state;
  const chip = $('chipContext');
  chip.querySelector('em')!.textContent = ctxState;
  chip.classList.toggle('is-on', ctxState === 'running');
  chip.classList.toggle('is-warn', ctxState !== 'running');
  $('wake').hidden = ctxState === 'running';
  $('chipSounds').querySelector('em')!.textContent = String(hub.getSoundCount());
  const count = playing.size;
  $('chipPlaying').querySelector('em')!.textContent = String(count);
  $('chipPlaying').classList.toggle('is-on', count > 0);
};
onState(refreshStatus);

/** Highlight the section in view in the top nav. */
const watchSections = (): void => {
  const links = new Map([...document.querySelectorAll<HTMLAnchorElement>('.sections a')].map((a) => [a.hash.slice(1), a]));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((a) => a.classList.remove('is-active'));
      links.get(entry.target.id)?.classList.add('is-active');
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  document.querySelectorAll('main > section').forEach((section) => observer.observe(section));
};

// ---------------------------------------------------------------- boot ----

const boot = async (): Promise<void> => {
  $('version').textContent = `v${hub.getVersion()}`;

  await hub.loadSounds(SOUNDS);
  hub.registerSounds(DEFERRED_SOUNDS.map(({ id, url }) => ({ id, url })));

  // Same file, loaded the other way: the browser streams it instead of
  // decoding it into memory. With a real podcast that is the difference
  // between a few hundred kilobytes and several hundred megabytes.
  await hub.loadStream('podcast', musicUrl, { volume: 0.8, trackProgress: true });

  hub.setSoundSprite('sprites', SPRITES);
  hub.createSoundGroup('ambience', { playOptions: { loop: true, volume: 0.4 } });
  hub.createSoundGroup('lasers', { maxInstances: 16 });

  addFooters();
  buildSprites();
  buildDeferred();
  drawHeli();
  refreshGroup();
  startMeter();
  watchSections();
  $('formats').textContent = hub.getSupportedFormats().join(', ');
  $('timeTotal').textContent = formatTime(hub.getDuration('music'));
  $('streamTotal').textContent = formatTime(hub.getDuration('podcast'));
  hub.getContext().addEventListener('statechange', refreshStatus);
  emitState();

  $('loading').hidden = true;
  $('app').hidden = false;
};

boot().catch((error: unknown) => {
  $('loading').textContent = `Could not load the example sounds: ${String(error)}`;
});
