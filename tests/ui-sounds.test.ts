import { describe, expect, it } from 'vitest';
import { SoundEventsEnum } from '../src/index';
import { addUiSounds, renderUiSound, uiSounds, UI_SOUND_NAMES } from '../src/ui';
import { createHub } from './support/helpers';

describe('interface sounds', () => {
  it('renders every sound as audible samples between -1 and 1', () => {
    for (const name of UI_SOUND_NAMES) {
      const samples = renderUiSound(name, 48000);
      const peak = samples.reduce((max, s) => Math.max(max, Math.abs(s)), 0);

      expect(samples.length, name).toBeGreaterThan(48000 * 0.005);
      expect(samples.length, name).toBeLessThan(48000 * 1);
      expect(peak, name).toBeGreaterThan(0.05);
      expect(peak, name).toBeLessThanOrEqual(1);
    }
  });

  it('renders the same samples every time', () => {
    expect(renderUiSound('swipe', 44100)).toEqual(renderUiSound('swipe', 44100));
  });

  it('starts and ends near silence, so there is no click at either edge', () => {
    for (const name of UI_SOUND_NAMES) {
      const samples = renderUiSound(name, 48000);
      expect(Math.abs(samples[0]), name).toBeLessThan(0.01);
      expect(Math.abs(samples[samples.length - 1]), name).toBeLessThan(0.01);
    }
  });

  it('adds them to the hub under the ids in uiSounds, with no fetch', () => {
    const hub = createHub();
    const ids = addUiSounds(hub);

    expect(ids).toEqual(uiSounds);
    for (const id of Object.values(uiSounds)) expect(hub.isSoundLoaded(id), id).toBe(true);
  });

  it('plays them like any other sound, overlapping and at the chosen volume', () => {
    const hub = createHub();
    addUiSounds(hub, { volume: 0.4 });
    const started: string[] = [];
    hub.addEventListener(SoundEventsEnum.STARTED, (e) => started.push(e.soundId!));

    const first = hub.play(uiSounds.click)!;
    const second = hub.play(uiSounds.click)!;

    expect(first.id).not.toBe(second.id);
    expect(hub.isPlaying(first.id)).toBe(true);
    expect(hub.getSoundVolume(second.id)).toBe(0.4);
    expect(started).toEqual([first.id, second.id]);
  });

  it('takes a prefix, a subset and a group', () => {
    const hub = createHub();
    const ids = addUiSounds(hub, { prefix: 'fx-', only: ['success', 'error'], groupId: 'interface' });

    expect(ids).toEqual({ success: 'fx-success', error: 'fx-error' });
    expect(hub.isSoundLoaded('fx-click')).toBe(false);
    expect(Array.from(hub.getGroup('interface')!.sounds)).toEqual(['fx-success', 'fx-error']);
  });

  it('can be added a second time', () => {
    const hub = createHub();
    addUiSounds(hub);
    addUiSounds(hub);

    expect(hub.isSoundLoaded(uiSounds.pop)).toBe(true);
  });
});

describe('addBuffer', () => {
  it('turns an AudioBuffer into a sound', () => {
    const hub = createHub();
    const buffer = hub.getContext().createBuffer(1, 4800, 48000);

    hub.addBuffer('beep', buffer);
    hub.play('beep');

    expect(hub.getDuration('beep')).toBeCloseTo(0.1);
    expect(hub.isPlaying('beep')).toBe(true);
  });
});
