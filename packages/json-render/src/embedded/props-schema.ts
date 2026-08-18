import { z } from 'zod';

import type { YScaleType } from '@graphysdk/viz-engine';
import { POSITION_TYPES, SCALED_POSITION_AESTHETIC_KEYS, SCALED_VISUAL_AESTHETIC_KEYS } from '@graphysdk/viz-engine';

import {
  standardCoordDefinitions,
  standardGeomDefinitions,
  standardScaleDefinitions,
  standardStatDefinitions,
  standardTransformDefinitions,
} from '../grammar/catalog';
import { CHART_STYLE_NAMES } from '../styles/chart-styles';

/**
 * The props of a single embedded Graphy chart: the data, the spec that reads it, and the box to
 * paint in.
 *
 * `spec` is a viz-engine `SpecInput` — same field names, same nesting, same `type` tags — read
 * through the catalog's vocabulary rather than the engine's types, because a registered geom widens
 * what may be authored and a `z.enum` over catalog keys is a `string`. So the shape carries over
 * whole and only the names are narrowed.
 */
export type GraphyChartComponentProps = z.infer<typeof graphyChartPropsSchema>;

const SCALED_AESTHETICS = [...SCALED_POSITION_AESTHETIC_KEYS, ...SCALED_VISUAL_AESTHETIC_KEYS] as [string, ...string[]];
const Y_SCALE_TYPES = ['primary', 'secondary'] as const satisfies readonly YScaleType[];
const LEGEND_POSITIONS = ['auto', 'top', 'right', 'bottom', 'left', 'none'] as const;
/**
 * A geom's or coord's `params`, a transform's `options`: open here, because the shape depends on the
 * entry named beside it and a host schema types a component's props as one object. The per-entry
 * shapes reach the model through the component description instead.
 */
const catalogParams = z.record(z.string(), z.unknown());
/** A channel bound to a data column by name, or to a constant applied to every observation. */
const aestheticValue = z.union([z.string(), z.object({ value: z.union([z.string(), z.number(), z.null()]) })]);
const mappingSchema = z.record(z.string(), aestheticValue);

/** The slice of the engine's chart config a page-embedded chart is authored with. */
const configSchema = z.object({
  content: z
    .object({
      title: z.string().optional(),
      subtitle: z.string().optional(),
      caption: z.string().optional(),
    })
    .optional(),
  legend: z.object({ position: z.enum(LEGEND_POSITIONS) }).optional(),
});

/**
 * Names come from the catalog itself, so registering a geom widens what a chart component may be
 * authored with. `z.enum` wants a non-empty tuple; the catalogs are never empty.
 */
const namesOf = (definitions: Record<string, unknown>): [string, ...string[]] =>
  Object.keys(definitions) as [string, ...string[]];

const layerSchema = z.object({
  type: z.literal('layer'),
  geom: z.enum(namesOf(standardGeomDefinitions)),
  /** That geom's own parameters. */
  params: catalogParams.optional(),
  /** Layer-local mapping, merged over the spec's — how a second layer reads a different column. */
  mapping: mappingSchema.optional(),
  stat: z.enum(namesOf(standardStatDefinitions)).optional(),
  position: z.enum(POSITION_TYPES).optional(),
  /** Which y axis the layer is positioned against. Defaults to the primary one. */
  yScaleType: z.enum(Y_SCALE_TYPES).optional(),
});

/**
 * A scale node. Loose, because a scale's options sit flat beside `scaleType` rather than nested
 * under a key of their own — `{"type":"scale","scaledAesthetic":"y","scaleType":"continuous","zero":true}`.
 */
const scaleSchema = z.looseObject({
  type: z.literal('scale'),
  scaledAesthetic: z.enum(SCALED_AESTHETICS),
  scaleType: z.enum(namesOf(standardScaleDefinitions)),
});

const transformSchema = z.object({
  type: z.literal('transform'),
  transformType: z.enum(namesOf(standardTransformDefinitions)),
  /** That transform's own options. */
  options: catalogParams,
});

const coordSchema = z.object({
  type: z.literal('coord'),
  coordType: z.enum(namesOf(standardCoordDefinitions)),
  params: catalogParams.optional(),
});

export const graphyChartPropsSchema = z.object({
  /** Chart height in pixels. Defaults to 320. */
  height: z.number().optional(),
  /** A baked-in visual style by name. Left unset, the host's default look applies. */
  style: z.enum(CHART_STYLE_NAMES).optional(),
  /** The chart's own data, inline — one object per observation. Dates go in as ISO strings. */
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()]))),
  /** A viz-engine spec: what to draw from those rows, and how to position it. */
  spec: z.object({
    /** Visual channel to column name: {"x": "month", "y": "revenue", "color": "region"}. */
    mapping: mappingSchema,
    layers: z.array(layerSchema),
    scales: z.array(scaleSchema),
    /** Data transforms applied before the layers are compiled, in order. */
    transforms: z.array(transformSchema).optional(),
    coords: coordSchema.optional(),
    config: configSchema.optional(),
  }),
});
