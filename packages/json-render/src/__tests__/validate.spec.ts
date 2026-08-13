import { describe, expect, it } from 'vitest';

import type { GraphySpec } from '../spec.types';
import { validateGraphySpec } from '../validate';

import { createDashboardSpec } from './fixtures';

function readCodes(spec: GraphySpec): string[] {
  return validateGraphySpec(spec).issues.map((issue) => issue.code);
}

describe('validateGraphySpec', () => {
  it('passes a well-formed dashboard', () => {
    const result = validateGraphySpec(createDashboardSpec());

    expect(result.issues).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('flags a chart whose dataset the spec does not define', () => {
    const spec = createDashboardSpec();
    spec.charts[0]!.datasetId = 'nope';

    expect(readCodes(spec)).toContain('missing_dataset');
    expect(validateGraphySpec(spec).valid).toBe(false);
  });

  it('flags a mapped position aesthetic with no scale', () => {
    const spec = createDashboardSpec();
    spec.charts[0]!.scales = spec.charts[0]!.scales.filter((scale) => scale.aesthetic !== 'y');

    expect(readCodes(spec)).toContain('missing_position_scale');
  });

  it('flags a layer bound to the secondary axis with no ySecondary scale', () => {
    const spec = createDashboardSpec();
    spec.charts[0]!.layers[0]!.yScaleType = 'secondary';

    expect(readCodes(spec)).toContain('missing_secondary_scale');
  });

  it('flags a mapping onto a column the dataset does not have', () => {
    const spec = createDashboardSpec();
    spec.charts[0]!.mapping.y = 'profit';

    expect(readCodes(spec)).toContain('unknown_variable');
  });

  it('accepts a mapping onto a column a transform introduces', () => {
    // The combo chart maps `metric` and `amount`, which only exist after its reshape runs.
    const result = validateGraphySpec(createDashboardSpec());

    expect(result.issues.filter((issue) => issue.code === 'unknown_variable')).toEqual([]);
  });

  it('flags duplicate chart ids', () => {
    const spec = createDashboardSpec();
    spec.charts[1]!.id = 'revenue-trend';

    expect(readCodes(spec)).toContain('duplicate_chart_id');
  });

  it('flags a transform written without its envelope', () => {
    const spec = createDashboardSpec();
    // What a model reaches for when it knows viz-engine's own transform shape: the settings at the
    // top level and no `transformType`. It reaches the compiler as "unknown transform: undefined".
    spec.charts[0]!.transforms = [{ variableName: 'revenue', direction: 'desc' } as never];

    expect(readCodes(spec)).toContain('missing_transform_type');
    expect(validateGraphySpec(spec).valid).toBe(false);
  });

  it('flags a layer with no geom', () => {
    const spec = createDashboardSpec();
    spec.charts[0]!.layers = [{} as never];

    expect(readCodes(spec)).toContain('missing_geom');
  });

  it('leaves a plugin geom alone, since the catalog is not the registry', () => {
    const spec = createDashboardSpec();
    spec.charts[0]!.layers = [{ geom: 'sankey' }];

    expect(readCodes(spec)).not.toContain('missing_geom');
  });
});
