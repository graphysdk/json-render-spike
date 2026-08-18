import type { FontTokenOverride, ThemeOverrides } from '@graphysdk/react';
import { config, pipe, style, styles } from '@graphysdk/viz-engine';

import type { ChartStyle } from './chart-style.types';

// Neo-brutalist: near-black sheets with square corners, a chrome-grey dashed frame, Space Grotesk
// engine text, and acid `#C8FF00` reserved for data. Cartesian bar charts trade the dashed bottom
// edge for a solid acid baseline the bars sit on.
export const NB_COLORS = {
  surface: '#171717', // sheets, radius 0
  body: '#F0F0F0', // primary text and the white series
  secondary: '#8A8A8A', // secondary text and the grey series
  acid: '#C8FF00', // the accent — data only
  greyMid: '#4A4A4A', // muted series
  greyDeep: '#2E2E2E', // ghost series / remainder tracks
  chrome: '#333333', // grid rows + dashed frame
} as const;

const NB_FONT_FAMILY = {
  heading: '"Space Grotesk", Inter, sans-serif', // headings and engine text
  body: 'Inter, "Helvetica Neue", Arial, sans-serif', // the shared base
} as const;

// Engine text is Space Grotesk 500.
const engineText: FontTokenOverride = {
  family: NB_FONT_FAMILY.heading,
  size: { value: 10, unit: 'px' },
  lineHeight: 1.4,
  weight: 500,
};

const themeOverrides: ThemeOverrides = {
  textPrimary: NB_COLORS.body,
  textSecondary: NB_COLORS.secondary,
  legendBackground: 'transparent',
  legendBorderColor: 'transparent',
  legendTextColor: NB_COLORS.body,
  fontFamilyDefault: NB_FONT_FAMILY.body,
  fontFamilyHeading: NB_FONT_FAMILY.heading,
  fontLegendLabel: engineText,
  fontPieLabel: `500 10px/14px ${NB_FONT_FAMILY.heading}`,
  fontSeriesLabel: `500 11px/14px ${NB_FONT_FAMILY.heading}`,
};

const neoBrutalistConfig = config({
  layout: { padding: 32 },
  axes: {
    x: { position: 'bottom', grid: { isVisible: false }, ticks: { isVisible: false } },
    y: { position: 'left', grid: { isVisible: true } },
  },
});

// The sheet paint: square corners, chrome-grey dashed frame, solid grid, Space Grotesk text.
const neoBrutalistChromeStyles = styles({
  tokens: {
    geomColor: NB_COLORS.acid,
    pointBorderColor: NB_COLORS.surface,
    gridLineColor: NB_COLORS.chrome,
  },
  defaults: [
    style.axisLabel({
      fontFamily: NB_FONT_FAMILY.heading,
      fontSize: 10,
      fontWeight: 500,
      lineHeight: 1.4,
      textColor: NB_COLORS.body,
    }),
    style.tickLabel({
      fontFamily: NB_FONT_FAMILY.heading,
      fontSize: 10,
      fontWeight: 500,
      lineHeight: 1.4,
      textColor: NB_COLORS.secondary,
    }),
    style.dataLabel({ fontFamily: NB_FONT_FAMILY.heading, fontSize: 10, fontWeight: 500, textColor: NB_COLORS.body }),
    style.graph({ background: NB_COLORS.surface, borderRadius: 0 }),
    style.gridLine({ lineType: 'solid', strokeWidth: 1 }),
    style.tickLine({ color: NB_COLORS.chrome }),
    style.panelBorder({ lineType: 'dashed', strokeWidth: 1, color: NB_COLORS.chrome, borderRadius: 0 }),
    style.geom.bar({ borderRadius: 'none' }),
  ],
});

// Bars sit on a solid acid baseline instead of the dashed bottom edge.
const neoBrutalistBaselineStyles = styles({
  defaults: [style.panelBorder.bottom({ lineType: 'solid', strokeWidth: 2, color: NB_COLORS.acid })],
});

// Wedges cut square with sheet-coloured gaps between them.
const neoBrutalistPolarStyles = styles({
  defaults: [style.geom.bar({ borderColor: NB_COLORS.surface, borderWidth: 2 })],
});

export const neoBrutalistChartStyle: ChartStyle = {
  description: 'Neo-brutalist: near-black sheets, dashed chrome frame, acid #C8FF00 for data only',
  themeOverrides,
  panelBackground: NB_COLORS.surface,
  seriesColors: [NB_COLORS.acid, NB_COLORS.body, NB_COLORS.secondary, NB_COLORS.greyMid, NB_COLORS.greyDeep],
  fontsUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap',
  apply: (input) => {
    if (input.coords?.coordType === 'polar') {
      return pipe(input, neoBrutalistConfig, neoBrutalistChromeStyles, neoBrutalistPolarStyles);
    }
    const hasBars = input.layers.some((layer) => layer.geom === 'bar');
    return hasBars
      ? pipe(input, neoBrutalistConfig, neoBrutalistChromeStyles, neoBrutalistBaselineStyles)
      : pipe(input, neoBrutalistConfig, neoBrutalistChromeStyles);
  },
};
