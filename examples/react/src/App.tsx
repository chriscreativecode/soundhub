import { SoundState } from 'soundhub';
import { getHub } from './sound/hub';
import { useSoundState, useSoundsLoaded } from './sound/hooks';

function formatTime(seconds = 0): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function MusicPlayer() {
  const state = useSoundState('music');
  const playing = state?.state === SoundState.Playing;
  const paused = state?.state === SoundState.Paused;

  // Browsers only start audio after a click, tap or key press, so the first
  // play() has to come from an event handler like this one.
  function toggle() {
    const hub = getHub();
    if (playing) hub.pause('music');
    else if (paused) hub.resume('music');
    else hub.play('music', { loop: true, volume: 0.7, fadeInDuration: 1 });
  }

  return (
    <section className="card">
      <h2>Music</h2>
      <div className="row">
        <button onClick={toggle}>{playing ? 'Pause' : 'Play'}</button>
        <button className="quiet" onClick={() => getHub().stop('music')}>Stop</button>
        <span className="time">
          {formatTime(state?.currentTime)} / {formatTime(state?.duration)}
        </span>
      </div>
      <input
        type="range"
        aria-label="Position"
        min={0}
        max={state?.duration || 1}
        step={0.1}
        value={state?.currentTime ?? 0}
        onChange={(e) => getHub().seek('music', Number(e.target.value))}
      />
    </section>
  );
}

function Effects() {
  return (
    <section className="card">
      <h2>Effects</h2>
      <p>Click fast. With <code>overlap: true</code> every click starts its own instance.</p>
      <div className="row">
        <button onClick={() => getHub().play('laser', { overlap: true })}>Laser</button>
        <button onClick={() => getHub().play('explosion', { overlap: true })}>Explosion</button>
      </div>
    </section>
  );
}

export default function App() {
  const loaded = useSoundsLoaded();

  return (
    <main>
      <h1>soundhub + React</h1>
      {loaded ? (
        <>
          <MusicPlayer />
          <Effects />
        </>
      ) : (
        <p>Loading sounds…</p>
      )}
    </main>
  );
}
