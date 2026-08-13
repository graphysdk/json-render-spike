import type { AesMapping, DataValue, PositionType, YScaleType } from '@graphysdk/viz-engine';

/**
 * A tabular dataset one or more charts draw from. Mirrors viz-engine's `Data`, restricted to
 * JSON-expressible values — a model emits `"2024-01-01"`, not a `Date`, and the engine's parser
 * infers the temporal type from the column.
 */
export interface GraphyDataset {
  columns: Array<{ key: string; label?: string }>;
  rows: Array<Record<string, DataValue>>;
}

/**
 * One geometry layer. `geom` names a catalog entry and `params` are that geom's own parameters —
 * the pairing json-render's `ref`/`propsOf` types, and the same pairing viz-engine's `LayerInput`
 * uses. A geom outside the built-in five resolves through the geom registry, so a catalog entry
 * plus a matching plugin is all a custom geom needs to become authorable.
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

/** A single chart: a mapping, its layers, and the scales those layers are positioned by. */
export interface GraphyChart {
  id: string;
  /** Key into {@link GraphySpec.datasets}. */
  datasetId: string;
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

export interface GraphyDocument {
  title?: string;
  subtitle?: string;
  colorScheme?: 'light' | 'dark';
}

/**
 * The spec an LLM authors: a document, the datasets behind it, and the charts drawn from them.
 * Serialisable end to end — {@link toSpecInput} projects each chart onto a viz-engine `SpecInput`.
 *
 * Charts carry no placement. Where they sit on a page is the host's grammar, not this one's, and a
 * host that has an element tree already says it better than a chart spec could.
 */
export interface GraphySpec {
  document: GraphyDocument;
  datasets: Record<string, GraphyDataset>;
  charts: GraphyChart[];
}
