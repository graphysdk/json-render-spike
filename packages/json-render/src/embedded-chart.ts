import { z } from 'zod';

import type { Data, PositionType, SpecInput } from '@graphysdk/viz-engine';
import { POSITION_TYPES, SCALED_POSITION_AESTHETIC_KEYS, SCALED_VISUAL_AESTHETIC_KEYS } from '@graphysdk/viz-engine';

import {
  standardCoordDefinitions,
  standardGeomDefinitions,
  standardScaleDefinitions,
  standardStatDefinitions,
} from './catalog';
import { CHART_GRAMMAR_RULES } from './grammar-rules';
import type { GraphyChart, GraphyDataset } from './spec.types';
import { toGraphData, toSpecInput } from './to-spec-input';

export type GraphyChartComponentProps = z.infer<typeof graphyChartPropsSchema>;

const SCALED_AESTHETICS = [...SCALED_POSITION_AESTHETIC_KEYS, ...SCALED_VISUAL_AESTHETIC_KEYS] as [string, ...string[]];
/** The chart is its own document here, so its id carries no meaning beyond satisfying the type. */
const EMBEDDED_CHART_ID = 'embedded';

const EXAMPLE_PROPS: GraphyChartComponentProps = {
  title: 'Revenue by month',
  subtitle: null,
  caption: null,
  height: 320,
  rows: [
    { month: 'Jan', region: 'EMEA', revenue: 120 },
    { month: 'Jan', region: 'AMER', revenue: 90 },
    { month: 'Feb', region: 'EMEA', revenue: 145 },
    { month: 'Feb', region: 'AMER', revenue: 110 },
  ],
  mapping: { x: 'month', y: 'revenue', color: 'region' },
  layers: [{ geom: 'line', stat: null, position: null }],
  scales: [
    { aesthetic: 'x', scaleType: 'inferred' },
    { aesthetic: 'y', scaleType: 'continuous' },
    { aesthetic: 'color', scaleType: 'palette' },
  ],
  coord: null,
};

/**
 * Projects embedded chart props onto a viz-engine spec and its data.
 *
 * React-free, so the same props render to PNG through `@graphysdk/node-renderer` as they do in a
 * page.
 *
 * Every field is read defensively because this is the boundary between model output and the engine:
 * a host renderer resolves prop expressions and hands them over without validating against the zod
 * schema, and a model treats `.nullable()` as licence to omit the key entirely. Absent and null both
 * have to mean "use the default" — the engine reads an absent field that way, while a null can mean
 * an explicit empty.
 */
export function resolveEmbeddedChartInput(props: GraphyChartComponentProps): { input: SpecInput; data: Data } {
  // The type says every field is present; the runtime says otherwise, so widen it once here rather
  // than pretend each read is safe.
  const authored = props as Partial<GraphyChartComponentProps>;
  const rows = readRows(authored.rows);
  const coord = authored.coord ?? undefined;

  const chart: GraphyChart = {
    id: EMBEDDED_CHART_ID,
    datasetId: EMBEDDED_CHART_ID,
    title: authored.title ?? undefined,
    subtitle: authored.subtitle ?? undefined,
    caption: authored.caption ?? undefined,
    mapping: authored.mapping ?? {},
    layers: (authored.layers ?? []).map((layer) => ({
      geom: layer.geom,
      stat: layer.stat ?? undefined,
      position: (layer.position ?? undefined) as PositionType | undefined,
    })),
    scales: (authored.scales ?? []).map((scale) => ({ aesthetic: scale.aesthetic, scaleType: scale.scaleType })),
    coord: coord === undefined ? undefined : { coordType: coord.coordType, params: coord.params ?? undefined },
  };

  return { input: toSpecInput(chart), data: toGraphData({ columns: collectColumns(rows), rows }) };
}

/**
 * Names come from the catalog itself, so registering a geom widens what a chart component may be
 * authored with. `z.enum` wants a non-empty tuple; the catalogs are never empty.
 */
const namesOf = (definitions: Record<string, unknown>): [string, ...string[]] =>
  Object.keys(definitions) as [string, ...string[]];

/**
 * The props of a single embedded Graphy chart.
 *
 * Field for field a {@link GraphyChart} with its data inline instead of behind a `datasetId`, so
 * {@link resolveEmbeddedChartInput} is a rename rather than a translation and a chart authored for a
 * page moves into a dashboard unchanged. Geom params, layer-local mappings, transforms and secondary
 * axes are the deliberate omissions: a chart needing those has outgrown being one component on a
 * page and belongs in the dashboard schema, which teaches the whole grammar.
 */
export const graphyChartPropsSchema = z.object({
  title: z.string().nullable(),
  subtitle: z.string().nullable(),
  caption: z.string().nullable(),
  /** Chart height in pixels. Defaults to 320. */
  height: z.number().nullable(),
  /** The chart's own data, inline — one object per observation. Dates go in as ISO strings. */
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()]))),
  /** Visual channel to column name: {"x": "month", "y": "revenue", "color": "region"}. */
  mapping: z.record(z.string(), z.string()),
  layers: z.array(
    z.object({
      geom: z.enum(namesOf(standardGeomDefinitions)),
      stat: z.enum(namesOf(standardStatDefinitions)).nullable(),
      position: z.enum(POSITION_TYPES).nullable(),
    })
  ),
  scales: z.array(
    z.object({
      aesthetic: z.enum(SCALED_AESTHETICS),
      scaleType: z.enum(namesOf(standardScaleDefinitions)),
    })
  ),
  coord: z
    .object({
      coordType: z.enum(namesOf(standardCoordDefinitions)),
      params: z.record(z.string(), z.unknown()).nullable(),
    })
    .nullable(),
});

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
 * The rows a host really handed over.
 *
 * A host resolves a prop expression in place, so `rows: [{"$state": "/data/sales"}]` — a reference
 * written where the type says an array goes — arrives as the rows nested one level deep. Every
 * column then reads as absent and the chart fails on a mapping that was never wrong, so unwrap it.
 */
function readRows(rows: GraphyDataset['rows'] | undefined): GraphyDataset['rows'] {
  if (rows === undefined) {
    return [];
  }
  const entries: unknown[] = rows;
  return entries.every((entry) => Array.isArray(entry)) ? (entries.flat() as GraphyDataset['rows']) : rows;
}

/** Union of the keys across rows — a model may omit a null-valued column on some of them. */
function collectColumns(rows: GraphyDataset['rows']): GraphyDataset['columns'] {
  const keys = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      keys.add(key);
    }
  }
  return [...keys].map((key) => ({ key }));
}

/**
 * The description a host catalog shows the model.
 *
 * Assembled rather than written: the vocabulary is each catalog entry's own description and the
 * composition rules are the shared {@link CHART_GRAMMAR_RULES}, so a chart embedded in someone
 * else's catalog is taught what the dashboard schema teaches — in one paragraph rather than five
 * prompt sections, because here it competes with every other component for the model's attention.
 */
function buildChartDescription(): string {
  const vocabulary = [
    ['GEOMS', standardGeomDefinitions],
    ['STATS', standardStatDefinitions],
    ['SCALE TYPES', standardScaleDefinitions],
    ['COORDS', standardCoordDefinitions],
  ] as const;

  const sections = vocabulary.map(([heading, definitions]) => {
    const entries = Object.entries(definitions)
      .map(([name, definition]) => `${name} (${definition.description})`)
      .join('; ');
    return `${heading}: ${entries}`;
  });

  return [
    'A chart built from a grammar of graphics, with its data inline.',
    ...sections,
    `RULES: ${CHART_GRAMMAR_RULES.join('. ')}.`,
  ].join(' ');
}
