import { describe, expect, it } from 'vitest';

import type { Data, SpecInput } from '@graphysdk/viz-engine';
import { createCompiler } from '@graphysdk/viz-engine';

import { applyChartStyle } from '../chart-styles';
import { neoBrutalistChartStyle } from '../neo-brutalist';

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

describe('neoBrutalistChartStyle', () => {
  it('folds its config onto the spec without touching authored content', () => {
    const authored = createSpecInput({ config: { content: { title: 'Revenue by month' } } });

    const styled = neoBrutalistChartStyle.apply(authored);

    expect(styled.config.content?.title).toBe('Revenue by month');
    expect(styled.config.layout?.padding).toBe(32);
    expect(styled.styles).toBeDefined();
  });

  it('lays the acid baseline only under cartesian bar charts', () => {
    // The baseline rides in as an extra stylesheet, so the extends chain lengthens only for bars.
    const bars = neoBrutalistChartStyle.apply(createSpecInput());
    const lines = neoBrutalistChartStyle.apply(createSpecInput({ layers: [{ type: 'layer', geom: 'line' }] }));
    const polar = neoBrutalistChartStyle.apply(
      createSpecInput({ coords: { type: 'coord', coordType: 'polar', params: { theta: 'y' } } })
    );

    expect(bars.styles?.extends).toHaveLength(1);
    expect(lines.styles?.extends ?? []).toHaveLength(0);
    expect(polar.styles?.extends).toHaveLength(1);
  });

  it('paints an unmapped-color geom in acid, not the built-in default purple', () => {
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

    const styled = applyChartStyle(singleSeries, 'neo-brutalist');
    const result = createCompiler().compile({ input: styled.input, data, customPalettes: styled.customPalettes });

    expect(result.ok).toBe(true);
    const serialized = JSON.stringify(result.ok ? result.compiled.layers : []);
    expect(serialized).toContain('#C8FF00');
    expect(serialized).not.toContain('#B399FE');
  });

  it('leads its series colors with the acid accent', () => {
    expect(neoBrutalistChartStyle.seriesColors[0]).toBe('#C8FF00');
  });
});
