import type { ThemeOverrides } from '@graphysdk/react';
import type { SpecInput } from '@graphysdk/viz-engine';

/**
 * A baked-in chart look: the spec fragments that restyle a chart, the renderer theme tokens that go
 * with them, and the series colors that replace whatever palette the spec chose.
 *
 * A style is engine config and data only — applying one never changes what a chart draws, just how
 * it is painted.
 */
export interface ChartStyle {
  /** One line shown beside the style's name wherever a model is taught the vocabulary. */
  description: string;
  /** Renderer theme tokens — text colors, legend chrome, font families. */
  themeOverrides: ThemeOverrides;
  /** Ordered series colors. They replace the palette the spec chose, so one name gives one look. */
  seriesColors: readonly string[];
  /** Stylesheet URL for the style's typefaces, for the host page to load. */
  fontsUrl?: string;
  /** Folds the style's config and stylesheets onto an authored spec. */
  apply: (input: SpecInput) => SpecInput;
}
