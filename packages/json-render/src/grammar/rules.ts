/**
 * How to compose a chart out of the grammar.
 *
 * True wherever a chart is authored, so a host catalog's component description draws on these
 * rather than restating them — a rule fixed once is fixed for every surface that teaches it.
 */
export const CHART_GRAMMAR_RULES = [
  'There is no chart-type field. A chart is `rows` — the data, inline — and `spec`: a mapping plus one or more geom layers, read through a coordinate system',
  'Every node inside `spec` carries its own `type` tag: {"type":"layer","geom":…}, {"type":"scale","scaledAesthetic":…}, {"type":"transform","transformType":…}, {"type":"coord","coordType":…}',
  'The chart\'s text, legend and axes live in `spec.config` — {"content":{"title":…,"subtitle":…,"caption":…},"legend":{"position":"top"},"axes":{"y":{"label":"Revenue, €","grid":{"isVisible":false}}}}. An axis `label` names units the tick labels alone don\'t carry',
  'Every chart MUST declare a scale for each mapped position aesthetic (x, y, ySecondary). Position scales are never created for you and a missing one renders nothing',
  'Use scaleType "inferred" for x/y when the column type is obvious; reach for "continuous"/"discrete"/"datetime" only to set transforms or ordering',
  'Never set `domain`, `domainMin` or `domainMax` to make an axis work — domains and ticks are computed from the mapped data automatically. Fix a domain only when asked to clip, extend or reorder an axis',
  'Map a categorical `color` and give it scaleType "palette" — that is what draws series colors from the shared palette',
  'Grouped bars are geom "bar" with position "dodge"; stacked bars are position "stack"; 100% stacked is position "fill"',
  'Horizontal bars are coord "flip" — keep the category on x and flip, never swap the x and y mappings',
  'A pie chart is geom "bar" under coord "polar"; a donut is the same with params.innerRadius between 0 and 1',
  'A radar chart is geom "line" or "area" under coord "polar" with params.theta "x"; a rose (coxcomb) is geom "bar" with position "identity" and params.width 1 under the same coord',
  'A trendline is an extra "line" layer with stat "smooth"; an average line is a "rule" layer with stat "mean"; a fixed target line is a "rule" layer fed by a "constant" transform',
  'Combine layers on one chart to build combos — e.g. a "bar" layer plus a "line" layer sharing an x mapping',
  'A measure on its own axis is a layer with yScaleType "secondary", a layer-local `mapping` naming its column, and a scale for scaledAesthetic "ySecondary". Two y scales tick independently, so a dual-axis chart draws no gridlines — never turn them on there',
  'A geom\'s and a coord\'s own settings go under `params`, a transform\'s under `options` — a sort is {"type":"transform","transformType":"sort","options":{"variableName":"revenue","direction":"desc"}}',
  'A scale\'s options are the exception: they sit FLAT on the scale node, never nested — {"type":"scale","scaledAesthetic":"y","scaleType":"continuous","zero":true,"nice":true}',
  'When the data has one column per series, add a "reshape" transform, then map `color` to its keyName and `y` to its valueName',
  'Money and percentages come from `config.numberFormat` — {"prefix":"$","decimals":1,"abbreviation":"auto"} or {"suffix":"%"} — never baked into the rows',
  'A KPI or summary number over the chart is `config.headline` — {"show":"total","compareWith":"previous"}; position "center" sits it in a donut\'s hole',
  'Row values must be JSON — write dates as ISO strings like "2024-01-31", never as Date objects',
] as const;

/**
 * The visual channels a mapping can bind, and what each one is for.
 *
 * Read alongside {@link CHART_GRAMMAR_RULES}: these name the vocabulary, those say how to compose it.
 */
export const AESTHETIC_CHANNELS = [
  'x, y — position. ySecondary is an independent second y axis; bind a layer to it with yScaleType',
  'color — series color. size — mark area. alpha — opacity. strokeWidth — line thickness',
  'lineType — dash pattern (solid, dashed, dotted). Categorical only',
  'group — splits geoms into separate lines/areas without spending a visual channel',
  'label — the text a data label shows',
  'Bind a channel to a data column with its name ("revenue"), or to a constant with {"value": 10}',
] as const;
