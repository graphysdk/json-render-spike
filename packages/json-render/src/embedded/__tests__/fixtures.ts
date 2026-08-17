import type { GraphyChartComponentProps } from '../props-schema';

export function createLineChartProps(): GraphyChartComponentProps {
  return {
    rows: [
      { month: 'Jan', region: 'EMEA', revenue: 120 },
      { month: 'Jan', region: 'AMER', revenue: 90 },
      { month: 'Feb', region: 'EMEA', revenue: 145 },
      // A model routinely omits a column on a row rather than writing null.
      { month: 'Feb', revenue: 110 },
    ],
    spec: {
      mapping: { x: 'month', y: 'revenue', color: 'region' },
      layers: [{ type: 'layer', geom: 'line' }],
      scales: [
        { type: 'scale', scaledAesthetic: 'x', scaleType: 'inferred' },
        { type: 'scale', scaledAesthetic: 'y', scaleType: 'continuous' },
        { type: 'scale', scaledAesthetic: 'color', scaleType: 'palette' },
      ],
      config: { content: { title: 'Revenue by month' } },
    },
  };
}
