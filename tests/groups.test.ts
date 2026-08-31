import { describe, expect, it } from 'vitest';
import { createHub, loadSound } from './support/helpers';

const membersOf = (hub: ReturnType<typeof createHub>, group: string): string[] =>
  Array.from(hub.getGroup(group)?.sounds ?? []);

describe('groups', () => {
  it('puts a sound in the group when it is played into one', async () => {
    const hub = createHub();
    await loadSound(hub, 'rain');
    hub.createSoundGroup('ambience');

    hub.play('rain', { groupId: 'ambience' });

    expect(membersOf(hub, 'ambience')).toEqual(['rain']);
    expect(hub.getSound('rain')?.groupId).toBe('ambience');
  });

  it('stops a sound that was played into a group, the way the example page does', async () => {
    const hub = createHub();
    await loadSound(hub, 'rain');
    hub.createSoundGroup('ambience', { playOptions: { loop: true, volume: 0.4 } });

    hub.play('rain', { groupId: 'ambience' });
    expect(hub.isPlaying('rain')).toBe(true);

    hub.getGroup('ambience')?.sounds.forEach((id) => hub.stop(id));

    expect(hub.isPlaying('rain')).toBe(false);
  });

  it('applies the group play options', async () => {
    const hub = createHub();
    await loadSound(hub, 'rain');
    hub.createSoundGroup('ambience', { playOptions: { loop: true, volume: 0.4 } });

    hub.play('rain', { groupId: 'ambience' });

    expect(hub.getLoop('rain')).toBe(true);
    expect(hub.getSoundVolume('rain')).toBe(0.4);
  });

  it('lets the options passed to play beat the group options', async () => {
    const hub = createHub();
    await loadSound(hub, 'rain');
    hub.createSoundGroup('ambience', { playOptions: { loop: true, volume: 0.4 } });

    hub.play('rain', { groupId: 'ambience', volume: 0.9 });

    expect(hub.getSoundVolume('rain')).toBe(0.9);
    expect(hub.getLoop('rain')).toBe(true);
  });

  it('collects overlapping instances in the group', async () => {
    const hub = createHub();
    await loadSound(hub, 'laser');
    hub.createSoundGroup('lasers');

    hub.play('laser', { groupId: 'lasers', overlap: true });
    hub.play('laser', { groupId: 'lasers', overlap: true });

    expect(membersOf(hub, 'lasers')).toEqual(['laser:1', 'laser:2']);
  });

  it('retires the oldest member once maxInstances is reached', async () => {
    const hub = createHub();
    await loadSound(hub, 'laser');
    hub.createSoundGroup('lasers', { maxInstances: 2 });

    hub.play('laser', { groupId: 'lasers', overlap: true });
    hub.play('laser', { groupId: 'lasers', overlap: true });
    hub.play('laser', { groupId: 'lasers', overlap: true });

    const members = membersOf(hub, 'lasers');
    expect(members).toHaveLength(2);
    expect(members).not.toContain('laser:1');
    expect(hub.isPlaying('laser:1')).toBe(false);
  });

  it('does not play into a group that does not exist', async () => {
    const hub = createHub();
    await loadSound(hub, 'rain');

    hub.play('rain', { groupId: 'nope' });

    expect(hub.isPlaying('rain')).toBe(false);
  });

  it('removes a sound from a group', async () => {
    const hub = createHub();
    await loadSound(hub, 'rain');
    hub.createSoundGroup('ambience');
    hub.play('rain', { groupId: 'ambience' });

    hub.removeFromSoundGroup('ambience', 'rain');

    expect(membersOf(hub, 'ambience')).toEqual([]);
  });

  it('stops every sound in a group when the group is removed', async () => {
    const hub = createHub();
    await loadSound(hub, 'rain');
    await loadSound(hub, 'birds');
    hub.createSoundGroup('ambience');
    hub.play('rain', { groupId: 'ambience' });
    hub.play('birds', { groupId: 'ambience' });

    hub.removeSoundGroup('ambience');

    expect(hub.isPlaying('rain')).toBe(false);
    expect(hub.isPlaying('birds')).toBe(false);
    expect(hub.getGroup('ambience')).toBeUndefined();
  });

  it('ignores a second group with the same name', () => {
    const hub = createHub();
    hub.createSoundGroup('ambience', { maxInstances: 4 });
    hub.createSoundGroup('ambience', { maxInstances: 99 });

    expect(hub.getGroup('ambience')?.maxInstances).toBe(4);
  });
});
