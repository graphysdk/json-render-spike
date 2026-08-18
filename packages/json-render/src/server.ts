/**
 * Server-safe entry point.
 *
 * The grammar and the catalog entry — no React, no renderer. Import this from API routes, server
 * components and build scripts that compose a catalog or pair a chart's spec with its data but never
 * paint one.
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
export { formatCatalogParams } from './grammar/format-params';
export { AESTHETIC_CHANNELS, CHART_GRAMMAR_RULES } from './grammar/rules';
export { type ChartStyle } from './styles/chart-style.types';
export {
  applyChartStyle,
  CHART_STYLE_NAMES,
  type ChartStyleName,
  chartStyles,
  readChartStyleName,
  type StyledChart,
} from './styles/chart-styles';
