import { useEffect, useState } from 'react';
import { SoundEventsEnum, type SoundStateInfo } from 'soundhub';
import { getHub, loadSounds } from './hub';

/** True once every sound has loaded. */
export function useSoundsLoaded(): boolean {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    loadSounds().then(() => {
      if (active) setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return loaded;
}

// Every event that changes what a player shows.
const STATE_EVENTS = [
  SoundEventsEnum.STARTED,
  SoundEventsEnum.PAUSED,
  SoundEventsEnum.RESUMED,
  SoundEventsEnum.STOPPED,
  SoundEventsEnum.ENDED,
  SoundEventsEnum.SEEKED,
  SoundEventsEnum.PROGRESS,
];

/**
 * The state of one sound, kept up to date from the event bus.
 *
 * The filter `{ soundId: id }` means this component only hears about its own
 * sound. `addEventListener` returns a function that removes the listener, which
 * is exactly what the effect cleanup needs.
 */
export function useSoundState(id: string): SoundStateInfo | undefined {
  const [state, setState] = useState<SoundStateInfo>();

  useEffect(() => {
    const hub = getHub();
    const update = () => setState(hub.getSoundState(id));
    update();
    const removers = STATE_EVENTS.map((type) => hub.addEventListener(type, update, { soundId: id }));
    return () => removers.forEach((remove) => remove());
  }, [id]);

  return state;
}
