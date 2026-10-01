import { SoundEventsEnum, type SoundStateInfo } from 'soundhub';
import { getHub } from './hub';

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
 * Call it while a component initialises. The filter `{ soundId: id }` means the
 * component only hears about its own sound. `addEventListener` returns a
 * function that removes the listener; the $effect returns those, so Svelte runs
 * them when the component is destroyed.
 */
export function soundState(id: string): { readonly current: SoundStateInfo | undefined } {
  let current = $state<SoundStateInfo>();

  $effect(() => {
    const hub = getHub();
    const update = () => (current = hub.getSoundState(id));
    update();
    const removers = STATE_EVENTS.map((type) => hub.addEventListener(type, update, { soundId: id }));
    return () => removers.forEach((remove) => remove());
  });

  return {
    get current() {
      return current;
    },
  };
}
