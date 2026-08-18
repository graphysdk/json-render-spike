import fs from 'node:fs';
import path from 'node:path';

/** Default model for authoring specs. Overridable so the catalog can be tried against a cheaper one. */
const DEFAULT_MODEL = 'claude-sonnet-5';
const DEFAULT_PORT = 4320;

/**
 * Where a generation gets its credentials. Without an API key the request runs through the local
 * Claude Code install, which signs it with the developer's Claude subscription.
 */
export type StudioCredentials = 'api-key' | 'claude-subscription';

export interface StudioConfig {
  readonly port: number;
  readonly model: string;
  readonly credentials: StudioCredentials;
}

export function findRepoRoot(startDir: string): string {
  let dir = startDir;
  for (let depth = 0; depth < 12; depth += 1) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  throw new Error('Could not locate monorepo root (pnpm-workspace.yaml).');
}

export function loadStudioConfig(): StudioConfig {
  return {
    port: Number(process.env.JSON_RENDER_STUDIO_PORT ?? DEFAULT_PORT),
    model: process.env.JSON_RENDER_STUDIO_MODEL ?? DEFAULT_MODEL,
    credentials: process.env.ANTHROPIC_API_KEY?.trim() ? 'api-key' : 'claude-subscription',
  };
}
