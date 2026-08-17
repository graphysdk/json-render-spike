# @graphysdk/json-render

A Graphy chart as one component in a [json-render](https://github.com/vercel-labs/json-render) catalog — beside shadcn's `Card` and `Table`, with the host schema doing the placing.

Use it when you own the LLM call and want charts inside your own generative-UI stack. If you'd rather call a hosted chart-authoring agent, use [`@graphysdk/agents-sdk`](../agents-sdk) instead — that's the same destination by a different road.

## Install

```bash
npm install @graphysdk/json-render @graphysdk/react
```

## Adding the chart to your catalog

Spread the catalog entry into your components map, and pair it with the component in your registry:

```ts
import { graphyChartComponentDefinition } from '@graphysdk/json-render/server';

const catalog = defineCatalog(schema, {
  components: { ...shadcnComponentDefinitions, GraphyChart: graphyChartComponentDefinition },
});
```

```tsx
import { GraphyChartComponent } from '@graphysdk/json-render';

const registry = defineRegistry({ ...shadcnComponents, GraphyChart: GraphyChartComponent });
```

The entry carries its own description — every geom, scale, coord and transform with its parameter shapes, the aesthetic channels, and the composition rules — so the model learns the grammar from your existing prompt with no extra section to write.

## The chart is a grammar, not a chart-type enum

There is no `type: 'bar'` prop. A chart is an aesthetic mapping, a stack of geom layers, and the scales those layers are positioned by, read through a coordinate system:

| To draw         | Author                                          |
| --------------- | ----------------------------------------------- |
| Grouped bars    | `geom: 'bar'`, `position: 'dodge'`              |
| Stacked bars    | `geom: 'bar'`, `position: 'stack'`              |
| 100% stacked    | `geom: 'bar'`, `position: 'fill'`               |
| Horizontal bars | `geom: 'bar'`, `coords: { coordType: 'flip' }`  |
| Pie             | `geom: 'bar'`, `coords: { coordType: 'polar' }` |
| Donut           | as pie, with `params: { innerRadius: 0.5 }`     |
| Combo           | a `bar` layer and a `line` layer on one chart   |

Five geoms and three coordinate systems reach far more chart shapes than an enum of the same size, and the entry stays small enough to sit in a prompt beside every other component.

## The props are a viz-engine spec

A chart takes two props: `rows`, the data inline, and `spec` — a viz-engine [`SpecInput`](../viz-engine), field for field:

```json
{
  "type": "GraphyChart",
  "props": {
    "rows": [{ "month": "Jan", "region": "EMEA", "revenue": 120 }],
    "spec": {
      "mapping": { "x": "month", "y": "revenue", "color": "region" },
      "layers": [{ "type": "layer", "geom": "line", "params": { "interpolate": "linear" } }],
      "scales": [
        { "type": "scale", "scaledAesthetic": "x", "scaleType": "inferred" },
        { "type": "scale", "scaledAesthetic": "y", "scaleType": "continuous", "zero": true },
        { "type": "scale", "scaledAesthetic": "color", "scaleType": "palette" }
      ],
      "config": { "content": { "title": "Revenue by month" } }
    }
  }
}
```

Nothing is translated between the two. The whole grammar is therefore reachable — geom `params`, layer-local `mapping`, `yScaleType` for a second y axis, scale options, `transforms`, `coords` — so a chart that grows past what a page usually asks for doesn't have to leave the page to grow, and a spec that outgrows the page moves to a `<GraphProvider>` unchanged.

A chart sizes to its cell, which a page layout rarely constrains vertically — hence the pixel `height` prop, defaulting to 320.

## Rendering without React

`resolveEmbeddedChartInput` pairs the authored spec with the dataset the engine reads it against, so the same props rasterise server-side as they do in a page:

```ts
import { resolveEmbeddedChartInput } from '@graphysdk/json-render/server';

const { input, data } = resolveEmbeddedChartInput(props);
const result = createCompiler().compile({ input, data });
```

The columns are the rows' own keys, and the arrays the compiler indexes without checking are filled; the spec itself is handed over whole.

A chart's grammar is the compiler's to judge: an unknown column, geom, transform or coord comes back as `{ ok: false, errors }`, each error naming the layer and the registered alternatives.

## Entry points

| Entry      | Contents                                                     |
| ---------- | ------------------------------------------------------------ |
| `.`        | The catalog entry, the props schema, and the React component |
| `./server` | The same minus React — safe in API routes and build scripts  |

## Custom geoms

`graphyChartComponentDefinition` is fixed to the five built-in geoms: its props schema reads the geom names out of the catalog once, at import, so spreading an extra entry into `standardGeomDefinitions` afterwards does not widen what a model may author.

Reaching a custom geom today means assembling your own definition from the exported pieces — `standardGeomDefinitions`, `formatCatalogParams`, `CHART_GRAMMAR_RULES` and `AESTHETIC_CHANNELS` are all public for that — and passing the matching plugin to `GraphyChartComponent` so it can paint.

## Package layout

```
src/
  grammar/    what a chart is — the catalog and the composition rules
  embedded/   the json-render integration — props schema, catalog entry, React component
```
