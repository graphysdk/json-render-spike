import type { z } from 'zod';

import {
  standardCoordDefinitions,
  standardGeomDefinitions,
  standardScaleDefinitions,
  standardStatDefinitions,
  standardTransformDefinitions,
} from '../grammar/catalog';
import { formatCatalogParams } from '../grammar/format-params';
import { AESTHETIC_CHANNELS, CHART_GRAMMAR_RULES } from '../grammar/rules';

import { type GraphyChartComponentProps, graphyChartPropsSchema } from './props-schema';

/** Leaves every optional field out, because that is how a model should write one. */
const EXAMPLE_PROPS: GraphyChartComponentProps = {
  title: 'Revenue by month',
  height: 320,
  rows: [
    { month: 'Jan', region: 'EMEA', revenue: 120 },
    { month: 'Jan', region: 'AMER', revenue: 90 },
    { month: 'Feb', region: 'EMEA', revenue: 145 },
    { month: 'Feb', region: 'AMER', revenue: 110 },
  ],
  mapping: { x: 'month', y: 'revenue', color: 'region' },
  layers: [{ geom: 'line', params: { interpolate: 'linear' } }],
  scales: [
    { aesthetic: 'x', scaleType: 'inferred' },
    { aesthetic: 'y', scaleType: 'continuous', options: { zero: true, nice: true } },
    { aesthetic: 'color', scaleType: 'palette' },
  ],
};

/**
 * A drop-in catalog entry for element-tree schemas such as `@json-render/react`'s.
 *
 * Spread it into a host catalog's components — `{ ...shadcnComponentDefinitions, GraphyChart:
 * graphyChartComponentDefinition }` — and pair it with `GraphyChartComponent` in the registry. The
 * `slots` field is what an element-tree schema expects; it is empty because a chart has no children.
 */
export const graphyChartComponentDefinition = {
  props: graphyChartPropsSchema,
  slots: [] as string[],
  description: buildChartDescription(),
  example: EXAMPLE_PROPS,
};

/**
 * The description a host catalog shows the model.
 *
 * Assembled rather than written: the vocabulary is each catalog entry's own description and shape,
 * the channels are {@link AESTHETIC_CHANNELS} and the composition rules are {@link
 * CHART_GRAMMAR_RULES}, so the grammar is stated once and taught wherever a chart is authored — in
 * one paragraph rather than five prompt sections, because here it competes with every other
 * component for the model's attention.
 */
function buildChartDescription(): string {
  const vocabulary: Array<[string, Record<string, { description: string; props?: z.ZodType }>]> = [
    ['GEOMS', standardGeomDefinitions],
    ['STATS', standardStatDefinitions],
    ['SCALE TYPES', standardScaleDefinitions],
    ['COORDS', standardCoordDefinitions],
    ['TRANSFORMS', standardTransformDefinitions],
  ];

  const sections = vocabulary.map(([heading, definitions]) => {
    const entries = Object.entries(definitions)
      .map(([name, definition]) => {
        const shape = definition.props === undefined ? '' : formatCatalogParams(definition.props);
        return `${name}${shape} (${definition.description})`;
      })
      .join('; ');
    return `${heading}: ${entries}`;
  });

  return [
    'A chart built from a grammar of graphics, with its data inline.',
    ...sections,
    `CHANNELS: ${AESTHETIC_CHANNELS.join('. ')}.`,
    `RULES: ${CHART_GRAMMAR_RULES.join('. ')}.`,
  ].join(' ');
}
