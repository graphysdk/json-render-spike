import type { Data, SpecInput } from '@graphysdk/viz-engine';

import type { GraphyChartComponentProps } from './props-schema';

/**
 * Pairs an embedded chart's authored spec with the dataset the engine reads it against.
 *
 * The spec is handed over whole — an authored spec is a `SpecInput`, so there is nothing to
 * translate. What is left is the two things a spec does not carry: the columns, which are the rows'
 * own keys, and the arrays the compiler indexes without checking.
 *
 * React-free, so the same props rasterise server-side as they do in a page. The props are read
 * defensively: a host resolves prop expressions and hands the result over without validating against
 * the schema, so any of them can arrive absent.
 */
export function resolveEmbeddedChartInput(props: GraphyChartComponentProps): { input: SpecInput; data: Data } {
  const authored = props as Partial<GraphyChartComponentProps>;
  // The one cast: an authored node is the engine's node with its names read off the catalog, which
  // registration widens to `string`. Nothing about its shape changes on the way through.
  const spec = (authored.spec ?? {}) as Partial<SpecInput>;
  const rows = readRows(authored.rows);

  return {
    input: {
      ...spec,
      mapping: spec.mapping ?? {},
      layers: spec.layers ?? [],
      scales: spec.scales ?? [],
      transforms: spec.transforms ?? [],
      highlights: spec.highlights ?? [],
      config: spec.config ?? {},
      // An authored stylesheet arrives without the pipe tag the builders stamp; add it so the
      // sheet composes with a baked style the same as a built one.
      ...(spec.styles === undefined ? {} : { styles: { ...spec.styles, type: 'styles' as const } }),
    },
    data: { columns: collectColumns(rows), rows },
  };
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
