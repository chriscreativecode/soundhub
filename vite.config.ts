import * as path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, LibraryFormats, UserConfig } from 'vite';
import dts from 'vite-plugin-dts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Builds the distributable library plus its .d.ts files. */
const libConfig: UserConfig = {
  plugins: [
    dts({
      entryRoot: path.resolve(__dirname, 'src'),
      include: ['src/index.ts', 'src/core/**/*.ts'],
      exclude: ['src/core/ticker.ts', 'src/core/audio-node-connector.ts'],
      outDir: 'dist/types',
      rollupTypes: false,
      beforeWriteFile: (filePath, content) => {
        const internal = ['ticker.d.ts', 'audio-node-connector.d.ts'];
        return internal.some((f) => filePath.includes(f)) ? false : { filePath, content };
      },
    }),
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'SoundHub',
      fileName: (format: string) => `soundhub.${format}.js`,
      formats: ['es', 'umd'] as LibraryFormats[],
    },
    outDir: 'dist',
    rollupOptions: { output: { globals: {}, dir: 'dist' } },
  },
};

/** Serves and builds the example page that exercises the public API. */
const examplesConfig: UserConfig = {
  root: path.resolve(__dirname, 'examples'),
  base: './',
  server: { port: 5174, open: '/index.html' },
  build: {
    outDir: path.resolve(__dirname, 'dist/examples'),
    emptyOutDir: true,
  },
};

export default defineConfig(({ mode }) => (mode === 'lib' ? libConfig : examplesConfig));
