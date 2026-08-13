import type { Data, ScaledAestheticKey, SpecInput } from '@graphysdk/viz-engine';

import type { GraphyChart, GraphyDataset, GraphyLayer, GraphyScale, GraphySpec } from './spec.types';

/**
 * Scale types whose options sit flat on the scale node. Only `inferred` keeps its options nested,
 * so the projection is one rule rather than a per-type table.
 */
const NESTED_OPTION_SCALE_TYPES = new Set(['inferred']);

/** Converts a spec dataset into the `Data` the compiler and `<GraphProvider>` take. */
export function toGraphData(dataset: GraphyDataset): Data {
  return { columns: dataset.columns, rows: dataset.rows };
}

/**
 * Projects one chart onto a viz-engine `SpecInput`.
 *
 * The shapes line up field for field — the work is unwrapping the catalog's nested `params` /
 * `options` onto the engine's nodes and dropping the `null`s a model emits for absent fields.
 */
export function toSpecInput(chart: GraphyChart): SpecInput {
  const coordParams = omitNullValues(chart.coord?.params);

  return {
    mapping: chart.mapping,
    layers: chart.layers.map(toLayerInput),
    scales: chart.scales.map(toScaleInput),
    transforms: (chart.transforms ?? []).map((transform) => ({
      type: 'transform',
      transformType: transform.transformType,
      options: omitNullValues(transform.options) ?? {},
    })) as SpecInput['transforms'],
    highlights: [],
    coords: chart.coord
      ? ({ type: 'coord', coordType: chart.coord.coordType, params: coordParams } as SpecInput['coords'])
      : undefined,
    config: {
      content: {
        title: chart.title,
        subtitle: chart.subtitle,
        caption: chart.caption,
      },
      legend: chart.legendPosition ? { position: chart.legendPosition } : undefined,
    },
  };
}

/**
 * Resolves a chart to the `input` and `data` pair a renderer needs, or `undefined` when the chart
 * names a dataset the spec does not carry.
 */
export function resolveChartInput(spec: GraphySpec, chart: GraphyChart): { input: SpecInput; data: Data } | undefined {
  const dataset = spec.datasets[chart.datasetId];
  if (dataset === undefined) {
    return undefined;
  }

  return { input: toSpecInput(chart), data: toGraphData(dataset) };
}

/**
 * Strips `null` values one level deep.
 *
 * The catalog marks optional fields `.nullable()` because models reliably emit `null` where they
 * would otherwise omit a key, and viz-engine reads an absent field as "use the default" while a
 * `null` can mean an explicit empty. Dropping them keeps a model's `null` from overriding a default.
 */
function omitNullValues(source: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (source === undefined) {
    return undefined;
  }

  const entries = Object.entries(source).filter(([, value]) => value !== null && value !== undefined);
  return entries.length === 0 ? undefined : Object.fromEntries(entries);
}

function toLayerInput(layer: GraphyLayer): SpecInput['layers'][number] {
  return {
    type: 'layer',
    id: layer.id,
    geom: layer.geom,
    params: omitNullValues(layer.params),
    mapping: layer.mapping,
    stat: layer.stat,
    position: layer.position,
    yScaleType: layer.yScaleType,
  } as SpecInput['layers'][number];
}

function toScaleInput(scale: GraphyScale): SpecInput['scales'][number] {
  const options = omitNullValues(scale.options);
  const base = { type: 'scale', scaledAesthetic: scale.aesthetic as ScaledAestheticKey, scaleType: scale.scaleType };

  if (NESTED_OPTION_SCALE_TYPES.has(scale.scaleType)) {
    return { ...base, options } as SpecInput['scales'][number];
  }

  return { ...base, ...options } as SpecInput['scales'][number];
}
