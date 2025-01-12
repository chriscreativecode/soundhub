import { defineConfig, LibraryFormats } from "vite";
import * as path from "path";
import { fileURLToPath } from "url";
import dts from "vite-plugin-dts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration for building the library
const libConfig = {
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "SoundManagerTS",
      fileName: (format: string) => `sound-manager-ts.${format}.js`,
      formats: ["es", "umd"] as LibraryFormats[],
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
        dir: "dist",
      },
    },
    outDir: "dist",
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      outDir: "dist/types",
      rollupTypes: true,
    }),
  ],
};

const devConfig = {
  root: '.', 
  base: '/',
  build: {
    outDir: "dist/demo",
  },
  server: {
    port: 5174,
    strictPort: false, 
    open: '/index-dev.html',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
};

const demoConfig = {
  base: './',
  build: {
    outDir: "dist/demo",
    rollupOptions: {
      input: {
        'index': path.resolve(__dirname, "index-prod.html") // This will output as index.html
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  }
};
// Create separate build commands
export default defineConfig(({ command, mode }) => {
  if (mode === "lib") {
    return libConfig;
  }

  if (command === 'serve') {
    return {
      ...devConfig,
      build: {
        ...devConfig.build,
        rollupOptions: {
          input: path.resolve(__dirname, 'index-dev.html')
        }
      }
    };
  }

  if (mode === "demo") {
    return demoConfig;
  }

  return devConfig;
});