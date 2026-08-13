import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const webRoot = path.dirname(fileURLToPath(import.meta.url));

// The vanilla-extract plugin compiles react-renderer's `.css.ts` files in a separate SSR Vite server
// that ignores `resolve.conditions`, so workspace deps reached from there fall back to a `dist` that
// may not be built. Alias the ones in that graph to their sources.
const sourceEntry = (pkg: string) => path.resolve(webRoot, '..', '..', '..', 'packages', pkg, 'src', 'index.ts');

export default defineConfig({
  root: webRoot,
  plugins: [react(), tailwindcss(), vanillaExtractPlugin()],
  resolve: {
    // Workspace packages expose `local` → src; default resolution expects built `dist/`.
    conditions: ['local'],
    alias: [{ find: /^@graphysdk\/viz-engine$/, replacement: sourceEntry('viz-engine') }],
  },
  server: {
    port: 5190,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4320',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: path.join(webRoot, 'dist'),
    emptyOutDir: true,
  },
});
