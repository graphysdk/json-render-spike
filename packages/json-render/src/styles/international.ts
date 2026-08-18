import type { FontTokenOverride, ThemeOverrides } from '@graphysdk/react';
import { config, pipe, style, styles } from '@graphysdk/viz-engine';

import type { ChartStyle } from './chart-style.types';

// Editorial newspaper style: white plates, an ink-and-grey series palette with one red accent,
// horizontal major grid only, and a single solid bottom border as the axis baseline.
const INTL_COLORS = {
  paper: '#FFFFFF', // chart background
  body: '#1A1A1A', // body text
  accent: '#D72B1C', // red, reserved for the emphasised series
  ink: '#111111', // primary series colour
  grey: '#8F8F8F', // axis, legend and caption text; third series colour
  greyLight: '#C9C9C9', // fourth series colour
  greyDark: '#4A4A4A', // fifth series colour
  gridLine: '#E9E9E9', // horizontal major grid and tick marks
} as const;

const INTL_FONT_FAMILY = {
  heading: "'Golos Text', 'Inter', sans-serif",
  body: "'Inter', 'Helvetica Neue', Arial, sans-serif",
} as const;

// Legend keys take the same small Inter cut as the axis text.
const smallCapsFont: FontTokenOverride = {
  family: INTL_FONT_FAMILY.body,
  size: { value: 10.5, unit: 'px' },
  lineHeight: 1.5,
  weight: 500,
};

const themeOverrides: ThemeOverrides = {
  textPrimary: INTL_COLORS.body,
  textSecondary: INTL_COLORS.grey,
  legendBackground: 'transparent',
  legendBorderColor: 'transparent',
  legendTextColor: INTL_COLORS.grey,
  fontFamilyDefault: INTL_FONT_FAMILY.body,
  fontFamilyHeading: INTL_FONT_FAMILY.heading,
  fontLegendLabel: smallCapsFont,
  fontPieLabel: `600 10.5px/1.4 ${INTL_FONT_FAMILY.body}`,
};

const internationalConfig = config({
  layout: { padding: 32, gaps: { header: 32 } },
  axes: {
    x: { position: 'bottom', grid: { isVisible: false }, ticks: { isVisible: false } },
    y: { position: 'left', grid: { isVisible: true } },
  },
});

// White paper, a solid horizontal grid in the faint grey, one solid bottom border as the baseline,
// and the shared 10.5px text cut — ink for labels that name things, grey for tick values.
const internationalChromeStyles = styles({
  tokens: {
    geomColor: INTL_COLORS.ink,
    pointBorderColor: INTL_COLORS.paper,
    gridLineColor: INTL_COLORS.gridLine,
  },
  defaults: [
    style.axisLabel({ fontSize: 10.5, fontWeight: 500, lineHeight: 1.5, textColor: INTL_COLORS.body }),
    style.tickLabel({ fontSize: 10.5, fontWeight: 500, lineHeight: 1.5, textColor: INTL_COLORS.grey }),
    style.dataLabel({ fontSize: 10.5, fontWeight: 500, textColor: INTL_COLORS.body }),
    style.graph({ background: INTL_COLORS.paper }),
    style.gridLine({ lineType: 'solid', strokeWidth: 1 }),
    style.tickLine({ color: INTL_COLORS.gridLine }),
    style.panelBorder({ strokeWidth: 0 }),
    style.panelBorder.bottom({ lineType: 'solid', strokeWidth: 1 }),
    style.geom.bar({ borderRadius: 'none' }),
    style.geom.line({ strokeWidth: 1.75 }),
    style.geom.point({ size: 6.5 }),
  ],
});

// Wedges cut square with white gaps between them.
const internationalPolarStyles = styles({
  defaults: [style.geom.bar({ borderColor: INTL_COLORS.paper, borderWidth: 2 })],
});

export const internationalChartStyle: ChartStyle = {
  description: 'Newspaper editorial: white plates, ink-and-grey series, one red accent',
  themeOverrides,
  panelBackground: INTL_COLORS.paper,
  // The reference dashboards spend the red on one key data point; generically it is the second
  // series, so a lone series prints in ink and a two-series comparison gets the ink-vs-red split.
  seriesColors: [INTL_COLORS.ink, INTL_COLORS.accent, INTL_COLORS.grey, INTL_COLORS.greyLight, INTL_COLORS.greyDark],
  fontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400..700&family=Golos+Text:wght@400..900&display=swap',
  apply: (input) =>
    input.coords?.coordType === 'polar'
      ? pipe(input, internationalConfig, internationalChromeStyles, internationalPolarStyles)
      : pipe(input, internationalConfig, internationalChromeStyles),
};
