import { describe, expect, it } from 'vitest';

import type { Data, SpecInput } from '@graphysdk/viz-engine';
import { createCompiler } from '@graphysdk/viz-engine';

import { applyChartStyle } from '../chart-styles';
import { financialTimesChartStyle } from '../financial-times';

function createSpecInput(overrides: Partial<SpecInput> = {}): SpecInput {
  return {
    mapping: { x: 'month', y: 'revenue' },
    layers: [{ type: 'layer', geom: 'bar' }],
    scales: [],
    transforms: [],
    highlights: [],
    config: {},
    ...overrides,
  };
}

describe('financialTimesChartStyle', () => {
  it('folds its config onto the spec without touching authored content', () => {
    const authored = createSpecInput({ config: { content: { title: 'Revenue by month' } } });

    const styled = financialTimesChartStyle.apply(authored);

    expect(styled.config.content?.title).toBe('Revenue by month');
    expect(styled.config.layout?.padding).toBe(32);
    expect(styled.styles).toBeDefined();
  });

  it('adds the polar overrides only under polar coords', () => {
    const cartesian = financialTimesChartStyle.apply(createSpecInput());
    const polar = financialTimesChartStyle.apply(
      createSpecInput({ coords: { type: 'coord', coordType: 'polar', params: { theta: 'y' } } })
    );

    expect(cartesian.styles?.extends ?? []).toHaveLength(0);
    expect(polar.styles?.extends).toHaveLength(1);
  });

  it('paints an unmapped-color geom in claret, not the built-in default purple', () => {
    const singleSeries = createSpecInput({
      mapping: { x: 'month', y: 'revenue' },
      layers: [{ type: 'layer', geom: 'line' }],
      scales: [
        { type: 'scale', scaledAesthetic: 'x', scaleType: 'inferred' },
        { type: 'scale', scaledAesthetic: 'y', scaleType: 'continuous' },
      ],
    });
    const data: Data = {
      columns: [{ key: 'month' }, { key: 'revenue' }],
      rows: [
        { month: 'Jan', revenue: 42 },
        { month: 'Feb', revenue: 45 },
      ],
    };

    const styled = applyChartStyle(singleSeries, 'financial-times');
    const result = createCompiler().compile({ input: styled.input, data, customPalettes: styled.customPalettes });

    expect(result.ok).toBe(true);
    const serialized = JSON.stringify(result.ok ? result.compiled.layers : []);
    expect(serialized).toContain('#A8324A');
    expect(serialized).not.toContain('#B399FE');
  });

  it('leads its series colors with claret and Oxford blue', () => {
    expect(financialTimesChartStyle.seriesColors.slice(0, 2)).toEqual(['#A8324A', '#0F5499']);
  });
});
