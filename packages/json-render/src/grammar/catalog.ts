import { z } from 'zod';

/**
 * One entry in the grammar: the parameters it accepts, plus the guidance a model needs to pick it.
 *
 * The zod field is named `props` because that is the key a json-render schema's `propsOf()`
 * resolves, so these definitions drop into a host catalog unchanged. On the spec side the same
 * object is `params` for geoms and coords, and `options` for scales and transforms, matching
 * viz-engine's own vocabulary. Paint — fill, border, corner rounding — is not a geom param: it
 * lives in the stylesheet, so nothing here duplicates a style knob.
 */
export interface CatalogDefinition {
  props: z.ZodType;
  description: string;
}

/** A stat is named, never parameterised — hence a description and nothing else. */
export interface StatDefinition {
  description: string;
}

/**
 * The five built-in geoms. A chart is a mapping plus a stack of these — there is no chart-type
 * enum, so "grouped bars" is `bar` with `position: 'dodge'` and a pie is `bar` under polar coords.
 */
export const standardGeomDefinitions: Record<string, CatalogDefinition> = {
  point: {
    props: z.object({}),
    description:
      'Dot marks. Scatter plots, bubble charts (map `size`), and dot plots. Needs continuous x and y for a true scatter.',
  },

  line: {
    props: z.object({
      interpolate: z.enum(['linear', 'catmull-rom']).nullable(),
      missingValues: z.enum(['gap', 'connect', 'zero']).nullable(),
    }),
    description:
      'Connected line marks. Time series and trends over an ordered x. Map `color` or `group` to draw one line per series.',
  },

  area: {
    props: z.object({
      interpolate: z.enum(['linear', 'catmull-rom']).nullable(),
      missingValues: z.enum(['gap', 'connect', 'zero']).nullable(),
    }),
    description:
      'Filled area under a line. Volume over time. Use `position: "stack"` for stacked areas, `"fill"` for a 100% band.',
  },

  bar: {
    props: z.object({
      width: z.number().nullable(),
    }),
    description:
      'Rectangular bars in cartesian coords, pie/donut wedges under polar coords. `width` is the fraction of the category band the bar fills, 0 to 1. Combine with `position` for grouped ("dodge"), stacked ("stack") or 100% ("fill") bars, and with `coord.flip` for horizontal bars.',
  },

  rule: {
    props: z.object({
      label: z.string().nullable(),
      labelPosition: z.enum(['start', 'end']).nullable(),
    }),
    description:
      'A single reference line spanning the panel. Horizontal when the layer maps `y`, vertical otherwise. Use for targets, thresholds and baselines — give the layer a one-row dataset or a `mean` stat.',
  },
};

/** Statistical transforms a layer can apply before its geom is drawn. */
export const standardStatDefinitions: Record<string, StatDefinition> = {
  identity: { description: 'No transformation — plot the data as given. The default.' },
  count: { description: 'Count observations per x value. Map only `x`; the count becomes y.' },
  sum: { description: 'Total y per x value, per series. Use when the data has repeated x values to roll up.' },
  mean: { description: 'Reduce the layer to a single observation holding the mean of y. Pairs with the `rule` geom.' },
  smooth: { description: 'Fit a regression curve through (x, y) and emit the fitted points. Pairs with `line`.' },
};

/** Coordinate systems. The same layers read very differently under each. */
export const standardCoordDefinitions: Record<string, CatalogDefinition> = {
  cartesian: {
    props: z.object({
      xLimits: z.tuple([z.number(), z.number()]).nullable(),
      yLimits: z.tuple([z.number(), z.number()]).nullable(),
    }),
    description: 'Standard x-y coordinates. The default when no coord is given.',
  },

  flip: {
    props: z.object({
      xLimits: z.tuple([z.number(), z.number()]).nullable(),
      yLimits: z.tuple([z.number(), z.number()]).nullable(),
    }),
    description:
      'Swaps the x and y axes. This is how a horizontal bar chart is made — keep the category on x and flip, rather than swapping the mapping. Best when category labels are long.',
  },

  polar: {
    props: z.object({
      theta: z.enum(['x', 'y']).nullable(),
      startAngle: z.number().nullable(),
      innerRadius: z.number().nullable(),
    }),
    description:
      'Maps position to angle and radius. A `bar` layer under polar coords is a pie chart; set `innerRadius` between 0 and 1 for a donut.',
  },
};

/** Data transforms applied before the layers are compiled. */
export const standardTransformDefinitions: Record<string, CatalogDefinition> = {
  reshape: {
    props: z.object({
      reshape: z.array(z.string()).nullable(),
      keep: z.array(z.string()).nullable(),
      keyName: z.string().nullable(),
      valueName: z.string().nullable(),
    }),
    description:
      'Pivots wide data to long. Essential when a dataset has one column per series — reshape those columns into a key/value pair, then map `color` to the key and `y` to the value.',
  },

  filter: {
    props: z.object({
      variableName: z.string(),
      operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte']),
      value: z.union([z.string(), z.number(), z.null()]),
    }),
    description: 'Keeps only the observations matching the comparison.',
  },

  sort: {
    props: z.object({
      variableName: z.string(),
      direction: z.enum(['asc', 'desc']).nullable(),
    }),
    description: 'Orders observations by a column. Use it to rank bars rather than pre-sorting the rows.',
  },

  aggregate: {
    props: z.object({
      groupby: z.array(z.string()),
      operations: z.array(
        z.object({
          op: z.enum(['count', 'sum', 'mean', 'median', 'mode', 'min', 'max']),
          variableName: z.string(),
          as: z.string(),
        })
      ),
    }),
    description: 'Groups observations and rolls up columns. Use for totals per category from row-level data.',
  },

  constant: {
    props: z.object({
      variableName: z.string(),
      type: z.enum(['numeric', 'categorical', 'temporal']),
      value: z.union([z.string(), z.number(), z.null()]),
    }),
    description: 'Adds a column holding the same value on every observation. Useful to give a `rule` layer a target.',
  },
};

/**
 * Scale types, keyed as they appear on a scale node. Every mapped position aesthetic needs one —
 * they are never auto-created, and a missing position scale yields NaN positions.
 */
export const standardScaleDefinitions: Record<string, CatalogDefinition> = {
  inferred: {
    props: z.object({}),
    description:
      'Detects continuous, discrete or datetime from the column. The safe default for `x` and `y` when the data type is obvious.',
  },

  continuous: {
    props: z.object({
      transform: z.enum(['linear', 'log', 'sqrt']).nullable(),
      reverse: z.boolean().nullable(),
      nice: z.boolean().nullable(),
      zero: z.boolean().nullable(),
      clamp: z.boolean().nullable(),
      domainMin: z.number().nullable(),
      domainMax: z.number().nullable(),
      range: z.array(z.union([z.number(), z.string()])).nullable(),
      scheme: z.string().nullable(),
      interpolate: z.enum(['rgb', 'lab', 'hcl', 'hsl']).nullable(),
      domainMid: z.number().nullable(),
      symmetric: z.boolean().nullable(),
    }),
    description:
      'Numeric scale. Set `transform: "log"` for a log axis and `"sqrt"` for a square-root one. On `color` it becomes a ramp: pass `scheme` (e.g. "viridis", "RdBu"), or `domainMid` with `symmetric` for a diverging ramp.',
  },

  discrete: {
    props: z.object({
      domain: z.array(z.union([z.string(), z.number()])).nullable(),
      range: z.array(z.union([z.string(), z.number()])).nullable(),
      padding: z.number().nullable(),
      reverse: z.boolean().nullable(),
    }),
    description:
      'Categorical scale. `domain` fixes the category order; `range` gives explicit visual values (colors, sizes, dash patterns).',
  },

  datetime: {
    props: z.object({
      domainMin: z.number().nullable(),
      domainMax: z.number().nullable(),
      nice: z.boolean().nullable(),
      reverse: z.boolean().nullable(),
      clamp: z.boolean().nullable(),
    }),
    description: 'Temporal scale. `domainMin` / `domainMax` are epoch milliseconds.',
  },

  palette: {
    props: z.object({
      palette: z
        .object({
          type: z.enum(['graphy', 'pastel', 'neon', 'mono']),
          variant: z.string().nullable(),
        })
        .nullable(),
    }),
    description: 'Color scale drawn from a named Graphy palette. The usual choice for a categorical `color` mapping.',
  },

  identity: {
    props: z.object({}),
    description:
      'Passes data values straight through as visual values — a `size` column already in pixels, a `color` column already holding CSS colors.',
  },
};
