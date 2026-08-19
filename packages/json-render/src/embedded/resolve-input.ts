import type { AnnotationsInput, Data, RichTextContent, SpecInput } from '@graphysdk/viz-engine';

import type { GraphyChartComponentProps } from './props-schema';

type AuthoredAnnotations = NonNullable<GraphyChartComponentProps['spec']['annotations']>;

/**
 * Pairs an embedded chart's authored spec with the dataset the engine reads it against.
 *
 * The spec is handed over nearly whole — an authored spec is a `SpecInput`, so there is almost
 * nothing to translate. The exceptions: the columns, which are the rows' own keys; the arrays the
 * compiler indexes without checking; the stylesheet's pipe tag; and a comment's plain `text`,
 * which becomes the rich-text content the engine reads.
 *
 * React-free, so the same props rasterise server-side as they do in a page. The props are read
 * defensively: a host resolves prop expressions and hands the result over without validating against
 * the schema, so any of them can arrive absent.
 */
export function resolveEmbeddedChartInput(props: GraphyChartComponentProps): { input: SpecInput; data: Data } {
  const authored = props as Partial<GraphyChartComponentProps>;
  const { annotations, ...authoredSpec } = authored.spec ?? {};
  // The one cast: an authored node is the engine's node with its names read off the catalog, which
  // registration widens to `string`. Nothing about its shape changes on the way through.
  const spec = authoredSpec as Partial<SpecInput>;
  const rows = readRows(authored.rows);

  return {
    input: {
      ...spec,
      mapping: spec.mapping ?? {},
      layers: spec.layers ?? [],
      scales: spec.scales ?? [],
      // A transform node lands one patch before its options while streaming (and stays bare when
      // that patch was dropped); the compiler faults on it, so an optionless node is not there yet.
      transforms: (spec.transforms ?? []).filter((transform) => transform.options !== undefined),
      highlights: spec.highlights ?? [],
      config: resolveConfig(spec),
      // An authored stylesheet arrives without the pipe tag the builders stamp; add it so the
      // sheet composes with a baked style the same as a built one.
      ...(spec.styles === undefined ? {} : { styles: { ...spec.styles, type: 'styles' as const } }),
      ...(annotations === undefined ? {} : { annotations: resolveAnnotations(annotations) }),
    },
    data: { columns: collectColumns(rows), rows },
  };
}

/**
 * The engine mirrors the primary y axis's grid config onto `ySecondary`, and the two scales tick
 * independently — so one visible grid becomes two interleaved ones. A chart with a secondary
 * y axis therefore draws no gridlines at all.
 */
function resolveConfig(spec: Partial<SpecInput>): NonNullable<SpecInput['config']> {
  const config = spec.config ?? {};
  const usesSecondaryAxis =
    (spec.layers ?? []).some((layer) => layer.yScaleType === 'secondary') ||
    (spec.scales ?? []).some((scale) => scale.scaledAesthetic === 'ySecondary');
  if (!usesSecondaryAxis) {
    return config;
  }

  const axes = config.axes ?? {};
  return {
    ...config,
    axes: {
      ...axes,
      x: { ...axes.x, grid: { ...axes.x?.grid, isVisible: false } },
      y: { ...axes.y, grid: { ...axes.y?.grid, isVisible: false } },
      ySecondary: { ...axes.ySecondary, grid: { ...axes.ySecondary?.grid, isVisible: false } },
    },
  };
}

/** A comment's plain `text` becomes the rich-text content the engine reads. */
function resolveAnnotations(annotations: AuthoredAnnotations): AnnotationsInput {
  const notes = annotations.comments;
  if (notes === undefined) return {};
  return {
    comments: notes.map((note) => ({ at: note.at, content: createTextContent(note.text) })),
  };
}

function createTextContent(text: string): RichTextContent {
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
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
