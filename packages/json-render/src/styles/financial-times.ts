import type { ThemeOverrides } from '@graphysdk/react';
import { config, pipe, style, styles } from '@graphysdk/viz-engine';

import type { ChartStyle } from './chart-style.types';

// The FT house look: salmon paper, claret data with Oxford blue as the counterpart, and only
// horizontal structure — a solid top rule, a heavier bottom rule, y gridlines on, no side borders.
const FT_COLORS = {
  paper: '#FFF1E5', // FT Pink — the signature salmon paper
  claret: '#990F3D', // emphasised headline accent
  claretBar: '#A8324A', // the wine-red used for solid marks
  forecastBar: '#E2A6BB', // paler claret tint
  oxford: '#0F5499', // FT Oxford blue — the counterpart series
  steel: '#5D7C95', // muted steel blue
  steelLight: '#C3DDF0', // pale blue
  black: '#33302E', // primary text
  slate: '#66605C', // secondary text
  rule: '#E4D5C5', // warm rule shared by gridlines, tick marks and panel borders
} as const;

const FT_FONT_FAMILY = 'Figtree, "Helvetica Neue", Arial, sans-serif';

const themeOverrides: ThemeOverrides = {
  textPrimary: FT_COLORS.black,
  textSecondary: FT_COLORS.slate,
  legendBackground: 'transparent',
  legendBorderColor: 'transparent',
  fontFamilyDefault: FT_FONT_FAMILY,
  fontFamilyHeading: FT_FONT_FAMILY,
};

const financialTimesConfig = config({
  layout: { padding: 32, gaps: { header: 32, topLegend: 32 } },
  axes: {
    x: { position: 'bottom', grid: { isVisible: false } },
    y: { position: 'left', grid: { isVisible: true } },
  },
});

// The frame: the paper, warm solid rules, and a panel ruled top and bottom only. `gridLineColor`
// is re-grounded so gridlines and panel rules share the warm sand tone on the salmon paper.
const financialTimesChromeStyles = styles({
  tokens: {
    geomColor: FT_COLORS.claretBar,
    pointBorderColor: FT_COLORS.paper,
    gridLineColor: FT_COLORS.rule,
  },
  defaults: [
    style.graph({ background: FT_COLORS.paper }),
    style.gridLine({ lineType: 'solid' }),
    style.tickLine({ color: FT_COLORS.rule }),
    style.panelBorder({ lineType: 'solid' }),
    style.panelBorder.bottom({ strokeWidth: 1.5 }),
    style.panelBorder.left({ strokeWidth: 0 }),
    style.panelBorder.right({ strokeWidth: 0 }),
    style.geom.bar({ borderRadius: 'none' }),
    style.geom.line({ strokeWidth: 2.5 }),
  ],
});

// Wedges cut square with paper-coloured gaps between them.
const financialTimesPolarStyles = styles({
  defaults: [style.geom.bar({ borderColor: FT_COLORS.paper, borderWidth: 2 })],
});

export const financialTimesChartStyle: ChartStyle = {
  description: 'Financial Times editorial: salmon paper, claret and Oxford blue, ruled top and bottom',
  themeOverrides,
  panelBackground: FT_COLORS.paper,
  seriesColors: [
    FT_COLORS.claretBar,
    FT_COLORS.oxford,
    FT_COLORS.steel,
    FT_COLORS.forecastBar,
    FT_COLORS.steelLight,
    FT_COLORS.claret,
  ],
  fontsUrl: 'https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&display=swap',
  apply: (input) =>
    input.coords?.coordType === 'polar'
      ? pipe(input, financialTimesConfig, financialTimesChromeStyles, financialTimesPolarStyles)
      : pipe(input, financialTimesConfig, financialTimesChromeStyles),
};
