import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { defineConfig, mergeConfig } from 'vitest/config';

import { browserVitestConfig } from '@graphytools/vitest-config';

const globalSetup = Array.isArray(browserVitestConfig.test?.setupFiles) ? browserVitestConfig.test.setupFiles : [];

// Mounting the chart component reaches the real react-renderer, whose `.css.ts` files need the
// vanilla-extract plugin. That plugin compiles them in a separate SSR Vite server which ignores our
// `local` resolve condition, so workspace deps reached from there fall back to a `dist` that a clean
// checkout does not have — alias the ones in that graph to their sources.
const sourceEntry = (pkg: string) => new URL(`../${pkg}/src/index.ts`, import.meta.url).pathname;

// eslint-disable-next-line import-x/no-default-export
export default mergeConfig(
  browserVitestConfig,
  defineConfig({
    plugins: [vanillaExtractPlugin()],
    resolve: {
      alias: [
        { find: /^@graphysdk\/viz-engine$/, replacement: sourceEntry('viz-engine') },
        { find: /^@graphysdk\/i18n$/, replacement: sourceEntry('i18n') },
      ],
    },
    test: {
      setupFiles: [...globalSetup, './src/vitest.setup.ts'],
    },
  })
);
