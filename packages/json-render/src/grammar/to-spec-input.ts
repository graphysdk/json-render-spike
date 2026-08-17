import type { ScaledAestheticKey, SpecInput } from '@graphysdk/viz-engine';

import type { GraphyChart, GraphyScale } from './chart.types';

/**
 * Scale types whose options sit flat on the scale node. Only `inferred` keeps its options nested,
 * so the projection is one rule rather than a per-type table.
 */
const NESTED_OPTION_SCALE_TYPES = new Set(['inferred']);

/**
 * Projects one chart onto a viz-engine `SpecInput`.
 *
 * An authored node already *is* the engine's node bar the constant `type` tag the JSON leaves out,
 * so each one carries over whole; only a scale's nested `options` has to be unwrapped. Authored
 * values pass through untouched — resolving them against their defaults is the compiler's job.
 */
export function toSpecInput(chart: GraphyChart): SpecInput {
  return {
    mapping: chart.mapping,
    layers: chart.layers.map((layer) => ({ ...layer, type: 'layer' })) as SpecInput['layers'],
    scales: chart.scales.map(toScaleInput),
    transforms: (chart.transforms ?? []).map((transform) => ({
      ...transform,
      type: 'transform',
      options: transform.options ?? {},
    })),
    highlights: [],
    coords: chart.coord ? ({ ...chart.coord, type: 'coord' } as SpecInput['coords']) : undefined,
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

/** The one node whose shape differs: the catalog nests a scale's options, the engine spreads them. */
function toScaleInput(scale: GraphyScale): SpecInput['scales'][number] {
  const base = { type: 'scale', scaledAesthetic: scale.aesthetic as ScaledAestheticKey, scaleType: scale.scaleType };

  if (NESTED_OPTION_SCALE_TYPES.has(scale.scaleType)) {
    return { ...base, options: scale.options } as SpecInput['scales'][number];
  }

  return { ...base, ...scale.options } as SpecInput['scales'][number];
}
