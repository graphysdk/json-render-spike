/**
 * Server-safe entry point.
 *
 * The grammar, the catalog entry and the spec projection — no React, no renderer. Import this from
 * API routes, server components and build scripts that compose a catalog or resolve a chart to a
 * viz-engine spec but never paint one.
 */
export { graphyChartComponentDefinition } from './embedded/definition';
export { type GraphyChartComponentProps, graphyChartPropsSchema } from './embedded/props-schema';
export { resolveEmbeddedChartInput } from './embedded/resolve-input';
export { type CatalogDefinition, type StatDefinition } from './grammar/catalog';
export {
  standardCoordDefinitions,
  standardGeomDefinitions,
  standardScaleDefinitions,
  standardStatDefinitions,
  standardTransformDefinitions,
} from './grammar/catalog';
export type { GraphyChart, GraphyCoord, GraphyLayer, GraphyScale, GraphyTransform } from './grammar/chart.types';
export { formatCatalogParams } from './grammar/format-params';
export { AESTHETIC_CHANNELS, CHART_GRAMMAR_RULES } from './grammar/rules';
export { toSpecInput } from './grammar/to-spec-input';
