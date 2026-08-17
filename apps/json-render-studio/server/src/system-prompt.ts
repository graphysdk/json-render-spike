import { componentCatalog } from '../../shared/component-catalog.js';

/**
 * What the catalog produced.
 *
 * Built once at module load — the catalog is static and the prompt is long.
 *
 * The custom rules are all failures seen in the stream rather than in the spec: a patch that wraps
 * across lines parses as neither JSON nor JSONL, so the compiler drops it silently, leaving the
 * parent element pointing at a child that never arrived. Long inline arrays are what tempt a model
 * to pretty-print, so the cure is stated at both ends.
 */
export const SYSTEM_PROMPT = componentCatalog.prompt({
  customRules: [
    'Every patch is exactly ONE line of JSON. Never pretty-print or wrap a value across lines, however long it is — a multi-line patch cannot be parsed and is dropped, leaving a missing element',
    'Keep inline data small: at most 12 rows for a table or a chart. Sample or aggregate rather than emitting a long array',
    'A {"$state":"/path"} reference replaces a whole prop value, including an array one — write "rows": {"$state":"/data/sales"}, never "rows": [{"$state":"/data/sales"}], which nests the array inside itself',
  ],
});

/** Appended to the user prompt: the patch order an element tree wants. */
export const ORDERING_REMINDER = [
  'Remember: /root first, then interleave /elements and /state patches so the page fills in as it',
  'streams. Reach for GraphyChart whenever the answer is a shape rather than a number.',
].join('\n');
