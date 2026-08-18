import type { ThemeOverrides } from '@graphysdk/react';
import { config, pipe, style, styles } from '@graphysdk/viz-engine';

import type { ChartStyle } from './chart-style.types';

// Warm newsletter style: cream chart grounds with a hairline ink outline and a 28px corner radius
// drawn by the chart's own frame, one full-strength brand orange leading a soft autumn ramp, and
// Plus Jakarta Sans throughout. Cartesian plates sit on a single 2px ink baseline; polar plates
// drop the baseline and grid entirely.
const LENNY_COLORS = {
  card: '#FFF3EA', // the cream chart ground
  ink: '#322E2C', // text, baseline, card outline
  inkSecondary: '#97836E', // tick labels, captions
  gridLine: '#D6B29A', // horizontal grid and tick marks
} as const;

/** Autumn ramp for series: orange leads, gold second, browns fading to cream. */
const AUTUMN_RAMP = ['#F5820D', '#F4B93F', '#AE9070', '#CBB499', '#E7DAC8'] as const;

const LENNY_FONT_FAMILY = "'Plus Jakarta Sans', sans-serif";

const themeOverrides: ThemeOverrides = {
  fontFamilyDefault: LENNY_FONT_FAMILY,
  fontFamilyHeading: LENNY_FONT_FAMILY,
  textPrimary: LENNY_COLORS.ink,
  textSecondary: LENNY_COLORS.inkSecondary,
  legendBackground: 'transparent',
  legendBorderColor: 'transparent',
};

const lennyCartesianConfig = config({
  appearance: { textScale: 1.2 },
  axes: {
    x: { ticks: { isVisible: false } },
    y: { position: 'left' },
  },
});

const lennyPolarConfig = config({
  appearance: { textScale: 1.2 },
  axes: {
    x: { ticks: { isVisible: false } },
    y: { ticks: { isVisible: false }, grid: { isVisible: false } },
  },
});

// The card itself: cream ground, radius 28, hairline ink outline, plain bold ink value labels with
// nothing behind the outside ones, and card-coloured hairlines cutting stacked bars into slabs.
const lennyCardStyles = styles({
  tokens: {
    geomColor: AUTUMN_RAMP[0],
    pointBorderColor: LENNY_COLORS.card,
    gridLineColor: LENNY_COLORS.gridLine,
  },
  defaults: [
    style.graph({ background: LENNY_COLORS.card, borderColor: LENNY_COLORS.ink, borderWidth: 1, borderRadius: 28 }),
    style.tickLabel({ fontWeight: 600, textColor: LENNY_COLORS.inkSecondary }),
    style.dataLabel({ fontSize: 13, fontWeight: 700, textColor: LENNY_COLORS.ink }),
    style.dataLabel.observation.outside({ background: 'transparent' }),
    style.geom.bar({ borderRadius: 'none', borderColor: LENNY_COLORS.card, borderWidth: 1 }),
    style.geom.line({ strokeWidth: 6 }),
  ],
});

// A cartesian plate: a single 2px ink baseline, a solid horizontal grid, no side rules.
const lennyCartesianPlateStyles = styles({
  defaults: [
    style.gridLine({ lineType: 'solid' }),
    style.tickLine({ color: LENNY_COLORS.gridLine }),
    style.panelBorder({ strokeWidth: 0 }),
    style.panelBorder.bottom({ lineType: 'solid', strokeWidth: 2, color: LENNY_COLORS.ink }),
  ],
});

// A polar plate: no baseline, no rules — the ring is its own ground.
const lennyPolarPlateStyles = styles({ defaults: [style.panelBorder({ strokeWidth: 0 })] });

export const lennysNewsletterChartStyle: ChartStyle = {
  description: 'Warm newsletter: cream rounded cards, autumn orange ramp, Plus Jakarta Sans',
  themeOverrides,
  panelBackground: LENNY_COLORS.card,
  seriesColors: AUTUMN_RAMP,
  fontsUrl: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200..800&display=swap',
  apply: (input) =>
    input.coords?.coordType === 'polar'
      ? pipe(input, lennyPolarConfig, lennyCardStyles, lennyPolarPlateStyles)
      : pipe(input, lennyCartesianConfig, lennyCardStyles, lennyCartesianPlateStyles),
};
