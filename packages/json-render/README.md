# @graphysdk/json-render

A [json-render](https://github.com/vercel-labs/json-render) schema whose spec is a set of Graphy charts, plus the React renderer that paints them.

Use it when you own the LLM call and want charts inside your own generative-UI stack. If you'd rather call a hosted chart-authoring agent, use [`@graphysdk/agents-sdk`](../agents-sdk) instead — that's the same destination by a different road.

## Install

```bash
npm install @graphysdk/json-render @json-render/core @graphysdk/react
```

## The spec is a grammar, not a chart-type enum

There is no `type: 'bar'` field. A chart is an aesthetic mapping, a stack of geom layers, and the scales those layers are positioned by, read through a coordinate system:

| To draw         | Author                                         |
| --------------- | ---------------------------------------------- |
| Grouped bars    | `geom: 'bar'`, `position: 'dodge'`             |
| Stacked bars    | `geom: 'bar'`, `position: 'stack'`             |
| 100% stacked    | `geom: 'bar'`, `position: 'fill'`              |
| Horizontal bars | `geom: 'bar'`, `coord: { coordType: 'flip' }`  |
| Pie             | `geom: 'bar'`, `coord: { coordType: 'polar' }` |
| Donut           | as pie, with `params: { innerRadius: 0.5 }`    |
| Combo           | a `bar` layer and a `line` layer on one chart  |

Five geoms and three coordinate systems reach far more chart shapes than an enum of the same size, and the catalog stays small enough to fit in a prompt.

## Generating a spec

```ts
import { defineCatalog } from '@json-render/core';
import {
  schema,
  standardCoordDefinitions,
  standardGeomDefinitions,
  standardScaleDefinitions,
  standardStatDefinitions,
  standardTransformDefinitions,
} from '@graphysdk/json-render/server';

const catalog = defineCatalog(schema, {
  geoms: standardGeomDefinitions,
  stats: standardStatDefinitions,
  scales: standardScaleDefinitions,
  coords: standardCoordDefinitions,
  transforms: standardTransformDefinitions,
});

const systemPrompt = catalog.prompt();
```

The model emits JSONL patches that build the spec incrementally, so each chart appears as its line lands:

```jsonl
{"op":"add","path":"/document","value":{"title":"Q3 review"}}
{"op":"add","path":"/datasets/sales","value":{"columns":[{"key":"month"},{"key":"revenue"}],"rows":[…]}}
{"op":"add","path":"/charts","value":[]}
{"op":"add","path":"/charts/-","value":{"id":"trend","datasetId":"sales","mapping":{"x":"month","y":"revenue"},"layers":[{"geom":"line"}],"scales":[{"aesthetic":"x","scaleType":"inferred"},{"aesthetic":"y","scaleType":"continuous","options":{"zero":true}}]}}
```

Feed the stream through `createSpecStreamCompiler` from `@json-render/core` as usual.

## Rendering

`Renderer` paints the charts and stops there. It emits one box per chart, as siblings with no container of its own, so the layout is whatever you wrap them in:

```tsx
import { Renderer } from '@graphysdk/json-render';

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
  <Renderer spec={spec} height={320} />
</div>;
```

Placing charts one at a time — in a dashboard grid you already own, or beside components that aren't charts — is `ChartRenderer`:

```tsx
<Grid>
  {spec.charts.map((chart) => (
    <Card key={chart.id} title={chart.title}>
      <ChartRenderer spec={spec} chart={chart} />
    </Card>
  ))}
</Grid>
```

A chart that fails to compile shows its error in its own box — `<GraphProvider>` already carries an error boundary, so one bad chart never blanks the rest.

## In someone else's catalog

A chart can also be one component in a page schema such as `@json-render/react`'s, beside shadcn's `Card` and `Table`. Spread the catalog entry into the components map and pair it with the component in the registry:

```ts
components: { ...shadcnComponentDefinitions, GraphyChart: graphyChartComponentDefinition }
components: { ...shadcnComponents, GraphyChart: GraphyChartComponent }
```

Same grammar, with the chart's data inline instead of behind a `datasetId` — and the host catalog's own `Grid` and `Card` doing the placing.

## Validating before you render

`validateGraphySpec` checks the invariants that produce an empty chart rather than a parse failure — a dataset that isn't defined, a mapped position aesthetic with no scale, a mapping onto a column that doesn't exist (transform-introduced columns included), a secondary-axis layer with no `ySecondary` scale. Feed the issues back into a repair turn:

```ts
const { valid, issues } = validateGraphySpec(spec);
```

## Rendering on a server

```ts
import { renderSpecToPngs } from '@graphysdk/json-render/node';

const pngs = await renderSpecToPngs(spec, { width: 800, height: 450 });
```

Requires `@graphysdk/node-renderer`, an optional peer.

## Entry points

| Entry      | Contents                                                      |
| ---------- | ------------------------------------------------------------- |
| `.`        | Schema, catalog, spec projection, validator, React `Renderer` |
| `./server` | The same minus React — safe in API routes and build scripts   |
| `./node`   | PNG rendering via `@graphysdk/node-renderer`                  |

## Custom geoms

A catalog entry plus a registered plugin is all a custom geom needs to become authorable. Add it to the catalog so it reaches the prompt, and pass the matching plugin to the renderer so it can paint:

```tsx
const catalog = defineCatalog(schema, {
  geoms: { ...standardGeomDefinitions, sankey: { props: sankeyParams, description: 'Flow between stages.' } },
  // …
});

<Renderer spec={spec} plugins={[sankeyPlugin]} />;
```
