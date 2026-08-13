import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { serve } from '@hono/node-server';
import { config as loadDotenv } from 'dotenv';

import { findRepoRoot, loadStudioConfig } from './config.js';
import { createApp } from './create-app.js';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// App-local `.env` wins; agents-api's is the fallback so a configured monorepo needs no extra setup.
loadDotenv({ path: path.join(appRoot, '.env') });
loadDotenv({ path: path.join(findRepoRoot(appRoot), 'apps', 'agents-api', '.env') });

const studioConfig = loadStudioConfig();
const app = createApp(studioConfig);

console.info(`[json-render-studio] API on http://127.0.0.1:${studioConfig.port}`);
console.info(`[json-render-studio] model: ${studioConfig.model}`);
if (!studioConfig.hasApiKey) {
  console.warn('[json-render-studio] ANTHROPIC_API_KEY is not set — generation will return 400.');
}

serve({
  fetch: app.fetch,
  port: studioConfig.port,
});
