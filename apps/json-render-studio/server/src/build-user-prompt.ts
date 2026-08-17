import { ORDERING_REMINDER } from './system-prompt.js';

const MAX_PROMPT_LENGTH = 4000;

/**
 * The user half of the prompt.
 *
 * `@json-render/core` ships `buildUserPrompt`, but it signs off with its own patch-ordering advice
 * and gates it on `spec.root`/`spec.elements`, which a half-streamed spec does not yet have — so the
 * reminder is appended here instead.
 */
export function buildStudioUserPrompt(prompt: string, currentSpec: Record<string, unknown> | null): string {
  const request = prompt.slice(0, MAX_PROMPT_LENGTH).trim();

  if (currentSpec === null) {
    return [request, '', ORDERING_REMINDER].join('\n');
  }

  return [
    'Here is the current spec:',
    '',
    JSON.stringify(currentSpec, null, 2),
    '',
    `Change request: ${request}`,
    '',
    'Emit ONLY the JSON Patch operations needed to make that change — do not re-send unchanged parts.',
    'Address existing entries by their path, e.g. {"op":"replace","path":"/elements/hero/props/title","value":"..."}',
    'or {"op":"remove","path":"/elements/hero"}. Keep every cross-reference consistent: a removed',
    'element must leave no dangling child key, and no parent may list a child that is gone.',
  ].join('\n');
}
