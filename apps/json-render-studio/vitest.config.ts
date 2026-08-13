import { mergeConfig } from 'vitest/config';

import { nodeVitestConfig } from '@graphytools/vitest-config';

export default mergeConfig(nodeVitestConfig, {
  test: {
    include: ['web/src/**/*.spec.ts', 'server/src/**/*.spec.ts'],
  },
});
