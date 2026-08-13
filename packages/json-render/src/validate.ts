import type { AestheticValue } from '@graphysdk/viz-engine';

import type { GraphyChart, GraphySpec } from './spec.types';

export type GraphyIssueSeverity = 'error' | 'warning';

export type GraphyIssueCode =
  | 'duplicate_chart_id'
  | 'missing_dataset'
  | 'missing_geom'
  | 'missing_position_scale'
  | 'missing_secondary_scale'
  | 'missing_transform_type'
  | 'unknown_variable'
  | 'empty_layers';

/** A single problem found in a {@link GraphySpec}, mirroring `@json-render/core`'s issue shape. */
export interface GraphyIssue {
  severity: GraphyIssueSeverity;
  message: string;
  code: GraphyIssueCode;
  /** Id of the chart the issue was found on, when it belongs to one. */
  chartId?: string;
}

export interface GraphyValidationResult {
  /** True when no `error`-severity issue was found; warnings still render. */
  valid: boolean;
  issues: GraphyIssue[];
}

/** Position aesthetics the compiler will not invent a scale for. */
const POSITION_AESTHETICS = ['x', 'y', 'ySecondary'] as const;

/**
 * Checks the invariants a Graphy spec has beyond its schema — the ones that produce an empty or
 * broken chart rather than a parse failure, so a repair loop can act on them before rendering.
 */
export function validateGraphySpec(spec: GraphySpec): GraphyValidationResult {
  const issues: GraphyIssue[] = [];
  const seenChartIds = new Set<string>();

  for (const chart of spec.charts) {
    if (seenChartIds.has(chart.id)) {
      issues.push({
        severity: 'error',
        code: 'duplicate_chart_id',
        chartId: chart.id,
        message: `Two charts share the id "${chart.id}".`,
      });
    }
    seenChartIds.add(chart.id);

    validateChart(spec, chart, issues);
  }

  return { valid: !issues.some((issue) => issue.severity === 'error'), issues };
}

/** Reads the column name out of an aesthetic value, or `undefined` for a constant mapping. */
function readMappedVariable(value: AestheticValue | undefined): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (value !== undefined && 'variable' in value) {
    return value.variable;
  }
  return undefined;
}

/**
 * Columns a chart's transforms introduce. Checked alongside the dataset's own columns so a mapping
 * onto a reshaped or aggregated column is not reported as unknown.
 */
function collectDerivedColumns(chart: GraphyChart): Set<string> {
  const derived = new Set<string>();

  for (const transform of chart.transforms ?? []) {
    const options = transform.options ?? {};
    switch (transform.transformType) {
      case 'reshape': {
        derived.add(typeof options.keyName === 'string' ? options.keyName : 'key');
        derived.add(typeof options.valueName === 'string' ? options.valueName : 'value');
        break;
      }
      case 'aggregate': {
        const operations = Array.isArray(options.operations) ? options.operations : [];
        for (const operation of operations) {
          const alias = (operation as { as?: unknown }).as;
          if (typeof alias === 'string') {
            derived.add(alias);
          }
        }
        break;
      }
      case 'constant': {
        if (typeof options.variableName === 'string') {
          derived.add(options.variableName);
        }
        break;
      }
      default:
        break;
    }
  }

  return derived;
}

function validateChart(spec: GraphySpec, chart: GraphyChart, issues: GraphyIssue[]): void {
  const dataset = spec.datasets[chart.datasetId];

  if (dataset === undefined) {
    issues.push({
      severity: 'error',
      code: 'missing_dataset',
      chartId: chart.id,
      message: `Chart "${chart.id}" references dataset "${chart.datasetId}", which the spec does not define.`,
    });
  }

  if (chart.layers.length === 0) {
    issues.push({
      severity: 'error',
      code: 'empty_layers',
      chartId: chart.id,
      message: `Chart "${chart.id}" has no layers, so it draws nothing.`,
    });
  }

  // A layer or transform whose discriminant is missing reaches the compiler as `undefined` and fails
  // there. Which names are valid depends on the registry, so only absence is checked — a plugin geom
  // is legitimate, a nameless one never is.
  for (const layer of chart.layers) {
    if (typeof layer.geom !== 'string' || layer.geom === '') {
      issues.push({
        severity: 'error',
        code: 'missing_geom',
        chartId: chart.id,
        message: `Chart "${chart.id}" has a layer with no "geom".`,
      });
    }
  }

  for (const transform of chart.transforms ?? []) {
    if (typeof transform.transformType !== 'string' || transform.transformType === '') {
      issues.push({
        severity: 'error',
        code: 'missing_transform_type',
        chartId: chart.id,
        message: `Chart "${chart.id}" has a transform with no "transformType". A transform is {"transformType":"sort","options":{…}} — the transform's own settings go under "options".`,
      });
    }
  }

  const scaledAesthetics = new Set(chart.scales.map((scale) => scale.aesthetic));
  const layerMappings = chart.layers.map((layer) => layer.mapping ?? {});
  const allMappings = [chart.mapping, ...layerMappings];

  for (const aesthetic of POSITION_AESTHETICS) {
    const isMapped = allMappings.some((mapping) => mapping[aesthetic] !== undefined);
    if (isMapped && !scaledAesthetics.has(aesthetic)) {
      issues.push({
        severity: 'error',
        code: 'missing_position_scale',
        chartId: chart.id,
        message: `Chart "${chart.id}" maps "${aesthetic}" but declares no scale for it. Position scales are never inferred — add {"aesthetic":"${aesthetic}","scaleType":"inferred"}.`,
      });
    }
  }

  const bindsSecondaryAxis = chart.layers.some((layer) => layer.yScaleType === 'secondary');
  if (bindsSecondaryAxis && !scaledAesthetics.has('ySecondary')) {
    issues.push({
      severity: 'error',
      code: 'missing_secondary_scale',
      chartId: chart.id,
      message: `Chart "${chart.id}" binds a layer to the secondary y axis but declares no "ySecondary" scale.`,
    });
  }

  if (dataset === undefined) {
    return;
  }

  const knownColumns = new Set([...dataset.columns.map((column) => column.key), ...collectDerivedColumns(chart)]);
  for (const mapping of allMappings) {
    for (const [aesthetic, value] of Object.entries(mapping)) {
      const variable = readMappedVariable(value);
      if (variable !== undefined && !knownColumns.has(variable)) {
        issues.push({
          severity: 'error',
          code: 'unknown_variable',
          chartId: chart.id,
          message: `Chart "${chart.id}" maps "${aesthetic}" to column "${variable}", which dataset "${chart.datasetId}" does not have.`,
        });
      }
    }
  }
}
