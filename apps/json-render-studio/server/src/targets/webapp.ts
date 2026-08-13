import { webappCatalog } from '../../../shared/webapp-catalog.js';

import type { GenerationTarget } from './target.js';

export const webappTarget: GenerationTarget = {
  id: 'webapp',
  label: 'React webapp',
  blurb: 'shadcn/ui components with state and actions. Charts are one component among 36.',
  // A patch that wraps across lines parses as neither JSON nor JSONL, so the stream compiler drops
  // it — silently, leaving the parent element pointing at a child that never arrived. Long inline
  // arrays are what tempt a model to pretty-print, so the cure is stated at both ends.
  systemPrompt: webappCatalog.prompt({
    customRules: [
      'Every patch is exactly ONE line of JSON. Never pretty-print or wrap a value across lines, however long it is — a multi-line patch cannot be parsed and is dropped, leaving a missing element',
      'Keep inline data small: at most 12 rows for a table or a chart. Sample or aggregate rather than emitting a long array',
      'A {"$state":"/path"} reference replaces a whole prop value, including an array one — write "rows": {"$state":"/data/sales"}, never "rows": [{"$state":"/data/sales"}], which nests the array inside itself',
    ],
  }),
  orderingReminder: [
    'Remember: /root first, then interleave /elements and /state patches so the page fills in as it',
    'streams. Reach for GraphyChart whenever the answer is a shape rather than a number.',
  ].join('\n'),
};
