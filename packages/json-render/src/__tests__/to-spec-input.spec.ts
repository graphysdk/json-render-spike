import { describe, expect, it } from 'vitest';

import { createCompiler } from '@graphysdk/viz-engine';

import { resolveChartInput, toSpecInput } from '../to-spec-input';

import { createDashboardSpec } from './fixtures';

describe('toSpecInput', () => {
  it('flattens scale options onto the scale node', () => {
    const spec = createDashboardSpec();
    const input = toSpecInput(spec.charts[0]!);

    expect(input.scales[1]).toEqual({
      type: 'scale',
      scaledAesthetic: 'y',
      scaleType: 'continuous',
      zero: true,
      nice: true,
    });
  });

  it('keeps inferred scale options nested', () => {
    const spec = createDashboardSpec();
    const input = toSpecInput(spec.charts[0]!);

    expect(input.scales[0]).toEqual({
      type: 'scale',
      scaledAesthetic: 'x',
      scaleType: 'inferred',
      options: undefined,
    });
  });

  it('drops the nulls a model emits for absent fields', () => {
    const spec = createDashboardSpec();

    // `missingValues: null` on the layer, `domainMax: null` on the scale, `startAngle: null` on the
    // coord — a retained null would override the engine's default rather than fall back to it.
    const lineLayer = toSpecInput(spec.charts[0]!).layers[0]!;
    expect(lineLayer.params).toEqual({ interpolate: 'linear' });

    const polarCoord = toSpecInput(spec.charts[1]!).coords;
    expect(polarCoord).toEqual({ type: 'coord', coordType: 'polar', params: { theta: 'y', innerRadius: 0.5 } });

    // Every param nulled out collapses to no params at all, not an empty object of nulls.
    const barLayer = toSpecInput(spec.charts[2]!).layers[0]!;
    expect(barLayer.params).toBeUndefined();
  });

  it('carries transforms through with their options', () => {
    const spec = createDashboardSpec();
    const input = toSpecInput(spec.charts[2]!);

    expect(input.transforms).toEqual([
      {
        type: 'transform',
        transformType: 'reshape',
        options: { reshape: ['plan', 'actual'], keyName: 'metric', valueName: 'amount' },
      },
    ]);
  });

  it('maps the chart title onto the spec content config', () => {
    const spec = createDashboardSpec();

    expect(toSpecInput(spec.charts[0]!).config.content?.title).toBe('Revenue by month');
  });
});

describe('resolveChartInput', () => {
  it('returns undefined when the chart names a dataset the spec does not carry', () => {
    const spec = createDashboardSpec();
    const orphan = { ...spec.charts[0]!, datasetId: 'nope' };

    expect(resolveChartInput(spec, orphan)).toBeUndefined();
  });

  it('produces a spec the engine compiles, for every chart in the dashboard', () => {
    const spec = createDashboardSpec();
    const compiler = createCompiler();

    for (const chart of spec.charts) {
      const compileInput = resolveChartInput(spec, chart);
      expect(compileInput, `chart ${chart.id} resolved no dataset`).toBeDefined();

      const result = compiler.compile(compileInput!);
      const reason = result.ok ? '' : result.errors.map((diagnostic) => diagnostic.message).join('; ');
      expect(result.ok, `chart ${chart.id}: ${reason}`).toBe(true);
    }
  });
});
