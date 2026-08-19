/** Default model for authoring specs. Overridable so the catalog can be tried against a cheaper one. */
const DEFAULT_MODEL = 'claude-opus-5';

/**
 * Where a generation gets its credentials. Without an API key the request runs through the local
 * Claude Code install, which signs it with the developer's Claude subscription.
 */
export type StudioCredentials = 'api-key' | 'claude-subscription';

export interface StudioConfig {
  readonly model: string;
  readonly credentials: StudioCredentials;
}

export function loadStudioConfig(): StudioConfig {
  return {
    model: process.env.JSON_RENDER_STUDIO_MODEL ?? DEFAULT_MODEL,
    credentials: process.env.ANTHROPIC_API_KEY?.trim() ? 'api-key' : 'claude-subscription',
  };
}
