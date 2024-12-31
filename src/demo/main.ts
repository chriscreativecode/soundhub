import { SoundManagerDemo } from './demo';
import type { SoundManager } from "../sound-manager/sound-manager";
import { SoundManagerConfig } from '../sound-manager/sound-manager-config';


// Declare the global UMD variable with proper typing
declare const SoundManagerTS: {
  SoundManager: new (config?: SoundManagerConfig) => SoundManager;
};

const appElement = document.getElementById('app')!;
new SoundManagerDemo(appElement, SoundManagerTS);