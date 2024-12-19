import { defineConfig } from 'vite';

export default defineConfig({
  assetsInclude: ['**/*.html'],
  plugins: [],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  resolve: {
    alias: {
      '@': '/src'  // This allows you to use '@' as an alias for '/src' in imports
    }
  }
});