# @graphyapp/json-render-studio

A codegen playground for [json-render](https://github.com/vercel-labs/json-render): type a prompt, watch a spec stream in as JSONL patches, see it rendered live.

Not a chart tool. The studio generates **whatever a json-render schema can describe** — today a React page, tomorrow whatever renderer is added next. Graphy charts are one component in the page catalog, alongside shadcn's.

```bash
cp .env.example .env   # ANTHROPIC_API_KEY, or inherit apps/agents-api/.env
pnpm dev               # API on :4320, web on :5190
```

## What it generates

A React page: `@json-render/react`'s element-tree schema, filled with shadcn's 36 components plus `GraphyChart`, painted by `<JSONUIProvider>` + `<Renderer>`.

The catalog is the whole configuration. `shared/component-catalog.ts` defines it once and both processes read it — the server turns it into the system prompt, the browser types the registry that paints what comes back — so they cannot drift. Nothing between the two knows what a spec means: `use-generation.ts` assembles JSONL patches into JSON, and only `page-spec.ts` and `PagePreview.tsx` narrow that JSON to an element tree.

### Charts as a component, not a document type

`GraphyChart` sits in the same map as `Card` and `Table`. Its catalog entry and its React implementation both ship from `@graphysdk/json-render`, so the studio composes catalogs rather than describing charts:

```ts
// shared/component-catalog.ts
components: { ...shadcnComponentDefinitions, GraphyChart: graphyChartComponentDefinition }

// web/src/PagePreview.tsx
components: { ...shadcnComponents, GraphyChart: GraphyChartComponent }
```

The chart is still a grammar of graphics — `mapping` + `layers` + `scales` + `transforms` + `coord`, no chart-type field — just with its data inline as `rows`. There is no reduced "chart in a page" dialect: geom `params`, layer-local mappings, scale `options` and a secondary y axis are all reachable from a component prop, so a chart never has to leave the page to grow.

## What the panels are for

- **Spec** — the JSON as it stands. This is the artifact; everything else is scaffolding.
- **Stream** — the raw JSONL. Where you look when the spec has a hole in it.
- **System prompt** — what the catalog produced. Editing a component description and reloading this tab is the tuning loop.
- **Issues** — invariants a spec can break while still parsing, checked with json-render's own `validateSpec`.

The status line reports patches applied and, when it happens, **lines dropped** — see below.

## What bites

Each of these produced a page that looked broken while the spec looked fine, so each is worth knowing before you read a bad preview as a bad model.

**Models pretty-print.** The protocol is one JSON object per line and `createSpecStreamCompiler` skips whatever does not parse, so a value wrapped across lines loses its whole patch — silently, leaving a parent pointing at a child that never arrived. `read-patch-lines.ts` rejoins those fragments, and anything still unrecoverable is counted and shown rather than swallowed.

**State arrives after the elements that read it.** `JSONUIProvider` reads `initialState` once at mount, but a model interleaves `/state` and `/elements` patches — so a provider mounted on the first flush seeds from an empty state and every `$state`-bound table and chart renders blank. The preview remounts once the stream settles.

**A vertical `Stack` hugs its children.** shadcn's `Stack` renders `items-start` unless given `align: "stretch"`, and a page root is almost always a vertical Stack — so the Grid inside it stops filling the page, and every card and chart shrinks to the width of its own text. Its shipped example omits `align`, which is exactly what a model copies, so `shared/component-catalog.ts` replaces that example and says so in the description. The renderer stays shadcn's: the spec has to mean the same thing here as in the app it lands in.

**A `$state` reference belongs where the whole value goes.** `rows: [{"$state": "/data/sales"}]` reads naturally against a prop typed `Array<Row>`, but expressions resolve in place — so the rows arrive nested one level deep, every column reads as absent, and the chart fails on a mapping that was never wrong. A prompt rule asks for `rows: {"$state": "/data/sales"}`; `@graphysdk/json-render` unwraps the nested form anyway.
