import { describe, expect, it } from 'vitest';

import type { Data, SpecInput } from '@graphysdk/viz-engine';
import { createCompiler } from '@graphysdk/viz-engine';

import { braunChartStyle } from '../braun';
import { applyChartStyle } from '../chart-styles';

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

describe('braunChartStyle', () => {
  it('folds its config onto the spec without touching authored content', () => {
    const authored = createSpecInput({ config: { content: { title: 'Revenue by month' } } });

    const styled = braunChartStyle.apply(authored);

    expect(styled.config.content?.title).toBe('Revenue by month');
    expect(styled.config.layout?.padding).toBe(32);
    expect(styled.styles).toBeDefined();
  });

  it('adds the polar overrides only under polar coords', () => {
    const cartesian = braunChartStyle.apply(createSpecInput());
    const polar = braunChartStyle.apply(
      createSpecInput({ coords: { type: 'coord', coordType: 'polar', params: { theta: 'y' } } })
    );

    // Each styles() fold extends the previous sheet, so the polar spec carries one sheet more.
    expect(cartesian.styles?.extends ?? []).toHaveLength(0);
    expect(polar.styles?.extends).toHaveLength(1);
  });

  it('paints an unmapped-color geom in ink, not the built-in default purple', () => {
    // Unmapped color never goes through the palette scale — it paints the stylesheet's `geomColor`
    // token, which the style must re-ground or a single-series chart keeps the engine's purple.
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

    const styled = applyChartStyle(singleSeries, 'braun');
    const result = createCompiler().compile({
      input: styled.input,
      data,
      customPalettes: styled.customPalettes,
    });

    expect(result.ok).toBe(true);
    const serialized = JSON.stringify(result.ok ? result.compiled.layers : []);
    expect(serialized).toContain('#1D1D1B');
    expect(serialized).not.toContain('#B399FE');
  });

  it('leads its series colors with ink, so grouped charts also start from ink', () => {
    expect(braunChartStyle.seriesColors[0]).toBe('#1D1D1B');
  });
});
