import { describe, expect, it, vi } from 'vitest';
import { SoundEventsEnum } from '../src/index';
import { createHub, loadSound } from './support/helpers';
import type { MockAudioNode } from './support/web-audio-mock';

const SPRITES = {
  jump: [1, 2] as [number, number],
  fail: [3, 5.5] as [number, number],
};

describe('sprites', () => {
  it('cuts each range into its own sound', async () => {
    const hub = createHub();
    await loadSound(hub, 'sheet', '/audio/sheet.mp3', 10);

    hub.setSoundSprite('sheet', SPRITES);

    expect(hub.hasSound('sheet_jump')).toBe(true);
    expect(hub.hasSound('sheet_fail')).toBe(true);
    expect(hub.getDuration('sheet_jump')).toBeCloseTo(1, 5);
    expect(hub.getDuration('sheet_fail')).toBeCloseTo(2.5, 5);
  });

  it('reports the sprite config it was given', async () => {
    const hub = createHub();
    await loadSound(hub, 'sheet', '/audio/sheet.mp3', 10);

    hub.setSoundSprite('sheet', SPRITES);

    expect(hub.getSpriteConfig('sheet')).toEqual(SPRITES);
  });

  it('dispatches sprite_set', async () => {
    const hub = createHub();
    await loadSound(hub, 'sheet', '/audio/sheet.mp3', 10);
    const listener = vi.fn();
    hub.addEventListener(SoundEventsEnum.SPRITE_SET, listener);

    hub.setSoundSprite('sheet', SPRITES);

    expect(listener).toHaveBeenCalled();
  });

  it('plays a sprite by name, without an options object', async () => {
    const hub = createHub();
    await loadSound(hub, 'sheet', '/audio/sheet.mp3', 10);
    hub.setSoundSprite('sheet', SPRITES);

    hub.playSprite('sheet', 'jump');

    expect(hub.isPlaying('sheet_jump')).toBe(true);
    expect(hub.isPlaying('sheet_fail')).toBe(false);
  });

  it('passes play options through to the sprite', async () => {
    const hub = createHub();
    await loadSound(hub, 'sheet', '/audio/sheet.mp3', 10);
    hub.setSoundSprite('sheet', SPRITES);

    hub.playSprite('sheet', 'jump', { volume: 0.3 });

    expect(hub.getSoundVolume('sheet_jump')).toBe(0.3);
  });

  it('lets sprites overlap themselves', async () => {
    const hub = createHub();
    await loadSound(hub, 'sheet', '/audio/sheet.mp3', 10);
    hub.setSoundSprite('sheet', SPRITES);

    hub.playSprite('sheet', 'jump', { overlap: true });
    hub.playSprite('sheet', 'jump', { overlap: true });

    expect(hub.isPlaying('sheet_jump:1')).toBe(true);
    expect(hub.isPlaying('sheet_jump:2')).toBe(true);
  });

  it('clamps a range that runs past the end of the file', async () => {
    const hub = createHub();
    await loadSound(hub, 'sheet', '/audio/sheet.mp3', 4);

    hub.setSoundSprite('sheet', { tail: [3, 99] });

    expect(hub.getDuration('sheet_tail')).toBeCloseTo(1, 5);
  });

  it('skips a range that is empty or outside the file', async () => {
    const hub = createHub();
    await loadSound(hub, 'sheet', '/audio/sheet.mp3', 4);

    hub.setSoundSprite('sheet', { nothing: [9, 10], backwards: [3, 1] });

    expect(hub.hasSound('sheet_nothing')).toBe(false);
    expect(hub.hasSound('sheet_backwards')).toBe(false);
  });

  it('removes one sprite by key without touching its neighbours', async () => {
    const hub = createHub();
    await loadSound(hub, 'sheet', '/audio/sheet.mp3', 10);
    hub.setSoundSprite('sheet', SPRITES);

    hub.removeSpriteSound('jump');

    expect(hub.hasSound('sheet_jump')).toBe(false);
    expect(hub.hasSound('sheet_fail')).toBe(true);
  });

  it('removes a sprite by its full id too', async () => {
    const hub = createHub();
    await loadSound(hub, 'sheet', '/audio/sheet.mp3', 10);
    hub.setSoundSprite('sheet', SPRITES);

    hub.removeSpriteSound('sheet_fail');

    expect(hub.hasSound('sheet_fail')).toBe(false);
  });

  it('does not confuse one key with a longer one', async () => {
    const hub = createHub();
    await loadSound(hub, 'sheet', '/audio/sheet.mp3', 10);
    hub.setSoundSprite('sheet', { jump: [1, 2], double_jump: [2, 3] });

    hub.removeSpriteSound('jump');

    expect(hub.hasSound('sheet_jump')).toBe(false);
    expect(hub.hasSound('sheet_double_jump')).toBe(true);
  });

  it('drops the whole sprite config', async () => {
    const hub = createHub();
    await loadSound(hub, 'sheet', '/audio/sheet.mp3', 10);
    hub.setSoundSprite('sheet', SPRITES);

    hub.removeSpriteConfig('sheet');

    expect(hub.getSpriteConfig('sheet')).toBeUndefined();
  });

  it('adds to the config when it is called a second time', async () => {
    const hub = createHub();
    await loadSound(hub, 'sheet', '/audio/sheet.mp3', 10);

    hub.setSoundSprite('sheet', { jump: [1, 2] });
    hub.setSoundSprite('sheet', { fail: [3, 5.5] });

    expect(hub.getSpriteConfig('sheet')).toEqual(SPRITES);
    hub.removeSpriteSound('jump');
    expect(hub.hasSound('sheet_jump')).toBe(false);
  });

  it('takes a removed key out of the config', async () => {
    const hub = createHub();
    await loadSound(hub, 'sheet', '/audio/sheet.mp3', 10);
    hub.setSoundSprite('sheet', SPRITES);

    hub.removeSpriteSound('jump');

    expect(hub.getSpriteConfig('sheet')).toEqual({ fail: SPRITES.fail });
  });

  it('replaces a key that is set again, and takes the old sound off the master', async () => {
    const hub = createHub();
    await loadSound(hub, 'sheet', '/audio/sheet.mp3', 10);
    hub.setSoundSprite('sheet', SPRITES);
    const sounds = (hub as unknown as { sounds: Map<string, { gainNode: MockAudioNode }> }).sounds;
    const oldGain = sounds.get('sheet_jump')!.gainNode;

    hub.setSoundSprite('sheet', { jump: [6, 6.5] });

    expect(oldGain.outputs).toHaveLength(0);
    expect(hub.getDuration('sheet_jump')).toBeCloseTo(0.5, 5);
    expect(hub.getSpriteConfig('sheet')).toEqual({ ...SPRITES, jump: [6, 6.5] });
  });

  it('stops a playing copy of a key before it is replaced', async () => {
    const hub = createHub();
    await loadSound(hub, 'sheet', '/audio/sheet.mp3', 10);
    hub.setSoundSprite('sheet', SPRITES);
    hub.playSprite('sheet', 'jump');
    hub.playSprite('sheet', 'jump', { overlap: true });
    const stopped = vi.fn();
    hub.addEventListener(SoundEventsEnum.STOPPED, stopped);

    hub.setSoundSprite('sheet', { jump: [6, 6.5] });

    expect(stopped).toHaveBeenCalledTimes(2);
    expect(hub.hasSound('sheet_jump:1')).toBe(false);
    expect(hub.isPlaying('sheet_jump')).toBe(false);
  });

  it('takes a removed sprite off the master too', async () => {
    const hub = createHub();
    await loadSound(hub, 'sheet', '/audio/sheet.mp3', 10);
    hub.setSoundSprite('sheet', SPRITES);
    const sounds = (hub as unknown as { sounds: Map<string, { gainNode: MockAudioNode }> }).sounds;
    const gain = sounds.get('sheet_jump')!.gainNode;

    hub.removeSpriteSound('jump');

    expect(gain.outputs).toHaveLength(0);
  });
});
