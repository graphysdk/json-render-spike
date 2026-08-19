import { defineConfig } from 'vitest/config';

process.env.TZ = 'utc';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    setupFiles: ['./src/vitest.setup.ts'],
    server: {
      deps: {
        // The published dists import lodash-es subpaths without extensions, which only a
        // bundler resolves — so let Vite transform them instead of Node.
        inline: [/@graphysdk\//],
      },
    },
  },
});
