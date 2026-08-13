/* eslint-disable import-x/no-default-export */
/* eslint-disable import-x/no-nodejs-modules */
import path from 'node:path';

import { nodeExternals } from 'rollup-plugin-node-externals';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

/**
 * Three entries, split by what each is allowed to pull in: `.` carries the React renderer, `server`
 * stays free of React so an API route can import the schema, and `node` reaches for the optional
 * `@graphysdk/node-renderer` (and with it `@napi-rs/canvas`) that a browser build must never see.
 */
const ENTRIES = {
  index: path.resolve(__dirname, 'src/index.ts'),
  server: path.resolve(__dirname, 'src/server.ts'),
  node: path.resolve(__dirname, 'src/node.ts'),
};

export default defineConfig({
  plugins: [
    nodeExternals({ devDeps: true }),
    // Per-file declarations rather than a rollup: api-extractor cannot resolve the external
    // `@graphysdk/react` package subpaths the renderer entry re-exports types through.
    dts({
      tsconfigPath: './tsconfig.build.json',
      rollupTypes: false,
      include: ['src'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.spec.tsx', 'src/**/__tests__/**'],
    }),
  ],
  build: {
    lib: {
      entry: ENTRIES,
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    minify: 'esbuild',
    sourcemap: false,
    emptyOutDir: true,
    target: 'es2021',
  },
});
