import type { ThemeOverrides } from '@graphysdk/react';
import type { CustomPalettesInput, SpecInput } from '@graphysdk/viz-engine';
import { scale } from '@graphysdk/viz-engine';

import { braunChartStyle } from './braun';
import type { ChartStyle } from './chart-style.types';
import { financialTimesChartStyle } from './financial-times';
import { internationalChartStyle } from './international';
import { lennysNewsletterChartStyle } from './lennys-newsletter';

export type ChartStyleName = (typeof CHART_STYLE_NAMES)[number];

/** An authored spec restyled by a baked-in style, with the render inputs that carry the rest of it. */
export interface StyledChart {
  input: SpecInput;
  themeOverrides: ThemeOverrides;
  customPalettes: CustomPalettesInput;
}

export const CHART_STYLE_NAMES = ['braun', 'financial-times', 'international', 'lennys-newsletter'] as const;

/** The baked-in styles, keyed by the name a chart's `style` prop selects. */
export const chartStyles: Record<ChartStyleName, ChartStyle> = {
  braun: braunChartStyle,
  'financial-times': financialTimesChartStyle,
  international: internationalChartStyle,
  'lennys-newsletter': lennysNewsletterChartStyle,
};

/**
 * The style name a host really handed over. A host resolves prop expressions without validating
 * against the schema, so anything that is not a known name reads as no style rather than throwing.
 */
export function readChartStyleName(value: unknown): ChartStyleName | undefined {
  return (CHART_STYLE_NAMES as readonly unknown[]).includes(value) ? (value as ChartStyleName) : undefined;
}

/**
 * Restyles an authored spec with a baked-in style: folds the style's config and stylesheets onto
 * the spec, and points every palette scale at the style's own series colors. The style wins over
 * whatever palette the spec chose, so one name gives one look.
 */
export function applyChartStyle(input: SpecInput, name: ChartStyleName): StyledChart {
  const chartStyle = chartStyles[name];
  return {
    input: chartStyle.apply(forceSeriesColors(input, name)),
    themeOverrides: chartStyle.themeOverrides,
    customPalettes: {
      [name]: chartStyle.seriesColors.map((hex, index) => ({ id: `series-${index + 1}`, hex })),
    },
  };
}

/**
 * Points every palette scale at the style's registered colors, planting one when the spec carries
 * none — the compiler injects the default palette for unmapped color, which would paint past the
 * style. Empty `overrides` clears any per-group picks the spec authored.
 */
function forceSeriesColors(input: SpecInput, name: ChartStyleName): SpecInput {
  const stylePalette = { type: 'custom', id: name } as const;
  const scales = input.scales.map((scaleInput) =>
    scaleInput.scaleType === 'palette' ? { ...scaleInput, palette: stylePalette, overrides: {} } : scaleInput
  );
  const hasPaletteScale = scales.some((scaleInput) => scaleInput.scaleType === 'palette');

  return {
    ...input,
    scales: hasPaletteScale ? scales : [...scales, scale.color.palette({ palette: stylePalette })],
  };
}
