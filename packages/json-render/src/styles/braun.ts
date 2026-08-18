import type { FontTokenOverride, ThemeOverrides } from '@graphysdk/react';
import { config, pipe, style, styles } from '@graphysdk/viz-engine';

import type { ChartStyle } from './chart-style.types';

// Dieter Rams for data: a warm-grey plate, ink linework, Archivo throughout.
const BRAUN_COLORS = {
  ink: '#1D1D1B', // bars, traces, printed readings
  trace2: '#8E8C86', // second line series
  structure: '#C9C6BE', // baseline rule and hairlines
  labelMuted: '#87857F', // tick labels, legend key text
  panel: '#EFEDE8', // the chart plate
} as const;

// Warm-grey ramp the later series settle into, darkest first.
const BRAUN_RAMP = ['#A6A39B', '#B7B4AC', '#C8C5BD', '#D8D5CD'] as const;

const BRAUN_FONT_FAMILY = "'Archivo', 'Inter', sans-serif";

// Ticks, axis labels and legend keys share one 12px cut in the muted grey.
const tickFont: FontTokenOverride = {
  family: BRAUN_FONT_FAMILY,
  size: { value: 12, unit: 'px' },
  lineHeight: 1.4,
  weight: 500,
};

const themeOverrides: ThemeOverrides = {
  textPrimary: BRAUN_COLORS.ink,
  textSecondary: BRAUN_COLORS.labelMuted,
  legendBackground: 'transparent',
  legendBorderColor: 'transparent',
  legendTextColor: BRAUN_COLORS.labelMuted,
  fontFamilyDefault: BRAUN_FONT_FAMILY,
  fontFamilyHeading: BRAUN_FONT_FAMILY,
  fontLegendLabel: tickFont,
  fontSeriesLabel: `500 12px/1.4 ${BRAUN_FONT_FAMILY}`,
  fontPieLabel: `500 11.5px/1.4 ${BRAUN_FONT_FAMILY}`,
};

// The reference dashboards drop the y axis entirely and print readings instead; a generated chart
// cannot be counted on to author data labels, so the axis stays — tickless, gridless and muted.
const braunConfig = config({
  layout: { padding: 32 },
  axes: {
    x: { position: 'bottom', grid: { isVisible: false }, ticks: { isVisible: false } },
    y: { position: 'left', grid: { isVisible: false }, ticks: { isVisible: false } },
  },
});

// The plate paint: warm panel background, one structure-grey baseline as the only border edge, and
// fully rounded pills whose panel-coloured hairline opens gaps in stacks. The tokens re-ground the
// built-in stylesheet: `geomColor` is what an unmapped-color geom paints with, so a single-series
// chart prints in ink rather than the engine's default purple.
const braunChromeStyles = styles({
  tokens: {
    geomColor: BRAUN_COLORS.ink,
    pointBorderColor: BRAUN_COLORS.panel,
  },
  defaults: [
    style.axisLabel({ fontSize: 12, fontWeight: 500, lineHeight: 1.4, textColor: BRAUN_COLORS.ink }),
    style.tickLabel({ fontSize: 12, fontWeight: 500, lineHeight: 1.4, textColor: BRAUN_COLORS.labelMuted }),
    style.dataLabel({ fontSize: 13, fontWeight: 600, textColor: BRAUN_COLORS.ink }),
    style.dataLabel.observation.outside({ background: BRAUN_COLORS.panel }),
    style.graph({ background: BRAUN_COLORS.panel }),
    style.panelBorder({ strokeWidth: 0 }),
    style.panelBorder.bottom({ lineType: 'solid', strokeWidth: 1.2, color: BRAUN_COLORS.structure }),
    style.geom.bar({ borderRadius: 'full', borderColor: BRAUN_COLORS.panel, borderWidth: 1.5 }),
  ],
});

// Polar plates carry no cartesian baseline, and wedges cut square with wider panel-coloured gaps.
const braunPolarStyles = styles({
  defaults: [
    style.panelBorder.bottom({ strokeWidth: 0 }),
    style.geom.bar({ borderRadius: 'none', borderColor: BRAUN_COLORS.panel, borderWidth: 2 }),
  ],
});

export const braunChartStyle: ChartStyle = {
  description: 'Dieter Rams: warm-grey plates, ink linework, rounded pill bars, Archivo type',
  themeOverrides,
  panelBackground: BRAUN_COLORS.panel,
  seriesColors: [BRAUN_COLORS.ink, BRAUN_COLORS.trace2, ...BRAUN_RAMP],
  fontsUrl: 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&display=swap',
  apply: (input) =>
    input.coords?.coordType === 'polar'
      ? pipe(input, braunConfig, braunChromeStyles, braunPolarStyles)
      : pipe(input, braunConfig, braunChromeStyles),
};
