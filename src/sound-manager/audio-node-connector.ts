import { Sound } from "./sound.interface";

export class AudioNodeConnector {
  
    // Connect nodes based on the panning type
    public connectNodes(sound: Sound, masterGainNode: GainNode): void {
      if (!sound.source) return;
  
      // Disconnect existing connections
      this.disconnectNodes(sound);
  
      // Connect based on panning type
      if (sound.lastPanningType === 'spatial' && sound.pannerNode) {
        // Spatial audio chain
        sound.source.connect(sound.pannerNode);
        sound.pannerNode.connect(sound.gainNode);
      } else if (sound.stereoPanner) {
        // Stereo panning chain
        sound.source.connect(sound.stereoPanner);
        sound.stereoPanner.connect(sound.gainNode);
      } else {
        // Direct connection
        sound.source.connect(sound.gainNode);
      }
  
      // Connect to master gain node
      sound.gainNode.connect(masterGainNode);
    }
  
    // Disconnect all nodes
    public disconnectNodes(sound: Sound): void {
      if (sound.source) sound.source.disconnect();
      if (sound.stereoPanner) sound.stereoPanner.disconnect();
      if (sound.pannerNode) sound.pannerNode.disconnect();
      sound.gainNode.disconnect();
    }
  }