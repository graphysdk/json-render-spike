import { describe, expect, it } from 'vitest';

import { createCompiler } from '@graphysdk/viz-engine';

import { toSpecInput } from '../to-spec-input';

import { createLineChart, createPolarChart, createReshapedChart, SALES_DATA, WIDE_DATA } from './fixtures';

describe('toSpecInput', () => {
  it('flattens scale options onto the scale node', () => {
    const input = toSpecInput(createLineChart());

    expect(input.scales[1]).toEqual({
      type: 'scale',
      scaledAesthetic: 'y',
      scaleType: 'continuous',
      zero: true,
      nice: true,
    });
  });

  it('keeps inferred scale options nested', () => {
    const input = toSpecInput(createLineChart());

    expect(input.scales[0]).toEqual({
      type: 'scale',
      scaledAesthetic: 'x',
      scaleType: 'inferred',
      options: undefined,
    });
  });

  it('passes authored params through untouched, leaving defaults to the compiler', () => {
    expect(toSpecInput(createLineChart()).layers[0]!.params).toEqual({ interpolate: 'linear' });

    expect(toSpecInput(createPolarChart()).coords).toEqual({
      type: 'coord',
      coordType: 'polar',
      params: { theta: 'y', innerRadius: 0.5 },
    });

    // A layer that authored no params carries none, rather than an invented empty object.
    expect(toSpecInput(createReshapedChart()).layers[0]!.params).toBeUndefined();
  });

  it('carries transforms through with their options', () => {
    expect(toSpecInput(createReshapedChart()).transforms).toEqual([
      {
        type: 'transform',
        transformType: 'reshape',
        options: { reshape: ['plan', 'actual'], keyName: 'metric', valueName: 'amount' },
      },
    ]);
  });

  it('maps the chart title onto the spec content config', () => {
    expect(toSpecInput(createLineChart()).config.content?.title).toBe('Revenue by month');
  });

  it('produces a spec the engine compiles', () => {
    const compiler = createCompiler();
    const cases = [
      { chart: createLineChart(), data: SALES_DATA },
      { chart: createPolarChart(), data: SALES_DATA },
      { chart: createReshapedChart(), data: WIDE_DATA },
    ];

    for (const { chart, data } of cases) {
      const result = compiler.compile({ input: toSpecInput(chart), data });
      const reason = result.ok ? '' : result.errors.map((diagnostic) => diagnostic.message).join('; ');
      expect(result.ok, `${chart.title}: ${reason}`).toBe(true);
    }
  });
});
