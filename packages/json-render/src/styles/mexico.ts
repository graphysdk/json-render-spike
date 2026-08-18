import type { FontTokenOverride, ThemeOverrides } from '@graphysdk/react';
import { config, pipe, style, styles } from '@graphysdk/viz-engine';

import type { ChartStyle } from './chart-style.types';

// The Mexico 68 op-art look: white cards, a hot magenta lead with orange, purple, cyan and green
// radiating behind it, Righteous headlines over Rubik engine text, and marks drawn as concentric
// outline echoes by the style's geom-renderer plugins rather than solid fills.
export const MEXICO_COLORS = {
  card: '#FFFFFF', // card and chart background
  ink: '#1A1A1A', // baselines, printed values, echo halos
  pink: '#EC008C', // the lead series
  orange: '#F7931E', // the next colour
  purple: '#662D91',
  cyan: '#27AAE1',
  green: '#39B54A',
  axisGrey: '#9A968C', // the quiet ground the vibration needs
} as const;

const MEXICO_FONT_FAMILY = {
  headings: "'Righteous', 'Rubik', sans-serif",
  body: "'Rubik', 'Helvetica Neue', Arial, sans-serif",
} as const;

// Engine text is Rubik 500 12px; the printed value above each mark sits heavier and larger.
const engineFont: FontTokenOverride = {
  family: MEXICO_FONT_FAMILY.body,
  size: { value: 12, unit: 'px' },
  lineHeight: 1.4,
  weight: 500,
};

const themeOverrides: ThemeOverrides = {
  textPrimary: MEXICO_COLORS.ink,
  textSecondary: MEXICO_COLORS.axisGrey,
  legendBackground: 'transparent',
  legendBorderColor: 'transparent',
  legendTextColor: MEXICO_COLORS.ink,
  fontFamilyDefault: MEXICO_FONT_FAMILY.body,
  fontFamilyHeading: MEXICO_FONT_FAMILY.headings,
  fontLegendLabel: engineFont,
  fontPieLabel: `500 11px/1.4 ${MEXICO_FONT_FAMILY.body}`,
};

// Shared frame: white card, no grid, a single 2px ink baseline the marks rest on. The y axis stays
// visible in the quiet grey.
const mexicoConfig = config({
  layout: { padding: 32, gaps: { header: 32 } },
  axes: {
    x: { position: 'bottom', grid: { isVisible: false }, ticks: { isVisible: false } },
    y: { position: 'left', grid: { isVisible: false } },
  },
});

const mexicoChromeStyles = styles({
  tokens: {
    geomColor: MEXICO_COLORS.pink,
    pointBorderColor: MEXICO_COLORS.card,
  },
  defaults: [
    style.axisLabel({ fontSize: 12, fontWeight: 500, lineHeight: 1.4, textColor: MEXICO_COLORS.ink }),
    style.tickLabel({ fontSize: 12, fontWeight: 500, lineHeight: 1.4, textColor: MEXICO_COLORS.axisGrey }),
    style.dataLabel({ fontSize: 13, fontWeight: 600, textColor: MEXICO_COLORS.ink }),
    style.graph({ background: MEXICO_COLORS.card }),
    style.tickLine({ color: 'transparent' }),
    style.panelBorder({ strokeWidth: 0 }),
    style.panelBorder.bottom({ lineType: 'solid', strokeWidth: 2, color: MEXICO_COLORS.ink }),
    style.geom.bar({ borderRadius: 'none' }),
  ],
});

// Polar cards carry no cartesian baseline or y axis — the ring is its own ground.
const mexicoPolarConfig = config({ axes: { y: { isVisible: false } } });
const mexicoPolarStyles = styles({ defaults: [style.panelBorder.bottom({ strokeWidth: 0 })] });

export const mexicoChartStyle: ChartStyle = {
  description: 'Mexico 68 op-art: white cards, magenta-led palette, concentric outline marks',
  themeOverrides,
  panelBackground: MEXICO_COLORS.card,
  seriesColors: [
    MEXICO_COLORS.pink,
    MEXICO_COLORS.orange,
    MEXICO_COLORS.purple,
    MEXICO_COLORS.cyan,
    MEXICO_COLORS.green,
  ],
  fontsUrl: 'https://fonts.googleapis.com/css2?family=Righteous&family=Rubik:wght@400;500;600;700&display=swap',
  apply: (input) =>
    input.coords?.coordType === 'polar'
      ? pipe(input, mexicoConfig, mexicoPolarConfig, mexicoChromeStyles, mexicoPolarStyles)
      : pipe(input, mexicoConfig, mexicoChromeStyles),
};
