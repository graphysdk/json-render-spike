# @graphyapp/json-render-studio

A codegen playground for [json-render](https://github.com/vercel-labs/json-render): type a prompt, watch a spec stream in as JSONL patches, see it rendered live.

Not a chart tool. The studio generates **whatever a json-render schema can describe** — today a React page, tomorrow whatever renderer is added next. Graphy charts are one component in the page catalog, alongside shadcn's.

```bash
cp .env.example .env   # ANTHROPIC_API_KEY, or inherit apps/agents-api/.env
pnpm dev               # API on :4320, web on :5190
```

With no `ANTHROPIC_API_KEY` set, generation runs through your Claude subscription instead: the
server drives your local Claude Code with the same system prompt, no tools and a single turn, and
streams the text back unchanged. The header says which of the two a generation will use.

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

A chart takes two props: `rows`, its data inline, and `spec` — a viz-engine `SpecInput`, field for field. There is no reduced "chart in a page" dialect and nothing translated in between, so geom `params`, layer-local mappings, scale options, transforms and a secondary y axis are all reachable, and a chart never has to leave the page to grow.

## Preview and code

The main surface has two tabs. **Preview** runs the spec through `<Renderer>`. **Code** resolves it instead, into a standalone React page with no json-render left in it — `$state` paths become member access, `visible` becomes a guard, `repeat` becomes a `.map()`, the built-in state actions become the updates they perform, and the state model becomes a `useState` (or, on a page that only reads, a plain `const`).

json-render's [code export](https://json-render.dev/docs/code-export) is deliberately half a feature: `@json-render/codegen` ships traversal and serialisation, and leaves the generator to the project, because what the emitted components look like is the project's business. This is that half. It also has to resolve expressions, which the shipped `serializeProps` does not — that one prints `{ $state: "/data/sales" }` straight back out, since its target components take the path and resolve it themselves. Code that has left the runtime behind has no resolver, so a path has to become the access it stands for.

The emitted page assumes shadcn's components under `@/components/ui`, taking the catalog's prop names, and turns an `on: { press }` binding into `onPress`. `GraphyChart` is the one element that does not become the component named on it: outside a registry that component is a dependency the page has no reason to carry, and its props already are a viz-engine spec — so a chart lands as the `<GraphProvider>` + `<GraphRenderer>` a hand-written page would use, its spec hoisted to a `const` above the markup wherever nothing in it changes per render.

A spec reaches further than plain React does. Form validation, state watchers, confirmation dialogs, `onSuccess`/`onError` and custom `$computed` functions have no standalone equivalent, so they are listed in a comment at the head of the file and counted beside the tab rather than dropped — a page that quietly does less than its spec is the one failure this panel cannot help you see.

## What the panels are for

The sidebar keeps the four that answer "why does it look like that":

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
