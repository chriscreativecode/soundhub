import * as path from "path";
import { fileURLToPath } from "url";
import { defineConfig, UserConfig,LibraryFormats } from "vite";
import { readmePlugin } from "./scripts/vite-readme-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration for building the library
const libConfig : UserConfig = {
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

const devConfig : UserConfig = {
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

const demoConfig: UserConfig= {
  base: "./",
  build: {
    outDir: "dist/demo",
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, "index-prod.html"), // This will output as index.html
      },
      output: {
        dir: "dist/demo",
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
};

// Documentation development configuration
const documentationDevConfig: UserConfig = {
  plugins: [readmePlugin()],
  root: "src/documentation",
  base: "./",
  server: {
    port: 5173,
    open: '/index.html',
    watch: {
      usePolling: false,
    },
  },
  build: {
    outDir: "../../dist/documentation",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/documentation/index.html')
      },
      output: {
        dir: "../../dist/documentation",
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

// Documentation production configuration
const documentationConfig: UserConfig = {
  plugins: [readmePlugin()],
  root: "src/documentation",
  base: "./",
  build: {
    outDir: "../dist/documentation",
    emptyOutDir: true,
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
          input: path.resolve(__dirname, "index.html"),
        },
      },
    };
  }

  return devConfig;
});
