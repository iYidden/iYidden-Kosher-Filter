import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import preact from '@preact/preset-vite';
import { resolve } from 'node:path';
import manifest from './manifest.config';

export default defineConfig({
  plugins: [preact(), crx({ manifest })],
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/core'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@seed': resolve(__dirname, 'src/seed'),
    },
  },
  build: {
    // Use a stable directory name; the loaded-unpacked path stays predictable.
    outDir: 'dist',
    emptyOutDir: true,
    // Source maps off in production to keep bundle clean.
    sourcemap: false,
  },
  server: {
    // Bind the HMR port explicitly so loaded-unpacked HMR stays consistent.
    port: 5173,
    strictPort: true,
  },
});
