import { copyFileSync } from 'fs';
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
      // One declaration file with no relative imports. Split files imported
      // each other without an extension, which node16 and nodenext resolution
      // refuse, so every type in those projects fell back to any.
      rollupTypes: true,
      beforeWriteFile: (filePath, content) => {
        const internal = ['ticker.d.ts', 'audio-node-connector.d.ts'];
        return internal.some((f) => filePath.includes(f)) ? false : { filePath, content };
      },
      // The same declarations for require(). A .d.ts next to "type": "module"
      // describes an ES module, and TypeScript holds a CommonJS project to that.
      afterBuild: () => {
        copyFileSync(path.resolve(__dirname, 'dist/types/index.d.ts'), path.resolve(__dirname, 'dist/types/index.d.cts'));
      },
    }),
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'SoundHub',
      // The UMD build stays for script tags and CDNs. require() gets the .cjs
      // build, because Node reads a .js file in this package as ESM.
      fileName: (format: string) => (format === 'cjs' ? 'soundhub.cjs' : `soundhub.${format}.js`),
      formats: ['es', 'cjs', 'umd'] as LibraryFormats[],
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
