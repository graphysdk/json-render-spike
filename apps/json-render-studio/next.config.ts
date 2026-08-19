import path from 'node:path';

import type { NextConfig } from 'next';

const workspaceRoot = path.join(import.meta.dirname, '..', '..');

const nextConfig: NextConfig = {
  // The catalog package is consumed as source (tsconfig `paths` point at its src), so Next compiles it.
  transpilePackages: ['@graphysdk/json-render'],
  agentRules: false,
  turbopack: {
    root: workspaceRoot,
  },
  outputFileTracingRoot: workspaceRoot,
};

export default nextConfig;
