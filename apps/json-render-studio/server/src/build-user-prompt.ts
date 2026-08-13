import type { GenerationTarget } from './targets/index.js';

const MAX_PROMPT_LENGTH = 4000;

/**
 * The user half of the prompt.
 *
 * `@json-render/core` ships `buildUserPrompt`, but it closes over the element-tree spec shape — it
 * gates on `spec.root`/`spec.elements` and signs off with "output /root first". Only one of our
 * targets has those paths, so the ordering reminder comes from the target instead.
 */
export function buildStudioUserPrompt(
  target: GenerationTarget,
  prompt: string,
  currentSpec: Record<string, unknown> | null
): string {
  const request = prompt.slice(0, MAX_PROMPT_LENGTH).trim();

  if (currentSpec === null) {
    return [request, '', target.orderingReminder].join('\n');
  }

  return [
    'Here is the current spec:',
    '',
    JSON.stringify(currentSpec, null, 2),
    '',
    `Change request: ${request}`,
    '',
    'Emit ONLY the JSON Patch operations needed to make that change — do not re-send unchanged parts.',
    'Address existing entries by their path, e.g. {"op":"replace","path":"/charts/0/title","value":"..."}',
    'or {"op":"remove","path":"/elements/hero"}. Keep every cross-reference consistent: a removed',
    'element must leave no dangling child key, and a removed chart must leave no layout entry.',
  ].join('\n');
}
