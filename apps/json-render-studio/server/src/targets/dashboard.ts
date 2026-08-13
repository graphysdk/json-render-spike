import { defineCatalog } from '@json-render/core';

import {
  schema,
  standardCoordDefinitions,
  standardGeomDefinitions,
  standardScaleDefinitions,
  standardStatDefinitions,
  standardTransformDefinitions,
} from '@graphysdk/json-render/server';

import type { GenerationTarget } from './target.js';

/**
 * The full grammar of graphics, as its own document.
 *
 * A custom geom becomes authorable by adding an entry here and registering a viz-engine plugin of
 * the same name on the renderer — the schema's prompt template picks it up with no code change.
 */
export const dashboardCatalog = defineCatalog(schema, {
  geoms: standardGeomDefinitions,
  stats: standardStatDefinitions,
  scales: standardScaleDefinitions,
  coords: standardCoordDefinitions,
  transforms: standardTransformDefinitions,
});

export const dashboardTarget: GenerationTarget = {
  id: 'dashboard',
  label: 'Graphy dashboard',
  blurb: 'The full grammar of graphics — layers, stats, scales, transforms, polar coords.',
  systemPrompt: dashboardCatalog.prompt(),
  orderingReminder: [
    'Remember: /document first, then each dataset, then /charts as an empty array, then one patch',
    'per chart, in reading order. Invent plausible data — enough rows to make the shape readable.',
  ].join('\n'),
};
