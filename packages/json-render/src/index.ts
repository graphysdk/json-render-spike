/**
 * `@graphysdk/json-render` — a Graphy chart as one component in a json-render catalog.
 *
 * Spread `graphyChartComponentDefinition` into a host schema's components and pair it with
 * `GraphyChartComponent` in the registry, and a model can author charts beside the host's own
 * `Card` and `Table`, with the host doing the placing.
 *
 * The chart carries no chart-type enum: it is an aesthetic mapping, a stack of geom layers, and the
 * scales those layers are positioned by, read through a coordinate system. Grouped bars are `bar`
 * with `position: 'dodge'`; a donut is `bar` under polar coords. That keeps the catalog entry small
 * enough to sit in a prompt beside every other component, and the reachable chart space large.
 *
 * Use the `/server` entry where React must not be pulled in.
 */
export { GraphyChartComponent, type GraphyChartComponentRenderProps } from './embedded/component';
export * from './server';
