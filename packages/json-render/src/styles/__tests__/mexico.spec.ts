import { describe, expect, it } from 'vitest';

import type { Data, SpecInput } from '@graphysdk/viz-engine';
import { createCompiler } from '@graphysdk/viz-engine';

import { applyChartStyle } from '../chart-styles';
import { mexicoChartStyle } from '../mexico';

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

describe('mexicoChartStyle', () => {
  it('folds its config onto the spec without touching authored content', () => {
    const authored = createSpecInput({ config: { content: { title: 'Revenue by month' } } });

    const styled = mexicoChartStyle.apply(authored);

    expect(styled.config.content?.title).toBe('Revenue by month');
    expect(styled.config.layout?.padding).toBe(32);
    expect(styled.styles).toBeDefined();
  });

  it('hides the y axis only on polar cards', () => {
    const cartesian = mexicoChartStyle.apply(createSpecInput());
    const polar = mexicoChartStyle.apply(
      createSpecInput({ coords: { type: 'coord', coordType: 'polar', params: { theta: 'y' } } })
    );

    expect(cartesian.config.axes?.y?.isVisible).toBeUndefined();
    expect(polar.config.axes?.y?.isVisible).toBe(false);
  });

  it('paints an unmapped-color geom in magenta, not the built-in default purple', () => {
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

    const styled = applyChartStyle(singleSeries, 'mexico-68');
    const result = createCompiler().compile({ input: styled.input, data, customPalettes: styled.customPalettes });

    expect(result.ok).toBe(true);
    const serialized = JSON.stringify(result.ok ? result.compiled.layers : []);
    expect(serialized).toContain('#EC008C');
    expect(serialized).not.toContain('#B399FE');
  });

  it('leads its series colors with the magenta', () => {
    expect(mexicoChartStyle.seriesColors[0]).toBe('#EC008C');
  });
});
