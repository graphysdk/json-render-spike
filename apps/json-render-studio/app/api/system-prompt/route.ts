import { SYSTEM_PROMPT } from '../../../server/src/system-prompt';

// The prompt is the catalog's product, so expose it: tuning a component description is a
// studio workflow, and the only way to see the effect is to read what the catalog emitted.
export function GET(): Response {
  return new Response(SYSTEM_PROMPT, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
