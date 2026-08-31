/**
 * soundhub.js example page.
 *
 * Imports the library straight from source, so the page doubles as a smoke
 * test. If the public API changes shape, this file stops compiling.
 */
import './demo.css';
import { SoundHub, SoundEventsEnum, SoundPanType } from '../src/index';
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

// ---------------------------------------------------------------- setup ----

const hub = new SoundHub({
  debug: false,
  masterLimiter: true,
  spatialAudio: true,
  trackProgress: true,
});

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
  { id: 'explosion', url: explosionUrl },
  { id: 'power-up', url: powerUpUrl },
  { id: 'whoosh', url: whooshUrl },
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
  nextLevel: 'Next level',
  powerUp: 'Power up',
  jump: 'Jump',
  fail: 'Fail',
  catch: 'Catch',
  danger: 'Danger',
  victory: 'Victory',
  attack: 'Attack',
};

// ------------------------------------------------------------- helpers ----

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
};

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

// ----------------------------------------------------------- event log ----

const logEl = $<HTMLOListElement>('log');
const showProgressEl = $<HTMLInputElement>('showProgress');

const describe = (event: SoundEvent): string => {
  const bits: string[] = [];
  if (event.volume !== undefined) bits.push(`volume=${event.volume.toFixed(2)}`);
  if (event.pan !== undefined) bits.push(`pan=${event.pan.toFixed(2)}`);
  if (event.playbackRate !== undefined) bits.push(`rate=${event.playbackRate.toFixed(2)}`);
  if (event.progress !== undefined) bits.push(`progress=${(event.progress * 100).toFixed(0)}%`);
  if (event.position) bits.push(`xyz=${event.position.x.toFixed(1)},${event.position.y.toFixed(1)},${event.position.z.toFixed(1)}`);
  if (event.isMuted !== undefined) bits.push(`muted=${event.isMuted}`);
  if (event.error) bits.push(event.error.message);
  return bits.join('  ');
};

const appendLog = (event: SoundEvent): void => {
  if (event.type === SoundEventsEnum.PROGRESS && !showProgressEl.checked) return;

  const li = document.createElement('li');
  const time = document.createElement('span');
  const type = document.createElement('span');
  const detail = document.createElement('span');

  time.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false });
  type.textContent = event.type;
  detail.textContent = [event.soundId, describe(event)].filter(Boolean).join('  ');

  li.append(time, type, detail);
  logEl.prepend(li);

  while (logEl.childElementCount > 200) logEl.lastElementChild?.remove();
};

// One listener per event type. The whole surface of the library on one bus.
Object.values(SoundEventsEnum).forEach((type) => {
  hub.addEventListener(type as SoundEventsEnum, appendLog);
});

$('logClear').addEventListener('click', () => {
  logEl.replaceChildren();
});

// -------------------------------------------------------------- master ----

const masterVol = $<HTMLInputElement>('masterVol');
const masterVolOut = $<HTMLOutputElement>('masterVolOut');
masterVol.addEventListener('input', () => {
  const value = Number(masterVol.value);
  hub.setGlobalVolume(value);
  masterVolOut.textContent = `${Math.round(value * 100)}%`;
});

const masterPan = $<HTMLInputElement>('masterPan');
const masterPanOut = $<HTMLOutputElement>('masterPanOut');
masterPan.addEventListener('input', () => {
  const value = Number(masterPan.value);
  hub.setGlobalPan(value);
  masterPanOut.textContent = value.toFixed(2);
});

$('masterMute').addEventListener('click', (e) => {
  hub.toggleGlobalMute();
  (e.currentTarget as HTMLButtonElement).classList.toggle('on');
});

$('stopAll').addEventListener('click', () => {
  hub.stopAllSounds();
  orbiting = false;
});

const limiterEl = $<HTMLInputElement>('limiter');
limiterEl.addEventListener('change', () => {
  hub.setMasterLimiter(limiterEl.checked);
});

// ------------------------------------------------------------- sprites ----

const buildSprites = (): void => {
  const grid = $('spriteGrid');
  Object.keys(SPRITES).forEach((key) => {
    const [start, end] = SPRITES[key];
    const button = document.createElement('button');
    button.className = 'sprite';
    button.innerHTML = `<b>${SPRITE_LABELS[key]}</b><small>${start.toFixed(1)}s → ${end.toFixed(1)}s</small>`;
    button.addEventListener('click', () => hub.playSprite('sprites', key));
    grid.append(button);
  });
};

// -------------------------------------------------------- multichannel ----

const laserCountEl = $('laserCount');

const countLaserInstances = (): number =>
  hub.getSoundIds().filter((id) => id.startsWith('laser')).length;

const refreshLaserCount = (): void => {
  laserCountEl.textContent = String(countLaserInstances());
};

const fireLaser = (): void => {
  hub.play('laser', { overlap: true, groupId: 'lasers', volume: 0.7 });
  refreshLaserCount();
};

$('laser').addEventListener('click', fireLaser);

$('laserBurst').addEventListener('click', () => {
  for (let i = 0; i < 12; i += 1) window.setTimeout(fireLaser, i * 40);
});

$('laserStop').addEventListener('click', () => {
  hub.getGroup('lasers')?.sounds.forEach((id) => hub.stop(id));
  refreshLaserCount();
});

// --------------------------------------------------- deferred loading ----

const lazyStateEl = $('lazyState');

const refreshLazyState = (): void => {
  lazyStateEl.textContent = DEFERRED_SOUNDS
    .map(({ id }) => `${id}: ${hub.getLoadState(id)}`)
    .join('   ');
};

const playWhenLoaded = async (id: string): Promise<void> => {
  if (hub.getLoadState(id) !== 'loaded') {
    refreshLazyState();
    await hub.loadSound(id);
  }
  hub.play(id, { overlap: true });
  refreshLazyState();
};

$('lazyExplosion').addEventListener('click', () => void playWhenLoaded('explosion'));
$('lazyPowerUp').addEventListener('click', () => void playWhenLoaded('power-up'));
$('lazyWhoosh').addEventListener('click', () => void playWhenLoaded('whoosh'));

// -------------------------------------------------- progress & transport ---

const seekEl = $<HTMLInputElement>('seek');
const timeNow = $('timeNow');
const timeTotal = $('timeTotal');
const musicState = $('musicState');
let scrubbing = false;

// The filter does the id check, so the callback only handles this one sound.
hub.addEventListener(SoundEventsEnum.PROGRESS, (event) => {
  if (scrubbing) return;
  const info = event.progressInfo;
  if (!info) return;
  seekEl.value = String(Math.round(info.progress * 1000));
  timeNow.textContent = formatTime(info.currentTime);
  timeTotal.textContent = formatTime(info.duration);
}, { soundId: 'music' });

const refreshMusicState = (): void => {
  musicState.textContent = hub.getSoundState('music').state ?? 'stopped';
};

[
  SoundEventsEnum.STARTED,
  SoundEventsEnum.PAUSED,
  SoundEventsEnum.RESUMED,
  SoundEventsEnum.STOPPED,
  SoundEventsEnum.ENDED,
].forEach((type) => hub.addEventListener(type, refreshMusicState));

$('musicPlay').addEventListener('click', () => {
  hub.play('music', { volume: 0.8, trackProgress: true });
  timeTotal.textContent = formatTime(hub.getDuration('music'));
});
$('musicPause').addEventListener('click', () => hub.pause('music'));
$('musicResume').addEventListener('click', () => hub.resume('music'));
$('musicStop').addEventListener('click', () => hub.stop('music'));
$('musicFadeIn').addEventListener('click', () => hub.fadeIn('music', 3, 0, 0.8));
$('musicFadeOut').addEventListener('click', () => hub.fadeOut('music', 3, undefined, 0, true));

seekEl.addEventListener('pointerdown', () => { scrubbing = true; });
seekEl.addEventListener('change', () => {
  const ratio = Number(seekEl.value) / 1000;
  hub.seek('music', ratio * hub.getDuration('music'));
  scrubbing = false;
});

const rateEl = $<HTMLInputElement>('rate');
const rateOut = $<HTMLOutputElement>('rateOut');
rateEl.addEventListener('input', () => {
  const rate = Number(rateEl.value);
  hub.setPlaybackRate('music', rate);
  rateOut.textContent = `${rate.toFixed(2)}×`;
});

// -------------------------------------------------------------- groups ----

const groupMembers = $('groupMembers');

const refreshGroup = (): void => {
  const members = Array.from(hub.getGroup('ambience')?.sounds ?? []);
  groupMembers.textContent = members.length ? members.join(', ') : 'empty';
};

const playIntoAmbience = (id: string): void => {
  hub.play(id, { groupId: 'ambience' });
  refreshGroup();
};

$('rain').addEventListener('click', () => playIntoAmbience('rain'));
$('birds').addEventListener('click', () => playIntoAmbience('birds'));
$('ambienceStop').addEventListener('click', () => {
  hub.getGroup('ambience')?.sounds.forEach((id) => hub.stop(id));
  refreshGroup();
});

// ------------------------------------------------------------- spatial ----

const heliX = $<HTMLInputElement>('heliX');
const heliZ = $<HTMLInputElement>('heliZ');
const heliXOut = $<HTMLOutputElement>('heliXOut');
const heliZOut = $<HTMLOutputElement>('heliZOut');
let orbiting = false;

const moveHelicopter = (): void => {
  const x = Number(heliX.value);
  const z = Number(heliZ.value);
  heliXOut.textContent = x.toFixed(1);
  heliZOut.textContent = z.toFixed(1);
  hub.setSpatialPosition(x, 0, z, 'helicopter');
};

heliX.addEventListener('input', moveHelicopter);
heliZ.addEventListener('input', moveHelicopter);

$('heliPlay').addEventListener('click', () => {
  hub.play('helicopter', {
    loop: true,
    volume: 0.8,
    panType: SoundPanType.Spatial,
    panSpatialPosition: { x: Number(heliX.value), y: 0, z: Number(heliZ.value) },
  });
});

$('heliStop').addEventListener('click', () => {
  orbiting = false;
  hub.stop('helicopter');
});

const earX = $<HTMLInputElement>('earX');
const earXOut = $<HTMLOutputElement>('earXOut');
let facingBackwards = false;

earX.addEventListener('input', () => {
  const x = Number(earX.value);
  earXOut.textContent = x.toFixed(1);
  hub.setListenerPosition(x, 0, 0);
});

$('earTurn').addEventListener('click', (e) => {
  facingBackwards = !facingBackwards;
  (e.currentTarget as HTMLButtonElement).classList.toggle('on', facingBackwards);
  hub.setListenerOrientation(0, 0, facingBackwards ? 1 : -1);
});

$('earReset').addEventListener('click', () => {
  facingBackwards = false;
  $('earTurn').classList.remove('on');
  earX.value = '0';
  earXOut.textContent = '0.0';
  hub.resetListener();
});

$('heliOrbit').addEventListener('click', (e) => {
  orbiting = !orbiting;
  (e.currentTarget as HTMLButtonElement).classList.toggle('on', orbiting);
  if (orbiting) requestAnimationFrame(orbit);
});

const orbit = (now: number): void => {
  if (!orbiting) return;
  const angle = (now / 2000) % (Math.PI * 2);
  heliX.value = (Math.sin(angle) * 8).toFixed(1);
  heliZ.value = (Math.cos(angle) * 8).toFixed(1);
  moveHelicopter();
  requestAnimationFrame(orbit);
};

// ----------------------------------------------------------- streaming ----

const streamSeekEl = $<HTMLInputElement>('streamSeek');
const streamNow = $('streamNow');
const streamTotal = $('streamTotal');
const streamStateEl = $('streamState');
let streamScrubbing = false;

const refreshStreamState = (): void => {
  streamStateEl.textContent = hub.getSoundState('podcast').state ?? 'stopped';
};

hub.addEventListener(SoundEventsEnum.PROGRESS, (event) => {
  if (streamScrubbing) return;
  const info = event.progressInfo;
  if (!info) return;
  streamSeekEl.value = String(Math.round(info.progress * 1000));
  streamNow.textContent = formatTime(info.currentTime);
  streamTotal.textContent = formatTime(info.duration);
}, { soundId: 'podcast' });

// One-shot: say something the first time this stream reaches the end, then stop
// listening. Without once() this would either fire forever or leak a listener.
hub.once(SoundEventsEnum.ENDED, () => {
  streamStateEl.textContent = 'finished';
}, { soundId: 'podcast' });

$('streamPlay').addEventListener('click', () => {
  hub.play('podcast', { volume: Number($<HTMLInputElement>('streamVol').value), trackProgress: true });

  // Puts this on the lock screen and makes the media keys work. Try it on a
  // phone, or press the play/pause key on a keyboard with the tab in the
  // background.
  hub.setMediaSession('podcast', {
    title: 'soundhub.js streaming example',
    artist: 'Chris Schardijn',
    seekBackwardOffset: 15,
    seekForwardOffset: 30,
  });

  refreshStreamState();
});
$('streamPause').addEventListener('click', () => { hub.pause('podcast'); refreshStreamState(); });
$('streamResume').addEventListener('click', () => { hub.resume('podcast'); refreshStreamState(); });
$('streamStop').addEventListener('click', () => { hub.stop('podcast'); refreshStreamState(); });
$('streamMute').addEventListener('click', (e) => {
  hub.toggleMute('podcast');
  (e.currentTarget as HTMLButtonElement).classList.toggle('on');
});

streamSeekEl.addEventListener('pointerdown', () => { streamScrubbing = true; });
streamSeekEl.addEventListener('change', () => {
  hub.seek('podcast', (Number(streamSeekEl.value) / 1000) * hub.getDuration('podcast'));
  streamScrubbing = false;
});

const streamRate = $<HTMLInputElement>('streamRate');
const streamRateOut = $<HTMLOutputElement>('streamRateOut');
streamRate.addEventListener('input', () => {
  const rate = Number(streamRate.value);
  hub.setPlaybackRate('podcast', rate);
  streamRateOut.textContent = `${rate.toFixed(2)}×`;
});

const streamVol = $<HTMLInputElement>('streamVol');
const streamVolOut = $<HTMLOutputElement>('streamVolOut');
streamVol.addEventListener('input', () => {
  const value = Number(streamVol.value);
  hub.setSoundVolume('podcast', value);
  streamVolOut.textContent = `${Math.round(value * 100)}%`;
});

// --------------------------------------------------------------- stats ----

const refreshStats = (): void => {
  $('statContext').textContent = hub.getContext().state;
  $('statCount').textContent = String(hub.getSoundCount());
  $('statReady').textContent = hub.isReady() ? 'yes' : 'no';
  refreshLaserCount();
};

// ---------------------------------------------------------------- boot ----

const boot = async (): Promise<void> => {
  await hub.loadSounds(SOUNDS);
  hub.registerSounds(DEFERRED_SOUNDS);

  // Same file, loaded the other way: the browser streams it instead of
  // decoding it into memory. With a real podcast this is the difference
  // between a few hundred kilobytes and several hundred megabytes.
  await hub.loadStream('podcast', musicUrl, { volume: 0.8, trackProgress: true });

  hub.setSoundSprite('sprites', SPRITES);
  hub.createSoundGroup('ambience', { playOptions: { loop: true, volume: 0.4 } });
  hub.createSoundGroup('lasers', { maxInstances: 16 });

  buildSprites();
  refreshGroup();
  refreshStats();
  refreshLazyState();
  $('formats').textContent = hub.getSupportedFormats().join(', ');
  window.setInterval(refreshStats, 500);

  timeTotal.textContent = formatTime(hub.getDuration('music'));
  streamTotal.textContent = formatTime(hub.getDuration('podcast'));
  refreshStreamState();

  $('loading').hidden = true;
  $('app').hidden = false;
};

boot().catch((error: unknown) => {
  $('loading').textContent = `Could not load the example sounds: ${String(error)}`;
});
