import { defineConfig } from 'vite';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dts from 'vite-plugin-dts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  server: {
    open: '/index.html'
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'SoundManagerTS',
      fileName: (format) => `sound-manager-ts.${format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    },
  },
  plugins: [
    dts({
      insertTypesEntry: true,
    })
  ]
});