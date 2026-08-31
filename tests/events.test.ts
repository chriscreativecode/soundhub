import { describe, expect, it, vi } from 'vitest';
import { SoundEventsEnum } from '../src/index';
import { createHub, endSound, loadSound } from './support/helpers';

describe('the event bus', () => {
  it('hands back a function that removes the listener', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    const listener = vi.fn();

    const off = hub.addEventListener(SoundEventsEnum.STARTED, listener);
    hub.play('music');
    off();
    hub.play('music');

    expect(listener).toHaveBeenCalledOnce();
  });

  it('removes a listener by reference', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    const listener = vi.fn();

    hub.addEventListener(SoundEventsEnum.STARTED, listener);
    hub.removeEventListener(SoundEventsEnum.STARTED, listener);
    hub.play('music');

    expect(listener).not.toHaveBeenCalled();
  });

  it('knows whether anyone is listening', async () => {
    const hub = createHub();
    const listener = vi.fn();

    expect(hub.hasEventListener(SoundEventsEnum.STARTED)).toBe(false);
    hub.addEventListener(SoundEventsEnum.STARTED, listener);
    expect(hub.hasEventListener(SoundEventsEnum.STARTED)).toBe(true);
  });

  it('keeps one listener alive when another throws', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    const good = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    hub.addEventListener(SoundEventsEnum.STARTED, () => {
      throw new Error('listener blew up');
    });
    hub.addEventListener(SoundEventsEnum.STARTED, good);

    expect(() => hub.play('music')).not.toThrow();
    expect(good).toHaveBeenCalledOnce();
  });
});

describe('once', () => {
  it('fires a single time', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    const listener = vi.fn();

    hub.once(SoundEventsEnum.STARTED, listener);
    hub.play('music');
    hub.play('music');

    expect(listener).toHaveBeenCalledOnce();
  });

  it('can be cancelled before it fires', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    const listener = vi.fn();

    const cancel = hub.once(SoundEventsEnum.STARTED, listener);
    cancel();
    hub.play('music');

    expect(listener).not.toHaveBeenCalled();
  });

  it('waits for the sound it was given', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    await loadSound(hub, 'rain');
    const listener = vi.fn();

    hub.once(SoundEventsEnum.STARTED, listener, { soundId: 'rain' });
    hub.play('music');
    expect(listener).not.toHaveBeenCalled();

    hub.play('rain');
    expect(listener).toHaveBeenCalledOnce();
  });
});

describe('filters', () => {
  it('narrows to one sound', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    await loadSound(hub, 'rain');
    const listener = vi.fn();

    hub.addEventListener(SoundEventsEnum.STARTED, listener, { soundId: 'music' });
    hub.play('music');
    hub.play('rain');

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0].soundId).toBe('music');
  });

  it('narrows to every instance of one sound', async () => {
    const hub = createHub();
    await loadSound(hub, 'laser');
    await loadSound(hub, 'music');
    const listener = vi.fn();

    hub.addEventListener(SoundEventsEnum.ENDED, listener, { originalId: 'laser' });
    hub.play('laser', { overlap: true });
    hub.play('laser', { overlap: true });
    hub.play('music');
    endSound(hub, 'laser:1');
    endSound(hub, 'laser:2');
    endSound(hub, 'music');

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('narrows to a single instance', async () => {
    const hub = createHub();
    await loadSound(hub, 'laser');
    const listener = vi.fn();

    hub.addEventListener(SoundEventsEnum.ENDED, listener, { instanceId: 'laser:2' });
    hub.play('laser', { overlap: true });
    hub.play('laser', { overlap: true });
    endSound(hub, 'laser:1');
    endSound(hub, 'laser:2');

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0].soundId).toBe('laser:2');
  });

  it('matches instances by pattern', async () => {
    const hub = createHub();
    await loadSound(hub, 'laser');
    const listener = vi.fn();

    hub.addEventListener(SoundEventsEnum.ENDED, listener, { instancePattern: /^laser:/ });
    hub.play('laser', { overlap: true });
    endSound(hub, 'laser:1');

    expect(listener).toHaveBeenCalledOnce();
  });

  it('removes only the listener with the matching filter', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    await loadSound(hub, 'rain');
    const listener = vi.fn();

    hub.addEventListener(SoundEventsEnum.STARTED, listener, { soundId: 'music' });
    hub.addEventListener(SoundEventsEnum.STARTED, listener, { soundId: 'rain' });
    hub.removeEventListener(SoundEventsEnum.STARTED, listener, { soundId: 'music' });

    hub.play('music');
    hub.play('rain');

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0].soundId).toBe('rain');
  });

  it('tells two regex filters apart', async () => {
    const hub = createHub();
    await loadSound(hub, 'laser');
    const kept = vi.fn();

    hub.addEventListener(SoundEventsEnum.ENDED, kept, { instancePattern: /^laser:/ });
    hub.removeEventListener(SoundEventsEnum.ENDED, kept, { instancePattern: /^other:/ });

    hub.play('laser', { overlap: true });
    endSound(hub, 'laser:1');

    expect(kept).toHaveBeenCalledOnce();
  });
});

describe('dispatching by hand', () => {
  it('delivers a custom event to the listeners', () => {
    const hub = createHub();
    const listener = vi.fn();
    hub.addEventListener(SoundEventsEnum.PROGRESS, listener);

    hub.dispatchEvent({ type: SoundEventsEnum.PROGRESS, soundId: 'made-up', progress: 0.5 });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0].progress).toBe(0.5);
  });
});
