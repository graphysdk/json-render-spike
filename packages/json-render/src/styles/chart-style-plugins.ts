import type { Plugin } from '@graphysdk/viz-engine';

import type { ChartStyleName } from './chart-styles';
import { mexicoPlugins } from './mexico-plugins';

/**
 * The React half of the styles that carry one: geom-renderer plugins keyed by style name.
 *
 * Kept apart from the `chartStyles` registry so the `/server` entry stays free of React — a style's
 * data (theme, stylesheets, series colors) is server-safe, its renderers are not. The chart
 * component looks the active style up here and hands the plugins to the provider.
 */
export const chartStylePlugins: Partial<Record<ChartStyleName, readonly Plugin[]>> = {
  'mexico-68': mexicoPlugins,
};
