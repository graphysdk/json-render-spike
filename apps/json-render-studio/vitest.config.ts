import { defineConfig } from 'vitest/config';

process.env.TZ = 'utc';

// The tests compile chart specs through the catalog's source, same as the app does via tsconfig `paths`.
const packageEntry = (entry: string) => new URL(`../../packages/json-render/src/${entry}`, import.meta.url).pathname;

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@graphysdk\/json-render$/, replacement: packageEntry('index.ts') },
      { find: /^@graphysdk\/json-render\/server$/, replacement: packageEntry('server.ts') },
    ],
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'server/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/.next/**'],
    server: {
      deps: {
        // The published dists import lodash-es subpaths without extensions, which only a
        // bundler resolves — so let Vite transform them instead of Node.
        inline: [/@graphysdk\//],
      },
    },
  },
});
