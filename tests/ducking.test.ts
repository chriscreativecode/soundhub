import { describe, expect, it } from 'vitest';
import { SoundEventsEnum } from '../src/index';
import type { SoundHub } from '../src/index';
import { createHub, endSound, loadSound } from './support/helpers';
import type { MockAudioNode, MockAudioParam } from './support/web-audio-mock';

type MockGain = MockAudioNode & { gain: MockAudioParam };

/** The node a sound's gain node plays into: the master bus, or a duck node. */
const outputOf = (hub: SoundHub, id: string): MockGain => {
  const outputs = (hub.getGainNode(id) as unknown as MockAudioNode).outputs;
  expect(outputs).toHaveLength(1);
  return outputs[0] as MockGain;
};

const levelOf = (hub: SoundHub, id: string): number => outputOf(hub, id).gain.value;

async function musicAndVoice() {
  const hub = createHub();
  await loadSound(hub, 'music');
  await loadSound(hub, 'voice');
  return hub;
}

describe('ducking', () => {
  it('turns the target down while the trigger plays and back up when it ends', async () => {
    const hub = await musicAndVoice();
    hub.duck('music', { when: 'voice', amount: 0.3 });
    hub.play('music', { loop: true });

    expect(hub.isDucked('music')).toBe(false);
    expect(levelOf(hub, 'music')).toBe(1);

    hub.play('voice');
    expect(hub.isDucked('music')).toBe(true);
    expect(levelOf(hub, 'music')).toBe(0.3);
    expect(hub.getDuckLevel('music')).toBe(0.3);

    endSound(hub, 'voice');
    expect(hub.isDucked('music')).toBe(false);
    expect(levelOf(hub, 'music')).toBe(1);
  });

  it('ramps over the attack and the release instead of jumping', async () => {
    const hub = await musicAndVoice();
    hub.duck('music', { when: 'voice', amount: 0.25, attack: 0.1, release: 0.8 });
    const duckNode = outputOf(hub, 'music');

    hub.play('voice');
    expect(duckNode.gain.automation.at(-1)).toMatchObject({ method: 'linearRampToValueAtTime', value: 0.25 });
    const down = duckNode.gain.automation.at(-1)!.time;

    hub.stop('voice');
    const up = duckNode.gain.automation.at(-1)!;
    expect(up).toMatchObject({ method: 'linearRampToValueAtTime', value: 1 });
    expect(down).toBeCloseTo(0.1);
    expect(up.time).toBeCloseTo(0.8);
  });

  it('leaves the target volume alone, so a volume change during a duck survives it', async () => {
    const hub = await musicAndVoice();
    hub.duck('music', { when: 'voice' });
    hub.play('music', { volume: 0.8 });
    hub.play('voice');

    hub.setSoundVolume('music', 0.6);
    hub.stop('voice');

    expect(hub.getSoundVolume('music')).toBe(0.6);
  });

  it('stays down until the last of several triggers stops', async () => {
    const hub = await musicAndVoice();
    await loadSound(hub, 'alarm');
    hub.duck('music', { when: ['voice', 'alarm'] });

    hub.play('voice');
    hub.play('alarm');
    hub.stop('voice');
    expect(hub.isDucked('music')).toBe(true);

    hub.stop('alarm');
    expect(hub.isDucked('music')).toBe(false);
  });

  it('counts every overlapping instance of a trigger', async () => {
    const hub = await musicAndVoice();
    hub.duck('music', { when: 'voice' });

    const first = hub.play('voice', { overlap: true })!;
    const second = hub.play('voice', { overlap: true })!;
    hub.stop(first.id);
    expect(hub.isDucked('music')).toBe(true);

    hub.stop(second.id);
    expect(hub.isDucked('music')).toBe(false);
  });

  it('takes a group as the trigger', async () => {
    const hub = await musicAndVoice();
    hub.createSoundGroup('dialogue');
    hub.duck('music', { when: 'dialogue' });

    hub.play('voice', { groupId: 'dialogue' });
    expect(hub.isDucked('music')).toBe(true);
  });

  it('takes a group as the target and routes sounds that join it later', async () => {
    const hub = await musicAndVoice();
    hub.createSoundGroup('ambience');
    hub.duck('ambience', { when: 'voice', amount: 0.5 });

    hub.play('music', { groupId: 'ambience' });
    hub.play('voice');

    expect(levelOf(hub, 'music')).toBe(0.5);
  });

  it('ducks every overlapping instance of the target through the same node', async () => {
    const hub = await musicAndVoice();
    hub.duck('music', { when: 'voice', amount: 0.2 });

    const a = hub.play('music', { overlap: true })!;
    const b = hub.play('music', { overlap: true })!;
    hub.play('voice');

    expect(levelOf(hub, a.id)).toBe(0.2);
    expect(outputOf(hub, a.id)).toBe(outputOf(hub, b.id));
  });

  it('ducks a sprite when its sound is the target', async () => {
    const hub = await musicAndVoice();
    hub.setSoundSprite('music', { intro: [0, 1] });
    hub.duck('music', { when: 'voice', amount: 0.4 });

    hub.playSprite('music', 'intro');
    hub.play('voice');

    expect(levelOf(hub, 'music_intro')).toBe(0.4);
  });

  it('does not duck for a paused or a muted trigger', async () => {
    const hub = await musicAndVoice();
    hub.duck('music', { when: 'voice' });

    hub.play('voice');
    hub.pause('voice');
    expect(hub.isDucked('music')).toBe(false);

    hub.resume('voice');
    expect(hub.isDucked('music')).toBe(true);

    hub.mute('voice');
    expect(hub.isDucked('music')).toBe(false);
  });

  it('ducks a stream', async () => {
    const hub = await musicAndVoice();
    await hub.loadStream('podcast', '/audio/episode.mp3');
    hub.duck('podcast', { when: 'voice', amount: 0.3 });

    hub.play('podcast');
    hub.play('voice');

    const streamGain = hub.getGainNode('podcast') as unknown as MockAudioNode | undefined;
    expect(hub.isDucked('podcast')).toBe(true);
    if (streamGain) expect((streamGain.outputs[0] as MockGain).gain.value).toBe(0.3);
  });

  it('dispatches duck_started and duck_ended for the target', async () => {
    const hub = await musicAndVoice();
    const events: string[] = [];
    hub.addEventListener(SoundEventsEnum.DUCK_STARTED, (e) => events.push(`down:${e.soundId}:${e.volume}`));
    hub.addEventListener(SoundEventsEnum.DUCK_ENDED, (e) => events.push(`up:${e.soundId}`));
    hub.duck('music', { when: 'voice', amount: 0.3 });

    hub.play('voice');
    hub.stop('voice');

    expect(events).toEqual(['down:music:0.3', 'up:music']);
  });

  it('goes back to the master bus and full level when the duck is removed', async () => {
    const hub = await musicAndVoice();
    const remove = hub.duck('music', { when: 'voice' });
    hub.play('music');
    hub.play('voice');

    remove();

    expect(hub.isDucked('music')).toBe(false);
    expect(outputOf(hub, 'music')).toBe(hub.getMasterInput() as unknown as MockGain);
  });

  it('moves to a new amount when duck() is called again while down', async () => {
    const hub = await musicAndVoice();
    hub.duck('music', { when: 'voice', amount: 0.3 });
    hub.play('voice');

    const duckNode = outputOf(hub, 'music');
    const events: string[] = [];
    hub.addEventListener(SoundEventsEnum.DUCK_STARTED, () => events.push('down'));
    hub.addEventListener(SoundEventsEnum.DUCK_ENDED, () => events.push('up'));

    hub.duck('music', { when: 'voice', amount: 0.1, attack: 0.2 });

    expect(levelOf(hub, 'music')).toBe(0.1);
    // It glides from 0.3, never back up to 1 on the way
    expect(duckNode.gain.automation.slice(-2).map((a) => a.value)).toEqual([0.3, 0.1]);
    expect(events).toEqual([]);
    expect(hub.isDucked('music')).toBe(true);
  });

  it('refuses a duck without a trigger', async () => {
    const hub = await musicAndVoice();
    expect(() => hub.duck('music', { when: [] })).toThrow();
  });
});

describe('ducking after a silent change', () => {
  it('comes back up when the trigger is stopped without an event', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    await loadSound(hub, 'voice');
    hub.duck('music', { when: 'voice' });

    hub.play('voice', {}, true);
    expect(hub.isDucked('music')).toBe(true);

    hub.stop('voice', true);
    expect(hub.isDucked('music')).toBe(false);
  });
});

describe('getDuckLevel while the target is silent', () => {
  it('reports the level the duck is heading for, not the frozen gain', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    await loadSound(hub, 'voice');
    hub.duck('music', { when: 'voice', amount: 0.25 });
    hub.play('music');
    hub.play('voice');
    const duckNode = outputOf(hub, 'music');

    hub.stop('music');
    hub.stop('voice');
    // A browser leaves the gain where it was once nothing plays through the node
    duckNode.gain.value = 0.25;

    expect(hub.getDuckLevel('music')).toBe(1);
  });

  it('reads the gain while the target plays', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    await loadSound(hub, 'voice');
    hub.duck('music', { when: 'voice', amount: 0.25 });
    hub.play('music');
    hub.play('voice');

    outputOf(hub, 'music').gain.value = 0.6; // partway through the attack

    expect(hub.getDuckLevel('music')).toBe(0.6);
  });
});
