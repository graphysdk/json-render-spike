import type { AesMapping, PositionType, YScaleType } from '@graphysdk/viz-engine';

/**
 * One geometry layer. `geom` names a catalog entry and `params` are that geom's own parameters —
 * the pairing a json-render schema's `ref`/`propsOf` types, and the same pairing viz-engine's
 * `LayerInput` uses. A geom outside the built-in five resolves through the geom registry, so a
 * catalog entry plus a matching plugin is all a custom geom needs to become authorable.
 */
export interface GraphyLayer {
  geom: string;
  params?: Record<string, unknown>;
  /** Layer-local mapping, merged over the chart's mapping. */
  mapping?: AesMapping;
  stat?: string;
  position?: PositionType;
  /** Binds the layer to the primary or secondary y axis. */
  yScaleType?: YScaleType;
  id?: string;
}

/**
 * A scale declaration. `options` stay nested here so `propsOf` can type them per scale type;
 * {@link toSpecInput} flattens them onto the engine's scale node.
 */
export interface GraphyScale {
  /** The aesthetic this scale governs — `'x'`, `'y'`, `'ySecondary'`, `'color'`, … */
  aesthetic: string;
  scaleType: string;
  options?: Record<string, unknown>;
}

export interface GraphyTransform {
  transformType: string;
  options?: Record<string, unknown>;
}

export interface GraphyCoord {
  coordType: string;
  params?: Record<string, unknown>;
}

/**
 * A single chart: a mapping, its layers, and the scales those layers are positioned by.
 *
 * The authored shape, one step before viz-engine's — {@link toSpecInput} projects it onto a
 * `SpecInput`. Carries no data and no placement: a host supplies the rows, and where the chart
 * sits on a page is the host's grammar rather than this one's.
 */
export interface GraphyChart {
  title?: string;
  subtitle?: string;
  caption?: string;
  /** Global aesthetic mapping — data columns to visual channels. */
  mapping: AesMapping;
  layers: GraphyLayer[];
  /** One entry per mapped position aesthetic; position scales are never inferred for you. */
  scales: GraphyScale[];
  transforms?: GraphyTransform[];
  coord?: GraphyCoord;
  legendPosition?: 'auto' | 'top' | 'right' | 'bottom' | 'left' | 'none';
}
