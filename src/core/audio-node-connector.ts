import { wantsOverlap } from "./play-sound-options.interface";
import { SoundPanType } from "./sound-pan-type.enum";
import { Sound } from "./sound.interface";

export class AudioNodeConnector {
  /**
   * Where each gain node sends its output. Usually the master bus, or a duck
   * node when the sound is ducked. Remembered so a sound can move from one to
   * the other without playing through both.
   */
  private gainOutputs: WeakMap<GainNode, AudioNode> = new WeakMap();

  public connectNodes(sound: Sound, destination: AudioNode): void {
    if (!sound.source) return;

    this.disconnectNodes(sound);

    if (sound.panType === SoundPanType.Spatial && sound.pannerNode) {
      sound.source.connect(sound.pannerNode);
      sound.pannerNode.connect(sound.gainNode);
    } else if (sound.stereoPanner) {
      sound.source.connect(sound.stereoPanner);
      sound.stereoPanner.connect(sound.gainNode);
    } else {
      sound.source.connect(sound.gainNode);
    }

    this.routeGain(sound.gainNode, destination);
  }

  public disconnectNodes(sound: Sound): void {
    if (sound.source) sound.source.disconnect();
    if (sound.stereoPanner) sound.stereoPanner.disconnect();
    if (sound.pannerNode) sound.pannerNode.disconnect();
    // The gain node normally stays on the master bus, so the volume carries
    // over to the next play.
    if (wantsOverlap(sound.playOptions)) {
      this.unrouteGain(sound.gainNode);
    }
  }

  /** Send a gain node to `destination`, and only there. */
  public routeGain(gainNode: GainNode, destination: AudioNode): void {
    const current = this.gainOutputs.get(gainNode);
    if (current === destination) return;
    if (current) {
      try {
        gainNode.disconnect(current);
      } catch {
        // Already cut elsewhere, which is what we wanted anyway.
      }
    }
    gainNode.connect(destination);
    this.gainOutputs.set(gainNode, destination);
  }

  public unrouteGain(gainNode: GainNode): void {
    gainNode.disconnect();
    this.gainOutputs.delete(gainNode);
  }

  /** The node a gain node plays into, or undefined while it is not connected. */
  public outputOf(gainNode: GainNode): AudioNode | undefined {
    return this.gainOutputs.get(gainNode);
  }
}
