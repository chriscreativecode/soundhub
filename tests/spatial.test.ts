import { describe, expect, it, vi } from 'vitest';
import { SoundEventsEnum, SoundPanType } from '../src/index';
import { contextOf, createHub, loadSound } from './support/helpers';
import type { MockPannerNode } from './support/web-audio-mock';

const pannerOf = (hub: ReturnType<typeof createHub>, id: string): MockPannerNode => {
  const panner = hub.getSound(id)?.pannerNode;
  if (!panner) throw new Error(`Sound ${id} has no panner`);
  return panner as unknown as MockPannerNode;
};

describe('stereo panning', () => {
  it('pans one sound', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');

    hub.play('music');
    hub.setPan('music', -0.5);

    expect(hub.isStereoPanActive('music')).toBe(true);
    expect(hub.getSound('music')?.pan).toBe(-0.5);
  });

  it('clamps the pan value', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    hub.play('music');

    hub.setPan('music', 5);
    expect(hub.getSound('music')?.pan).toBe(1);

    hub.setPan('music', -5);
    expect(hub.getSound('music')?.pan).toBe(-1);
  });

  it('resets the pan back to the centre', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    hub.play('music');
    hub.setPan('music', 0.8);

    hub.resetPan('music');

    expect(hub.getSound('music')?.pan).toBe(0);
  });

  it('keeps the master pan separate from the sounds', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    hub.play('music');
    hub.setPan('music', -0.4);

    hub.setGlobalPan(0.6);

    expect(hub.getGlobalPan()).toBe(0.6);
    expect(hub.getSound('music')?.pan).toBe(-0.4);
  });

  it('dispatches pan_changed', async () => {
    const hub = createHub();
    await loadSound(hub, 'music');
    const listener = vi.fn();
    hub.addEventListener(SoundEventsEnum.PAN_CHANGED, listener);

    hub.play('music');
    hub.setPan('music', 0.3);

    expect(listener.mock.calls.at(-1)?.[0].pan).toBe(0.3);
  });
});

describe('spatial position', () => {
  it('puts a sound in 3D space', async () => {
    const hub = createHub();
    await loadSound(hub, 'helicopter');

    hub.play('helicopter');
    hub.setSpatialPosition(3, 1, -2, 'helicopter');

    expect(hub.getSpatialPosition('helicopter')).toEqual({ x: 3, y: 1, z: -2 });
    expect(hub.isSpatialAudioActive('helicopter')).toBe(true);

    const panner = pannerOf(hub, 'helicopter');
    expect(panner.positionX.value).toBe(3);
    expect(panner.positionZ.value).toBe(-2);
  });

  it('takes the position from the play options', async () => {
    const hub = createHub();
    await loadSound(hub, 'helicopter');

    hub.play('helicopter', {
      panType: SoundPanType.Spatial,
      panSpatialPosition: { x: 1, y: 0, z: 4 },
    });

    expect(hub.getSpatialPosition('helicopter')).toEqual({ x: 1, y: 0, z: 4 });
  });

  it('applies the panner config it is given', async () => {
    const hub = createHub();
    await loadSound(hub, 'helicopter');
    hub.play('helicopter');

    hub.setSpatialPosition(1, 0, 0, 'helicopter', { refDistance: 5, rolloffFactor: 2 });

    const panner = pannerOf(hub, 'helicopter');
    expect(panner.refDistance).toBe(5);
    expect(panner.rolloffFactor).toBe(2);
  });

  it('updates the config of a sound that is already positioned', async () => {
    const hub = createHub();
    await loadSound(hub, 'helicopter');
    hub.play('helicopter');
    hub.setSpatialPosition(1, 0, 0, 'helicopter');

    hub.updatePannerConfigById('helicopter', { maxDistance: 50 });

    expect(pannerOf(hub, 'helicopter').maxDistance).toBe(50);
  });

  it('takes the spatial effect off again', async () => {
    const hub = createHub();
    await loadSound(hub, 'helicopter');
    hub.play('helicopter');
    hub.setSpatialPosition(1, 0, 0, 'helicopter');

    hub.removeSpatialEffect('helicopter');

    expect(hub.isSpatialAudioActive('helicopter')).toBe(false);
    expect(hub.getSpatialPosition('helicopter')).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('does nothing when spatial audio is switched off', async () => {
    const hub = createHub({ spatialAudio: false });
    await loadSound(hub, 'helicopter');
    hub.play('helicopter');

    hub.setSpatialPosition(1, 2, 3, 'helicopter');

    expect(hub.isSpatialAudioEnabled()).toBe(false);
    expect(hub.getSound('helicopter')?.pannerNode).toBeFalsy();
  });

  it('positions the whole mix at once', async () => {
    const hub = createHub();

    hub.setMasterSpatialPosition(2, 0, -3);

    expect(hub.getMasterSpatialPosition()).toEqual({ x: 2, y: 0, z: -3 });
  });
});

describe('source direction', () => {
  it('points a sound in a direction', async () => {
    const hub = createHub();
    await loadSound(hub, 'television');
    hub.play('television');
    hub.setSpatialPosition(0, 0, 2, 'television');

    hub.setSpatialOrientation('television', 0, 0, -1);

    expect(hub.getSpatialOrientation('television')).toEqual({ x: 0, y: 0, z: -1 });
    expect(pannerOf(hub, 'television').orientationZ.value).toBe(-1);
  });

  it('creates the panner when there is none yet', async () => {
    const hub = createHub();
    await loadSound(hub, 'television');
    hub.play('television');

    hub.setSpatialOrientation('television', 1, 0, 0);

    expect(hub.getSpatialOrientation('television')).toEqual({ x: 1, y: 0, z: 0 });
  });

  it('takes the direction from the play options', async () => {
    const hub = createHub();
    await loadSound(hub, 'television');

    hub.play('television', {
      panType: SoundPanType.Spatial,
      panSpatialPosition: { x: 0, y: 0, z: 2 },
      panSpatialOrientation: { x: 0, y: 0, z: -1 },
    });

    expect(hub.getSpatialOrientation('television')).toEqual({ x: 0, y: 0, z: -1 });
  });

  it('dispatches spatial_orientation_changed', async () => {
    const hub = createHub();
    await loadSound(hub, 'television');
    const listener = vi.fn();
    hub.addEventListener(SoundEventsEnum.SPATIAL_ORIENTATION_CHANGED, listener);

    hub.play('television');
    hub.setSpatialOrientation('television', 0, 1, 0);

    expect(listener.mock.calls.at(-1)?.[0].orientation).toEqual({ x: 0, y: 1, z: 0 });
  });

  it('points the master panner too', () => {
    const hub = createHub();

    hub.setMasterSpatialOrientation(0, 0, -1);

    expect(hub.getMasterSpatialOrientation()).toEqual({ x: 0, y: 0, z: -1 });
  });
});

describe('the listener', () => {
  it('starts at the centre looking down negative z', () => {
    const hub = createHub();

    expect(hub.getListenerPosition()).toEqual({ x: 0, y: 0, z: 0 });
    expect(hub.getListenerOrientation()).toEqual({
      forward: { x: 0, y: 0, z: -1 },
      up: { x: 0, y: 1, z: 0 },
    });
  });

  it('moves', () => {
    const hub = createHub();

    hub.setListenerPosition(5, 0, -3);

    expect(hub.getListenerPosition()).toEqual({ x: 5, y: 0, z: -3 });
    const listener = contextOf(hub).listener;
    expect(listener.positionX.value).toBe(5);
    expect(listener.positionZ.value).toBe(-3);
  });

  it('turns, keeping up where it was', () => {
    const hub = createHub();

    hub.setListenerOrientation(1, 0, 0);

    const listener = contextOf(hub).listener;
    expect(listener.forwardX.value).toBe(1);
    expect(listener.forwardZ.value).toBe(0);
    expect(listener.upY.value).toBe(1);
  });

  it('takes an up vector of its own', () => {
    const hub = createHub();

    hub.setListenerOrientation(0, 0, -1, 0, 0, 1);

    expect(hub.getListenerOrientation().up).toEqual({ x: 0, y: 0, z: 1 });
  });

  it('goes back to the middle', () => {
    const hub = createHub();
    hub.setListenerPosition(9, 9, 9);
    hub.setListenerOrientation(1, 0, 0);

    hub.resetListener();

    expect(hub.getListenerPosition()).toEqual({ x: 0, y: 0, z: 0 });
    expect(hub.getListenerOrientation().forward).toEqual({ x: 0, y: 0, z: -1 });
  });

  it('dispatches listener_changed', () => {
    const hub = createHub();
    const listener = vi.fn();
    hub.addEventListener(SoundEventsEnum.LISTENER_CHANGED, listener);

    hub.setListenerPosition(1, 0, 0);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0].position).toEqual({ x: 1, y: 0, z: 0 });
  });

  it('does nothing when spatial audio is switched off', () => {
    const hub = createHub({ spatialAudio: false });

    hub.setListenerPosition(4, 4, 4);

    expect(hub.getListenerPosition()).toEqual({ x: 0, y: 0, z: 0 });
  });
});
