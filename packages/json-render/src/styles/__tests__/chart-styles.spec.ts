import { describe, expect, it } from 'vitest';

import type { Data, SpecInput } from '@graphysdk/viz-engine';
import { createCompiler } from '@graphysdk/viz-engine';

import { applyChartStyle, chartStyles, readChartStyleName } from '../chart-styles';

function createSpecInput(overrides: Partial<SpecInput> = {}): SpecInput {
  return {
    mapping: { x: 'month', y: 'revenue', color: 'region' },
    layers: [{ type: 'layer', geom: 'bar' }],
    scales: [
      { type: 'scale', scaledAesthetic: 'x', scaleType: 'inferred' },
      { type: 'scale', scaledAesthetic: 'y', scaleType: 'continuous' },
      { type: 'scale', scaledAesthetic: 'color', scaleType: 'palette', palette: { type: 'pastel' } },
    ],
    transforms: [],
    highlights: [],
    config: {},
    ...overrides,
  };
}

describe('readChartStyleName', () => {
  it('accepts only a known style name, since a host hands props over unvalidated', () => {
    expect(readChartStyleName('braun')).toBe('braun');
    expect(readChartStyleName('bauhaus')).toBeUndefined();
    expect(readChartStyleName(undefined)).toBeUndefined();
    expect(readChartStyleName(7)).toBeUndefined();
  });
});

describe('applyChartStyle', () => {
  it('points an authored palette scale at the style, replacing the palette the spec chose', () => {
    const { input } = applyChartStyle(createSpecInput(), 'braun');

    const paletteScale = input.scales.find((scale) => scale.scaleType === 'palette');
    expect(paletteScale).toMatchObject({ palette: { type: 'custom', id: 'braun' } });
  });

  it('plants a palette scale when the spec has none, so unmapped color still takes the style', () => {
    const bare = createSpecInput({
      scales: [{ type: 'scale', scaledAesthetic: 'x', scaleType: 'inferred' }],
    });

    const { input } = applyChartStyle(bare, 'braun');

    const paletteScale = input.scales.find((scale) => scale.scaleType === 'palette');
    expect(paletteScale).toMatchObject({ scaledAesthetic: 'color', palette: { type: 'custom', id: 'braun' } });
  });

  it('clears per-group overrides the spec authored, so the style paints every group', () => {
    const overridden = createSpecInput({
      scales: [{ type: 'scale', scaledAesthetic: 'color', scaleType: 'palette', overrides: { 1: { hex: '#FF0000' } } }],
    });

    const { input } = applyChartStyle(overridden, 'braun');

    expect(input.scales[0]).toMatchObject({ overrides: {} });
  });

  it('registers the style series colors under the style name a palette scale references', () => {
    const { customPalettes } = applyChartStyle(createSpecInput(), 'braun');

    const colors = customPalettes['braun'];
    expect(colors?.map((color) => color.hex)).toEqual([...chartStyles.braun.seriesColors]);
    expect(colors?.map((color) => color.id)).toEqual(colors?.map((color, index) => `series-${index + 1}`));
  });

  it('hands back the style theme beside the restyled spec', () => {
    const { themeOverrides } = applyChartStyle(createSpecInput(), 'braun');

    expect(themeOverrides).toBe(chartStyles.braun.themeOverrides);
  });

  it('folds an authored stylesheet on top of the baked style, since it is the explicit ask', () => {
    const authored = createSpecInput({
      styles: {
        type: 'styles',
        overrides: [{ select: { target: 'geom', kind: 'bar' }, declarations: { color: '#D72B1C' } }],
      },
    });

    const { input } = applyChartStyle(authored, 'braun');

    // The topmost sheet is the authored one; the baked style's sheets sit beneath it in `extends`.
    expect(input.styles?.overrides?.[0]?.declarations).toMatchObject({ color: '#D72B1C' });
    expect(input.styles?.extends?.length ?? 0).toBeGreaterThan(0);
  });

  it('lets an authored override outvote both the baked style and the color scale', () => {
    const data: Data = {
      columns: [{ key: 'month' }, { key: 'region' }, { key: 'revenue' }],
      rows: [
        { month: 'Jan', region: 'EMEA', revenue: 120 },
        { month: 'Jan', region: 'AMER', revenue: 90 },
      ],
    };
    const grouped = createSpecInput({
      styles: {
        type: 'styles',
        overrides: [{ select: { target: 'geom', kind: 'bar' }, declarations: { color: '#D72B1C' } }],
      },
    });

    const styled = applyChartStyle(grouped, 'braun');
    const result = createCompiler().compile({ input: styled.input, data, customPalettes: styled.customPalettes });

    expect(result.ok).toBe(true);
    expect(JSON.stringify(result.ok ? result.compiled.layers : [])).toContain('#D72B1C');
  });

  it('paints only the observations a conditioned override matches', () => {
    const data: Data = {
      columns: [{ key: 'month' }, { key: 'revenue' }],
      rows: [
        { month: 'Jan', revenue: 120 },
        { month: 'Feb', revenue: 90 },
        { month: 'Mar', revenue: 145 },
      ],
    };
    const conditioned = createSpecInput({
      mapping: { x: 'month', y: 'revenue' },
      scales: [
        { type: 'scale', scaledAesthetic: 'x', scaleType: 'inferred' },
        { type: 'scale', scaledAesthetic: 'y', scaleType: 'continuous' },
      ],
      styles: {
        type: 'styles',
        overrides: [
          {
            select: { target: 'geom', kind: 'bar' },
            declarations: { color: '#D72B1C' },
            when: { where: { variable: 'month', eq: 'Feb' } },
          },
        ],
      },
    });

    const styled = applyChartStyle(conditioned, 'braun');
    const result = createCompiler().compile({ input: styled.input, data, customPalettes: styled.customPalettes });

    expect(result.ok).toBe(true);
    const reds = JSON.stringify(result.ok ? result.compiled.layers : []).match(/#D72B1C/g) ?? [];
    expect(reds).toHaveLength(1);
  });
});
