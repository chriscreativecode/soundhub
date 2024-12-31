// src/demo/main-prod.ts
import { SoundManagerDemo } from './demo';
import type { SoundManager } from '../sound-manager/sound-manager';

declare const SoundManagerTS: {
  SoundManager: new (config?: any) => SoundManager;
};

const appElement = document.getElementById('app')!;
new SoundManagerDemo(appElement, SoundManagerTS);