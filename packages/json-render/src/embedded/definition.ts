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
import { CHART_STYLE_NAMES, chartStyles } from '../styles/chart-styles';

import { type GraphyChartComponentProps, graphyChartPropsSchema } from './props-schema';

/** Leaves every optional field out — except `style`, which a chart normally carries. */
const EXAMPLE_PROPS: GraphyChartComponentProps = {
  height: 320,
  style: 'braun',
  rows: [
    { month: 'Jan', region: 'EMEA', revenue: 120 },
    { month: 'Jan', region: 'AMER', revenue: 90 },
    { month: 'Feb', region: 'EMEA', revenue: 145 },
    { month: 'Feb', region: 'AMER', revenue: 110 },
  ],
  spec: {
    mapping: { x: 'month', y: 'revenue', color: 'region' },
    layers: [{ type: 'layer', geom: 'line', params: { interpolate: 'linear' } }],
    scales: [
      { type: 'scale', scaledAesthetic: 'x', scaleType: 'inferred' },
      { type: 'scale', scaledAesthetic: 'y', scaleType: 'continuous', zero: true, nice: true },
      { type: 'scale', scaledAesthetic: 'color', scaleType: 'palette' },
    ],
    config: { content: { title: 'Revenue by month' } },
  },
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

  const styleEntries = CHART_STYLE_NAMES.map((name) => `${name} (${chartStyles[name].description})`).join('; ');

  return [
    'A chart built from a grammar of graphics: `rows` holds its data inline, `spec` says what to draw from them.',
    ...sections,
    `CHANNELS: ${AESTHETIC_CHANNELS.join('. ')}.`,
    `RULES: ${CHART_GRAMMAR_RULES.join('. ')}.`,
    'A chart draws its own header from `config.content` — a chart asked for on its own goes straight on the page, not inside a card. When a chart does sit inside a card or panel, put the title and subtitle on exactly one of the two, never both.',
    `STYLES (the top-level \`style\` prop): ${styleEntries}. Pick the style that fits the request and set it on every chart, the same one across a page. Leave it unset only when the user asks for custom styling of their own.`,
  ].join(' ');
}
