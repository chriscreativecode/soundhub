import { onBeforeUnmount, onMounted, readonly, ref, shallowRef, type Ref } from 'vue';
import { SoundEventsEnum, type SoundStateInfo } from 'soundhub';
import { getHub, loadSounds } from './hub';

/** True once every sound has loaded. */
export function useSoundsLoaded(): Readonly<Ref<boolean>> {
  const loaded = ref(false);
  onMounted(() => {
    loadSounds().then(() => (loaded.value = true));
  });
  return readonly(loaded);
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
 * The filter `{ soundId: id }` means the component only hears about its own
 * sound. `addEventListener` returns a function that removes the listener, and
 * those run when the component unmounts.
 */
export function useSoundState(id: string): Readonly<Ref<SoundStateInfo | undefined>> {
  const state = shallowRef<SoundStateInfo>();
  let removers: Array<() => void> = [];

  onMounted(() => {
    const hub = getHub();
    const update = () => (state.value = hub.getSoundState(id));
    update();
    removers = STATE_EVENTS.map((type) => hub.addEventListener(type, update, { soundId: id }));
  });

  onBeforeUnmount(() => removers.forEach((remove) => remove()));

  return state;
}
