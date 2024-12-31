// src/demo/main-dev.ts
import { SoundManagerDemo } from './demo';
import { SoundManager } from '../sound-manager/sound-manager';

const appElement = document.getElementById('app')!;
new SoundManagerDemo(appElement, { SoundManager });