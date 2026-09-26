import { wantsOverlap } from "./play-sound-options.interface";
import { SoundPanType } from "./sound-pan-type.enum";
import { Sound } from "./sound.interface";

export class AudioNodeConnector {

  public connectNodes(sound: Sound, masterGainNode: GainNode): void {
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

    sound.gainNode.connect(masterGainNode);
  }

  public disconnectNodes(sound: Sound): void {
    if (sound.source) sound.source.disconnect();
    if (sound.stereoPanner) sound.stereoPanner.disconnect();
    if (sound.pannerNode) sound.pannerNode.disconnect();
    // The gain node normally stays on the master bus, so the volume carries
    // over to the next play.
    if (wantsOverlap(sound.playOptions)) {
      sound.gainNode.disconnect();
    }
  }
}