# json-render × Graphy

A [json-render](https://json-render.dev) catalog component backed by the Graphy SDK, plus a studio app for trying it.

- `packages/json-render` — `@graphysdk/json-render`: a `GraphyChart` catalog component whose props are a viz-engine spec, with six baked-in chart styles.
- `apps/json-render-studio` — a Next.js playground: prompt → model → json-render patches → Graphy charts, streamed live.

## Setup

The `@graphysdk/*` dependencies live in a private npm registry, so log in first:

```bash
npm login
pnpm install
```

## Develop

```bash
pnpm dev          # studio on http://localhost:5190
pnpm test
pnpm typecheck
pnpm lint
```

Generation uses `ANTHROPIC_API_KEY` from `apps/json-render-studio/.env` when set, and otherwise falls back to your local Claude Code subscription.
