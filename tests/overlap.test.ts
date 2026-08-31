import { describe, expect, it, vi } from 'vitest';
import { SoundEventsEnum } from '../src/index';
import { createHub, endSound, loadSound } from './support/helpers';

const instancesOf = (hub: ReturnType<typeof createHub>, id: string): string[] =>
  hub.getSoundIds().filter((key) => key.startsWith(`${id}:`));

describe('overlap', () => {
  it('restarts the same sound by default', async () => {
    const hub = createHub();
    await loadSound(hub, 'laser');

    hub.play('laser');
    hub.play('laser');

    expect(hub.getSoundIds()).toEqual(['laser']);
  });

  it('gives every call its own instance when asked', async () => {
    const hub = createHub();
    await loadSound(hub, 'laser');

    const first = hub.play('laser', { overlap: true });
    const second = hub.play('laser', { overlap: true });

    expect(first?.id).toBe('laser:1');
    expect(second?.id).toBe('laser:2');
    expect(hub.isPlaying('laser:1')).toBe(true);
    expect(hub.isPlaying('laser:2')).toBe(true);
  });

  it('still accepts the old createNewInstance name', async () => {
    const hub = createHub();
    await loadSound(hub, 'laser');

    const sound = hub.play('laser', { createNewInstance: true });

    expect(sound?.id).toBe('laser:1');
  });

  it('takes overlap from the hub config', async () => {
    const hub = createHub({ overlap: true });
    await loadSound(hub, 'laser');

    expect(hub.play('laser')?.id).toBe('laser:1');
  });

  it('takes the old config name too', async () => {
    const hub = createHub({ createNewInstance: true });
    await loadSound(hub, 'laser');

    expect(hub.play('laser')?.id).toBe('laser:1');
  });

  it('lets an explicit false in the play options win over the config', async () => {
    const hub = createHub({ overlap: true });
    await loadSound(hub, 'laser');

    expect(hub.play('laser', { overlap: false })?.id).toBe('laser');
  });

  it('gives each instance its own volume', async () => {
    const hub = createHub();
    await loadSound(hub, 'laser');

    hub.play('laser', { overlap: true, volume: 0.2 });
    hub.play('laser', { overlap: true, volume: 0.9 });

    expect(hub.getSoundVolume('laser:1')).toBe(0.2);
    expect(hub.getSoundVolume('laser:2')).toBe(0.9);
  });

  it('stops one instance without touching the others', async () => {
    const hub = createHub();
    await loadSound(hub, 'laser');

    hub.play('laser', { overlap: true });
    hub.play('laser', { overlap: true });
    hub.stop('laser:1');

    expect(hub.isPlaying('laser:1')).toBe(false);
    expect(hub.isPlaying('laser:2')).toBe(true);
  });

  it('reports the instance id on the events', async () => {
    const hub = createHub();
    await loadSound(hub, 'laser');
    const listener = vi.fn();
    hub.addEventListener(SoundEventsEnum.ENDED, listener);

    hub.play('laser', { overlap: true });
    endSound(hub, 'laser:1');

    const event = listener.mock.calls[0][0];
    expect(event.soundId).toBe('laser:1');
    expect(event.originalId).toBe('laser');
    expect(event.instanceId).toBe('laser:1');
  });
});

describe('instance housekeeping', () => {
  it('drops instances that have finished when a new one starts', async () => {
    const hub = createHub();
    await loadSound(hub, 'coin');

    hub.play('coin', { overlap: true });
    endSound(hub, 'coin:1');
    hub.play('coin', { overlap: true });

    expect(instancesOf(hub, 'coin')).toEqual(['coin:2']);
  });

  it('leaves playing and paused instances alone', async () => {
    const hub = createHub();
    await loadSound(hub, 'coin');

    hub.play('coin', { overlap: true });
    hub.play('coin', { overlap: true });
    hub.pause('coin:2');
    hub.play('coin', { overlap: true });

    expect(instancesOf(hub, 'coin')).toEqual(['coin:1', 'coin:2', 'coin:3']);
  });

  it('never reuses an id that is still live', async () => {
    const hub = createHub();
    await loadSound(hub, 'coin');

    const ids = [
      hub.play('coin', { overlap: true })?.id,
      hub.play('coin', { overlap: true })?.id,
      hub.play('coin', { overlap: true })?.id,
    ];

    expect(new Set(ids).size).toBe(3);
  });

  it('caps the number of live instances with maxInstancesPerSound', async () => {
    const hub = createHub({ maxInstancesPerSound: 3 });
    await loadSound(hub, 'step');

    for (let i = 0; i < 6; i += 1) hub.play('step', { overlap: true });

    const live = instancesOf(hub, 'step');
    expect(live).toHaveLength(3);
    expect(live).toEqual(['step:4', 'step:5', 'step:6']);
  });

  it('does not cap anything by default', async () => {
    const hub = createHub();
    await loadSound(hub, 'step');

    for (let i = 0; i < 12; i += 1) hub.play('step', { overlap: true });

    expect(instancesOf(hub, 'step')).toHaveLength(12);
  });
});
