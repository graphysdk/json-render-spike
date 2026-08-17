import type { AesMapping, Data, PositionType, SpecInput, YScaleType } from '@graphysdk/viz-engine';

import type { GraphyChart } from '../grammar/chart.types';
import { toSpecInput } from '../grammar/to-spec-input';

import type { GraphyChartComponentProps } from './props-schema';

/**
 * Projects embedded chart props onto a viz-engine spec and its data.
 *
 * React-free, so the same props rasterise server-side as they do in a page.
 *
 * The required props are still read defensively: a host resolves prop expressions and hands the
 * result over without validating against the schema, so any of them can arrive absent.
 */
export function resolveEmbeddedChartInput(props: GraphyChartComponentProps): { input: SpecInput; data: Data } {
  const authored = props as Partial<GraphyChartComponentProps>;
  const rows = readRows(authored.rows);

  const chart: GraphyChart = {
    title: authored.title,
    subtitle: authored.subtitle,
    caption: authored.caption,
    mapping: (authored.mapping ?? {}) as AesMapping,
    layers: (authored.layers ?? []).map((layer) => ({
      geom: layer.geom,
      params: layer.params,
      mapping: layer.mapping as AesMapping | undefined,
      stat: layer.stat,
      position: layer.position as PositionType | undefined,
      yScaleType: layer.yScaleType as YScaleType | undefined,
    })),
    scales: authored.scales ?? [],
    transforms: authored.transforms,
    coord: authored.coord,
    legendPosition: authored.legendPosition,
  };

  return { input: toSpecInput(chart), data: { columns: collectColumns(rows), rows } };
}

/**
 * The rows a host really handed over.
 *
 * A host resolves a prop expression in place, so `rows: [{"$state": "/data/sales"}]` — a reference
 * written where the type says an array goes — arrives as the rows nested one level deep. Every
 * column then reads as absent and the chart fails on a mapping that was never wrong, so unwrap it.
 */
function readRows(rows: Data['rows'] | undefined): Data['rows'] {
  if (rows === undefined) {
    return [];
  }
  const entries: unknown[] = rows;
  return entries.every((entry) => Array.isArray(entry)) ? (entries.flat() as Data['rows']) : rows;
}

/** Union of the keys across rows — a model may omit a null-valued column on some of them. */
function collectColumns(rows: Data['rows']): Data['columns'] {
  const keys = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      keys.add(key);
    }
  }
  return [...keys].map((key) => ({ key }));
}
