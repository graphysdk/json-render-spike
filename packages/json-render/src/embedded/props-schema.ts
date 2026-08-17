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

export type GraphyChartComponentProps = z.infer<typeof graphyChartPropsSchema>;

const SCALED_AESTHETICS = [...SCALED_POSITION_AESTHETIC_KEYS, ...SCALED_VISUAL_AESTHETIC_KEYS] as [string, ...string[]];
const Y_SCALE_TYPES = ['primary', 'secondary'] as const satisfies readonly YScaleType[];
const LEGEND_POSITIONS = ['auto', 'top', 'right', 'bottom', 'left', 'none'] as const;

/**
 * A geom's `params`, a scale's or transform's `options`: open here, because the shape depends on the
 * entry named beside it and a host schema types a component's props as one object. The per-entry
 * shapes reach the model through the component description instead.
 */
const catalogParams = z.record(z.string(), z.unknown()).optional();
/** A channel bound to a data column by name, or to a constant applied to every observation. */
const aestheticValue = z.union([z.string(), z.object({ value: z.union([z.string(), z.number(), z.null()]) })]);
const mappingSchema = z.record(z.string(), aestheticValue);

/**
 * Names come from the catalog itself, so registering a geom widens what a chart component may be
 * authored with. `z.enum` wants a non-empty tuple; the catalogs are never empty.
 */
const namesOf = (definitions: Record<string, unknown>): [string, ...string[]] =>
  Object.keys(definitions) as [string, ...string[]];

/**
 * The props of a single embedded Graphy chart.
 *
 * Field for field a `GraphyChart` with its data inline, so `resolveEmbeddedChartInput` is a rename
 * rather than a translation. The whole grammar is reachable here — geom `params`, layer-local
 * `mapping`, `yScaleType` for a second y axis, scale `options` and chart `transforms` — so a chart
 * that grows past what one page usually asks for does not have to leave the page to grow.
 */
export const graphyChartPropsSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  caption: z.string().optional(),
  /** Chart height in pixels. Defaults to 320. */
  height: z.number().optional(),
  /** The chart's own data, inline — one object per observation. Dates go in as ISO strings. */
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()]))),
  /** Visual channel to column name: {"x": "month", "y": "revenue", "color": "region"}. */
  mapping: mappingSchema,
  layers: z.array(
    z.object({
      geom: z.enum(namesOf(standardGeomDefinitions)),
      /** That geom's own parameters. */
      params: catalogParams,
      /** Layer-local mapping, merged over the chart's — how a second layer reads a different column. */
      mapping: mappingSchema.optional(),
      stat: z.enum(namesOf(standardStatDefinitions)).optional(),
      position: z.enum(POSITION_TYPES).optional(),
      /** Which y axis the layer is positioned against. Defaults to the primary one. */
      yScaleType: z.enum(Y_SCALE_TYPES).optional(),
    })
  ),
  scales: z.array(
    z.object({
      aesthetic: z.enum(SCALED_AESTHETICS),
      scaleType: z.enum(namesOf(standardScaleDefinitions)),
      /** That scale type's own options — domains, transforms, ordering, color schemes. */
      options: catalogParams,
    })
  ),
  /** Data transforms applied before the layers are compiled, in order. */
  transforms: z
    .array(
      z.object({
        transformType: z.enum(namesOf(standardTransformDefinitions)),
        options: catalogParams,
      })
    )
    .optional(),
  coord: z
    .object({
      coordType: z.enum(namesOf(standardCoordDefinitions)),
      params: catalogParams,
    })
    .optional(),
  legendPosition: z.enum(LEGEND_POSITIONS).optional(),
});
