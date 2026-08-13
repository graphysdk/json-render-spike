/**
 * Server-safe entry point.
 *
 * Schema, catalog and spec projection only — no React, no renderer. Import this from API routes,
 * server components and build scripts that generate or validate a spec but never paint one.
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
export {
  graphyChartComponentDefinition,
  type GraphyChartComponentProps,
  graphyChartPropsSchema,
  resolveEmbeddedChartInput,
} from './embedded-chart';
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
