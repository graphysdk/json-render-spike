import type { GraphyChartComponentProps } from '../props-schema';

export function createLineChartProps(): GraphyChartComponentProps {
  return {
    title: 'Revenue by month',
    rows: [
      { month: 'Jan', region: 'EMEA', revenue: 120 },
      { month: 'Jan', region: 'AMER', revenue: 90 },
      { month: 'Feb', region: 'EMEA', revenue: 145 },
      // A model routinely omits a column on a row rather than writing null.
      { month: 'Feb', revenue: 110 },
    ],
    mapping: { x: 'month', y: 'revenue', color: 'region' },
    layers: [{ geom: 'line' }],
    scales: [
      { aesthetic: 'x', scaleType: 'inferred' },
      { aesthetic: 'y', scaleType: 'continuous' },
      { aesthetic: 'color', scaleType: 'palette' },
    ],
  };
}
