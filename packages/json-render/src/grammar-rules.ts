/**
 * How to compose a chart out of the grammar.
 *
 * True wherever a chart is authored, so both the dashboard prompt and the embedded chart
 * component's description draw on them — a rule fixed once is fixed for every surface.
 */
export const CHART_GRAMMAR_RULES = [
  'There is no chart-type field. A chart is a mapping plus one or more geom layers, read through a coordinate system',
  'Every chart MUST declare a scale for each mapped position aesthetic (x, y, ySecondary). Position scales are never created for you and a missing one renders nothing',
  'Use scaleType "inferred" for x/y when the column type is obvious; reach for "continuous"/"discrete"/"datetime" only to set domains, transforms or ordering',
  'Map a categorical `color` and give it scaleType "palette" — that is what makes series colors match the rest of the dashboard',
  'Grouped bars are geom "bar" with position "dodge"; stacked bars are position "stack"; 100% stacked is position "fill"',
  'Horizontal bars are coord "flip" — keep the category on x and flip, never swap the x and y mappings',
  'A pie chart is geom "bar" under coord "polar"; a donut is the same with params.innerRadius between 0 and 1',
  'Combine layers on one chart to build combos — e.g. a "bar" layer plus a "line" layer sharing an x mapping',
  'Row values must be JSON — write dates as ISO strings like "2024-01-31", never as Date objects',
] as const;

/** The patch protocol and the dashboard-only paths, which only the standalone schema has. */
export const DASHBOARD_PROTOCOL_RULES = [
  'Output ONLY JSONL patches — one JSON object per line, no markdown, no code fences',
  'Add /document first, then each dataset under /datasets/<id>, then /charts as an empty array, then append each chart with {"op":"add","path":"/charts/-","value":{...}}',
  'A transform is {"transformType":"sort","options":{"variableName":"revenue","direction":"desc"}} — the transform\'s own settings go under "options", never at the top level',
  'When a dataset has one column per series, add a "reshape" transform, then map `color` to its keyName and `y` to its valueName',
  'Give every chart a stable, descriptive `id`. Charts paint in the order they are appended, so append them in reading order',
] as const;
