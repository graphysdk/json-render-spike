import { defineSchema, type PromptContext } from '@json-render/core';
import type { z } from 'zod';

import { CHART_GRAMMAR_RULES, DASHBOARD_PROTOCOL_RULES } from './grammar-rules';

/** Type of the Graphy json-render schema. */
export type GraphySchema = typeof schema;

interface CatalogEntry {
  props?: z.ZodType;
  description?: string;
}

interface GraphyCatalogData {
  geoms?: Record<string, CatalogEntry>;
  stats?: Record<string, CatalogEntry>;
  scales?: Record<string, CatalogEntry>;
  coords?: Record<string, CatalogEntry>;
  transforms?: Record<string, CatalogEntry>;
}

/**
 * The schema for `@graphysdk/json-render`.
 *
 * The spec is a set of grammar-of-graphics charts rather than an element tree: a document, the
 * datasets behind it, and the charts drawn from them. Each chart mirrors viz-engine's
 * `SpecInput` closely enough that {@link toSpecInput} is a projection rather than a second grammar —
 * `geom`/`params`, `scaleType`/`options` and `coordType`/`params` are the discriminant-and-payload
 * pairings `builder.ref()` and `builder.propsOf()` are built for.
 */
export const schema = defineSchema(
  (builder) => ({
    spec: builder.object({
      /** Document-level presentation. */
      document: builder.object({
        title: builder.string(),
        subtitle: builder.string(),
        /** 'light' | 'dark' */
        colorScheme: builder.string(),
      }),

      /** Datasets keyed by id; charts reference one by `datasetId`. */
      datasets: builder.record(
        builder.object({
          columns: builder.array(builder.object({ key: builder.string(), label: builder.string() })),
          rows: builder.array(builder.record(builder.any())),
        })
      ),

      charts: builder.array(
        builder.object({
          id: builder.string(),
          datasetId: builder.string(),
          title: builder.string(),
          subtitle: builder.string(),
          caption: builder.string(),
          /** Aesthetic channel to column name, or {"value": constant}. */
          mapping: builder.record(builder.any()),

          layers: builder.array(
            builder.object({
              id: builder.string(),
              geom: builder.ref('catalog.geoms'),
              params: builder.propsOf('catalog.geoms'),
              /** Layer-local mapping, merged over the chart's. */
              mapping: builder.record(builder.any()),
              stat: builder.ref('catalog.stats'),
              /** 'stack' | 'dodge' | 'fill' | 'identity' */
              position: builder.string(),
              /** 'primary' | 'secondary' */
              yScaleType: builder.string(),
            })
          ),

          scales: builder.array(
            builder.object({
              /** 'x' | 'y' | 'ySecondary' | 'color' | 'size' | 'alpha' | 'strokeWidth' | 'lineType' */
              aesthetic: builder.string(),
              scaleType: builder.ref('catalog.scales'),
              options: builder.propsOf('catalog.scales'),
            })
          ),

          transforms: builder.array(
            builder.object({
              transformType: builder.ref('catalog.transforms'),
              options: builder.propsOf('catalog.transforms'),
            })
          ),

          coord: builder.object({
            coordType: builder.ref('catalog.coords'),
            params: builder.propsOf('catalog.coords'),
          }),

          /** 'auto' | 'top' | 'right' | 'bottom' | 'left' | 'none' */
          legendPosition: builder.string(),
        })
      ),
    }),

    catalog: builder.object({
      /** Geometry marks. Add an entry here and register a matching plugin to expose a custom geom. */
      geoms: builder.map({ props: builder.zod(), description: builder.string() }),
      stats: builder.map({ description: builder.string() }),
      scales: builder.map({ props: builder.zod(), description: builder.string() }),
      coords: builder.map({ props: builder.zod(), description: builder.string() }),
      transforms: builder.map({ props: builder.zod(), description: builder.string() }),
    }),
  }),
  {
    promptTemplate: buildGraphyPrompt,
  }
);

const EXAMPLE_OUTPUT = [
  '{"op":"add","path":"/document","value":{"title":"Q3 revenue review","colorScheme":"light"}}',
  '{"op":"add","path":"/datasets/sales","value":{"columns":[{"key":"month"},{"key":"region"},{"key":"revenue"}],"rows":[{"month":"Jan","region":"EMEA","revenue":120}]}}',
  '{"op":"add","path":"/charts","value":[]}',
  '{"op":"add","path":"/charts/-","value":{"id":"revenue-trend","datasetId":"sales","title":"Revenue by month","mapping":{"x":"month","y":"revenue","color":"region"},"layers":[{"geom":"line","params":{"interpolate":"linear"}}],"scales":[{"aesthetic":"x","scaleType":"inferred"},{"aesthetic":"y","scaleType":"continuous","options":{"zero":true,"nice":true}},{"aesthetic":"color","scaleType":"palette"}]}}',
  '{"op":"add","path":"/charts/-","value":{"id":"region-share","datasetId":"sales","title":"Share by region","mapping":{"x":"region","y":"revenue","color":"region"},"layers":[{"geom":"bar","params":{"width":1}}],"scales":[{"aesthetic":"x","scaleType":"discrete"},{"aesthetic":"y","scaleType":"continuous"},{"aesthetic":"color","scaleType":"palette"}],"coord":{"coordType":"polar","params":{"theta":"y","innerRadius":0.5}}}}',
  '{"op":"add","path":"/charts/-","value":{"id":"region-ranking","datasetId":"sales","title":"Regions by revenue","mapping":{"x":"region","y":"revenue"},"layers":[{"geom":"bar"}],"transforms":[{"transformType":"sort","options":{"variableName":"revenue","direction":"desc"}}],"scales":[{"aesthetic":"x","scaleType":"discrete"},{"aesthetic":"y","scaleType":"continuous"}],"coord":{"coordType":"flip"}}}',
].join('\n');

const GRAMMAR_RULES = [...DASHBOARD_PROTOCOL_RULES, ...CHART_GRAMMAR_RULES];

/**
 * Renders the system prompt: the JSONL patch protocol, the catalog the model may draw on, and the
 * grammar rules that keep a generated spec compilable.
 */
function buildGraphyPrompt(context: PromptContext): string {
  const { catalog, options, formatZodType } = context;
  const { system = 'You are a data visualization author working in a grammar of graphics.', customRules = [] } =
    options;
  const catalogData = catalog as GraphyCatalogData;

  const lines: string[] = [system, ''];

  lines.push('OUTPUT FORMAT:');
  lines.push('Output JSONL (one JSON object per line) with patches that build a dashboard spec incrementally.');
  lines.push('');
  lines.push('Example output (each line is a separate JSON object):');
  lines.push('');
  lines.push(EXAMPLE_OUTPUT);
  lines.push('');

  appendCatalogSection(lines, 'GEOMS', catalogData.geoms, formatZodType);
  appendCatalogSection(lines, 'STATS', catalogData.stats, formatZodType);
  appendCatalogSection(lines, 'SCALE TYPES', catalogData.scales, formatZodType);
  appendCatalogSection(lines, 'COORDINATE SYSTEMS', catalogData.coords, formatZodType);
  appendCatalogSection(lines, 'TRANSFORMS', catalogData.transforms, formatZodType);

  lines.push('AESTHETIC CHANNELS:');
  lines.push('Map a data column to a channel with its name ("revenue"), or a constant with {"value": 10}.');
  lines.push('- x, y — position. ySecondary is an independent second y axis; bind a layer to it with yScaleType');
  lines.push('- color — series color. size — mark area. alpha — opacity. strokeWidth — line thickness');
  lines.push('- lineType — dash pattern (solid, dashed, dotted). Categorical only');
  lines.push('- group — splits geoms into separate lines/areas without spending a visual channel');
  lines.push('- label — the text a data label shows');
  lines.push('');

  lines.push('RULES:');
  [...GRAMMAR_RULES, ...customRules].forEach((rule, index) => {
    lines.push(`${index + 1}. ${rule}`);
  });

  return lines.join('\n');
}

function appendCatalogSection(
  lines: string[],
  heading: string,
  entries: Record<string, CatalogEntry> | undefined,
  formatZodType: PromptContext['formatZodType']
): void {
  if (!entries || Object.keys(entries).length === 0) {
    return;
  }

  lines.push(`AVAILABLE ${heading} (${Object.keys(entries).length}):`);
  lines.push('');
  for (const [name, entry] of Object.entries(entries)) {
    const shape = entry.props ? ` ${formatZodType(entry.props)}` : '';
    lines.push(`- ${name}:${shape} ${entry.description ?? 'No description'}`);
  }
  lines.push('');
}
