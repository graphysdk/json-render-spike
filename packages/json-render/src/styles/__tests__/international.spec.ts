import { describe, expect, it } from 'vitest';

import type { Data, SpecInput } from '@graphysdk/viz-engine';
import { createCompiler } from '@graphysdk/viz-engine';

import { applyChartStyle } from '../chart-styles';
import { internationalChartStyle } from '../international';

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

describe('internationalChartStyle', () => {
  it('folds its config onto the spec without touching authored content', () => {
    const authored = createSpecInput({ config: { content: { title: 'Revenue by month' } } });

    const styled = internationalChartStyle.apply(authored);

    expect(styled.config.content?.title).toBe('Revenue by month');
    expect(styled.config.layout?.padding).toBe(32);
    expect(styled.styles).toBeDefined();
  });

  it('adds the polar overrides only under polar coords', () => {
    const cartesian = internationalChartStyle.apply(createSpecInput());
    const polar = internationalChartStyle.apply(
      createSpecInput({ coords: { type: 'coord', coordType: 'polar', params: { theta: 'y' } } })
    );

    expect(cartesian.styles?.extends ?? []).toHaveLength(0);
    expect(polar.styles?.extends).toHaveLength(1);
  });

  it('paints an unmapped-color geom in ink, not the built-in default purple', () => {
    const singleSeries = createSpecInput({
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

    const styled = applyChartStyle(singleSeries, 'international');
    const result = createCompiler().compile({ input: styled.input, data, customPalettes: styled.customPalettes });

    expect(result.ok).toBe(true);
    const serialized = JSON.stringify(result.ok ? result.compiled.layers : []);
    expect(serialized).toContain('#111111');
    expect(serialized).not.toContain('#B399FE');
  });

  it('keeps the red accent out of the lead series, so a lone series prints in ink', () => {
    expect(internationalChartStyle.seriesColors.slice(0, 2)).toEqual(['#111111', '#D72B1C']);
  });
});
