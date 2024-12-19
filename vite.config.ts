import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/sound-manager.ts',
      name: 'SoundManager',
      fileName: 'sound-manager'
    }
  }
});