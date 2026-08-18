import type { GraphSlots } from '@graphysdk/react';

import type { ChartStyleName } from './chart-styles';
import { neoBrutalistSlots } from './neo-brutalist-slots';

/**
 * The renderer-slot half of the styles that carry one, keyed by style name.
 *
 * Kept apart from the `chartStyles` registry so the `/server` entry stays free of React — a style's
 * data is server-safe, its slot components are not. The chart component looks the active style up
 * here and hands the slots to the renderer.
 */
export const chartStyleSlots: Partial<Record<ChartStyleName, GraphSlots>> = {
  'neo-brutalist': neoBrutalistSlots,
};
