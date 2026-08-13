/**
 * `@graphysdk/json-render` — a json-render schema whose spec is a set of grammar-of-graphics charts,
 * plus the React renderer that paints them.
 *
 * The spec carries no chart-type enum: a chart is an aesthetic mapping, a stack of geom layers, and
 * the scales those layers are positioned by, read through a coordinate system. Grouped bars are
 * `bar` with `position: 'dodge'`; a donut is `bar` under polar coords. That keeps the catalog small
 * and the reachable chart space large.
 *
 * Charts only: where they sit is the caller's to decide, whether that is a grid of their own or a
 * page schema whose catalog already has one.
 *
 * Use the `/server` entry where React must not be pulled in, and `/node` to rasterise a spec.
 */
export {
  type CoordDefinition,
  type GeomDefinition,
  type ScaleDefinition,
  standardCoordDefinitions,
  standardGeomDefinitions,
  standardScaleDefinitions,
  standardStatDefinitions,
  standardTransformDefinitions,
  type StatDefinition,
  type TransformDefinition,
} from './catalog';
export { GraphyChartComponent, type GraphyChartComponentRenderProps } from './chart-component';
export {
  graphyChartComponentDefinition,
  type GraphyChartComponentProps,
  graphyChartPropsSchema,
  resolveEmbeddedChartInput,
} from './embedded-chart';
export { ChartRenderer, type ChartRendererProps, Renderer, type RendererProps } from './renderer';
export { type GraphySchema, schema } from './schema';
export type {
  GraphyChart,
  GraphyCoord,
  GraphyDataset,
  GraphyDocument,
  GraphyLayer,
  GraphyScale,
  GraphySpec,
  GraphyTransform,
} from './spec.types';
export { resolveChartInput, toGraphData, toSpecInput } from './to-spec-input';
export {
  type GraphyIssue,
  type GraphyIssueCode,
  type GraphyIssueSeverity,
  type GraphyValidationResult,
  validateGraphySpec,
} from './validate';
