/**
 * Models the studio can generate with. The web dropdown and the server's request validator share
 * this list, so the client can only ask for what the server will accept.
 */
export const STUDIO_MODELS = [
  { id: 'claude-sonnet-5', label: 'Sonnet 5' },
  { id: 'claude-opus-5', label: 'Opus 5' },
  { id: 'claude-fable-5', label: 'Fable 5' },
] as const;

export type StudioModelId = (typeof STUDIO_MODELS)[number]['id'];

export const STUDIO_MODEL_IDS = STUDIO_MODELS.map((model) => model.id) as [StudioModelId, ...StudioModelId[]];
