import * as path from "path";
import { fileURLToPath } from "url";
import { defineConfig, LibraryFormats } from "vite";

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
  }
};

const devConfig = {
  root: ".",
  base: "/",
  build: {
    outDir: "dist/demo",
  },
  server: {
    port: 5174,
    strictPort: false,
    open: "/index-dev.html",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};

const demoConfig = {
  base: "./",
  build: {
    outDir: "dist/demo",
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, "index-prod.html"), // This will output as index.html
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
};

const documentationConfig = {
  root: "dist/documentation", // Serve from the documentation folder
  base: "./",
  build: {
    outDir: "dist/documentation",
    emptyOutDir: false,
  }
};

const documentationDevConfig = {
  root: "src/documentation",
  base: "./",
  server: {
    open: true,
    port: 5173,
    watch: {
      usePolling: true,
      include: ['src/documentation/**'],
    },
  },
  build: {
    outDir: "../../dist/documentation",
    emptyOutDir: true, // Changed to true to clean the output directory
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/documentation/index.html')
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  },
  optimizeDeps: {
    exclude: ['fs', 'path']
  }
};

// Create separate build commands
export default defineConfig(({ command, mode }) => {
  if (mode === "lib") {
    return libConfig;
  }

  if (mode === "demo") {
    return demoConfig;
  }

  if (mode === "documentation-dev") {
    return documentationDevConfig;
  }

  if (mode === "documentation") {
    return documentationConfig;
  }

  if (command === "serve") {
    return {
      ...devConfig,
      build: {
        ...devConfig.build,
        rollupOptions: {
          input: path.resolve(__dirname, "index-dev.html"),
        },
      },
    };
  }

  return devConfig;
});
