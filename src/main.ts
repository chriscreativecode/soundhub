// main.ts
import { SoundManagerDemo } from './sound-manager-demo/sound-manager-demo';

const appElement = document.getElementById('app');
const container = document.createElement('div');
container.id = 'sound-manager-demo-container';
appElement?.appendChild(container);

// Correct instantiation with container element
new SoundManagerDemo(container); 