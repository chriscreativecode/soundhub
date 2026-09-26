import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SoundHub } from '../src/index';
import { createHub, loadSound } from './support/helpers';

async function footsteps(): Promise<SoundHub> {
  const hub = createHub();
  for (const id of ['step1', 'step2', 'step3']) await loadSound(hub, id);
  return hub;
}

/** The take a play() landed on: "step2" for the instance "step2:1". */
const takeOf = (sound: { id: string } | undefined) => sound!.id.split(':')[0];

describe('variations', () => {
  afterEach(() => vi.restoreAllMocks());

  it('plays one of the takes under the shared name', async () => {
    const hub = await footsteps();
    hub.createVariations('footstep', ['step1', 'step2', 'step3']);

    const sound = hub.play('footstep');

    expect(['step1', 'step2', 'step3']).toContain(takeOf(sound));
    expect(hub.isPlaying(sound!.id)).toBe(true);
  });

  it('never plays the same take twice in a row by default', async () => {
    const hub = await footsteps();
    hub.createVariations('footstep', ['step1', 'step2', 'step3']);

    let previous = '';
    for (let i = 0; i < 200; i++) {
      const take = takeOf(hub.play('footstep'));
      expect(take).not.toBe(previous);
      previous = take;
    }
  });

  it('reaches every take, including the last one on the first play', async () => {
    const hub = await footsteps();
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    hub.createVariations('footstep', ['step1', 'step2', 'step3']);

    expect(takeOf(hub.play('footstep'))).toBe('step3');
  });

  it('plays every take once per round when shuffled', async () => {
    const hub = await footsteps();
    hub.createVariations('footstep', ['step1', 'step2', 'step3'], { order: 'shuffle' });

    let previous = '';
    for (let round = 0; round < 50; round++) {
      const seen = new Set<string>();
      for (let i = 0; i < 3; i++) {
        const take = takeOf(hub.play('footstep'));
        expect(take).not.toBe(previous);
        seen.add(take);
        previous = take;
      }
      expect(seen.size).toBe(3);
    }
  });

  it('plays the takes in order when cycling', async () => {
    const hub = await footsteps();
    hub.createVariations('footstep', ['step1', 'step2', 'step3'], { order: 'cycle' });

    const takes = Array.from({ length: 4 }, () => takeOf(hub.play('footstep')));

    expect(takes).toEqual(['step1', 'step2', 'step3', 'step1']);
  });

  it('spreads the pitch and the volume within the ranges', async () => {
    const hub = await footsteps();
    hub.createVariations('footstep', ['step1', 'step2'], { pitch: [0.9, 1.1], volume: [0.5, 1] });

    for (let i = 0; i < 50; i++) {
      const sound = hub.play('footstep', { volume: 0.8 })!;
      const rate = hub.getPlaybackRate(sound.id);
      const volume = hub.getSoundVolume(sound.id);
      expect(rate).toBeGreaterThanOrEqual(0.9);
      expect(rate).toBeLessThanOrEqual(1.1);
      expect(volume).toBeGreaterThanOrEqual(0.4 - 0.01);
      expect(volume).toBeLessThanOrEqual(0.8 + 0.01);
    }
  });

  it('spreads the volume around the volume of the take when play() passes none', async () => {
    const hub = await footsteps();
    hub.setSoundVolume('step1', 0.2);
    hub.createVariations('quiet', ['step1'], { volume: [1, 1] });

    expect(hub.getSoundVolume(hub.play('quiet')!.id)).toBeCloseTo(0.2);
  });

  it('overlaps the takes by default, and follows overlap: false when asked', async () => {
    const hub = await footsteps();
    hub.createVariations('footstep', ['step1']);
    hub.createVariations('single', ['step2'], { overlap: false });

    expect(hub.play('footstep')!.id).toMatch(/^step1:\d+$/);
    expect(hub.play('single')!.id).toBe('step2');
  });

  it('stops every take it started', async () => {
    const hub = await footsteps();
    hub.createVariations('footstep', ['step1', 'step2', 'step3']);
    const played = Array.from({ length: 5 }, () => hub.play('footstep')!.id);

    hub.stop('footstep');

    played.forEach((id) => expect(hub.isPlaying(id)).toBe(false));
  });

  it('works with sprites as takes', async () => {
    const hub = createHub();
    await loadSound(hub, 'ui');
    hub.setSoundSprite('ui', { a: [0, 0.2], b: [0.5, 0.7] });
    hub.createVariations('click', ['ui_a', 'ui_b']);

    expect(['ui_a', 'ui_b']).toContain(takeOf(hub.play('click')));
  });

  it('can be the trigger of a duck', async () => {
    const hub = await footsteps();
    await loadSound(hub, 'music');
    hub.createVariations('footstep', ['step1', 'step2']);
    hub.duck('music', { when: 'footstep' });

    const step = hub.play('footstep')!;
    expect(hub.isDucked('music')).toBe(true);

    hub.stop(step.id);
    expect(hub.isDucked('music')).toBe(false);
  });

  it('refuses a name that is already a sound, and an empty list', async () => {
    const hub = await footsteps();
    expect(() => hub.createVariations('step1', ['step2'])).toThrow();
    expect(() => hub.createVariations('footstep', [])).toThrow();
  });

  it('can be removed again', async () => {
    const hub = await footsteps();
    hub.createVariations('footstep', ['step1', 'step2']);
    expect(hub.getVariations('footstep')).toEqual(['step1', 'step2']);

    hub.removeVariations('footstep');

    expect(hub.getVariations('footstep')).toBeUndefined();
  });
});
