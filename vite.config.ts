import * as path from "path";
import { fileURLToPath } from "url";
import { defineConfig, UserConfig, LibraryFormats } from "vite";
import { readmePlugin } from "./scripts/vite-readme-plugin";
import dts from 'vite-plugin-dts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration for building the library
const libConfig: UserConfig = {
  plugins: [
    dts({
      include: ['src/index.ts', 'src/sound-manager/**/*.ts'],
      exclude: [
        'src/demo/**/*',
        'src/documentation/**/*',
        'src/sound-manager/ticker.ts',
        'src/sound-manager/audio-node-connector.ts'
      ],
      outDir: 'dist/types',
      rollupTypes: false, // Set this to false to preserve directory structure

      beforeWriteFile: (filePath, content) => {
        const excludedFiles = ['ticker.d.ts', 'audio-node-connector.d.ts'];
        if (excludedFiles.some(file => filePath.includes(file))) {
          return false;
        }
        return { filePath, content };
      }
    })
  ],
  build: {
    // minify: false,
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "SoundManagerTS",
      fileName: (format: string) => `sound-manager-ts.${format}.js`,
      formats: ["es", "umd"] as LibraryFormats[],
    },
    rollupOptions: {
      output: {
        globals: {},
        dir: "dist",
      },
    },
    outDir: "dist",
  }
};

const devConfig: UserConfig = {
  root: ".",
  base: "/",
  build: {
    outDir: "dist/demo",
  },
  server: {
    port: 5174,
    strictPort: false,
    // open: "/index-dev.html",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};

// Development configuration for the main demo
const devMainConfig: UserConfig = {
  ...devConfig,
  server: {
    ...devConfig.server,
    open: {
      app: {
        name: 'chrome',
      },
      path: '/src/demo/pages/main/index.html',
    } as any,
  },
};

// Development configuration for the sprite demo
const devSpriteConfig: UserConfig = {
  ...devConfig,
  server: {
    ...devConfig.server,
    open: "/src/demo/pages/sprite/index.html", // Serve the sprite demo HTML
  },
};

const demoMainConfig: UserConfig = {
  base: "./",
  root: path.resolve(__dirname, "src/demo/pages/main"),
  publicDir: path.resolve(__dirname, "public"),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist/demo/main"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "src/demo/pages/main/index.html"),
        general: path.resolve(__dirname, "src/demo/pages/main/general/index.html"),
        multichannel: path.resolve(__dirname, "src/demo/pages/main/multichannel/index.html"),
        spatial: path.resolve(__dirname, "src/demo/pages/main/spatial/index.html"),
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
};


//  removed from package.json
//  "dev:sprite": "vite --mode demo-sprite",
//  "build:demo-sprite": "vite build --mode demo-sprite",

// const demoSpriteConfig: UserConfig = {
//   base: "./",
//   root: path.resolve(__dirname, "src/demo/pages/sprite"), // Set the root to the sprite directory
//   publicDir: path.resolve(__dirname, "public"), // Disable copying of public directory
//   build: {
//     outDir: path.resolve(__dirname, "dist/demo/sprite"), // Use absolute path
//     emptyOutDir: true,
//     rollupOptions: {
//       input: path.resolve(__dirname, "src/demo/pages/sprite/index.html"),
//       output: {
//         entryFileNames: "assets/[name].js",
//         chunkFileNames: "assets/[name]-[hash].js",
//         assetFileNames: "assets/[name]-[hash][extname]",
//       },
//     },
//   },
// };


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
    outDir: path.resolve(__dirname, "dist/documentation"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/documentation/index.html')
      },
      output: {
        dir: path.resolve(__dirname, "dist/documentation"),
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
    outDir: path.resolve(__dirname, "dist/documentation"),
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

  if (mode === "demo-main") {
    return command === "serve" ? devMainConfig : demoMainConfig;
  }

  // if (mode === "demo-sprite") {
  //   return command === "serve" ? devSpriteConfig : demoSpriteConfig;
  // }

  if (mode === "documentation-dev") {
    return documentationDevConfig;
  }

  if (mode === "documentation") {
    return documentationConfig;
  }

  // if (command === "serve") {
  //   return {
  //     ...devConfig,
  //     server: {
  //       ...devConfig.server,
  //       open: "/index-dev.html", // Default to index-dev.html for generic dev
  //     },
  //   };
  // }

  return devConfig;
});
