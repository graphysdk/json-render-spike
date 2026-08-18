import { describe, expect, it } from 'vitest';

import type { Data, SpecInput } from '@graphysdk/viz-engine';
import { createCompiler } from '@graphysdk/viz-engine';

import { applyChartStyle } from '../chart-styles';
import { lennysNewsletterChartStyle } from '../lennys-newsletter';

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

describe('lennysNewsletterChartStyle', () => {
  it('folds its config onto the spec without touching authored content', () => {
    const authored = createSpecInput({ config: { content: { title: 'Revenue by month' } } });

    const styled = lennysNewsletterChartStyle.apply(authored);

    expect(styled.config.content?.title).toBe('Revenue by month');
    expect(styled.config.appearance?.textScale).toBe(1.2);
    expect(styled.styles).toBeDefined();
  });

  it('drops the grid only on polar plates', () => {
    const cartesian = lennysNewsletterChartStyle.apply(createSpecInput());
    const polar = lennysNewsletterChartStyle.apply(
      createSpecInput({ coords: { type: 'coord', coordType: 'polar', params: { theta: 'y' } } })
    );

    expect(cartesian.config.axes?.y?.grid?.isVisible).toBeUndefined();
    expect(polar.config.axes?.y?.grid?.isVisible).toBe(false);
  });

  it('paints an unmapped-color geom in brand orange, not the built-in default purple', () => {
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

    const styled = applyChartStyle(singleSeries, 'lennys-newsletter');
    const result = createCompiler().compile({ input: styled.input, data, customPalettes: styled.customPalettes });

    expect(result.ok).toBe(true);
    const serialized = JSON.stringify(result.ok ? result.compiled.layers : []);
    expect(serialized).toContain('#F5820D');
    expect(serialized).not.toContain('#B399FE');
  });

  it('leads its series colors with the brand orange', () => {
    expect(lennysNewsletterChartStyle.seriesColors[0]).toBe('#F5820D');
  });
});
