import type { GraphySpec } from '../spec.types';

/**
 * The shape a model actually emits: catalog fields present but `null` where it had nothing to say,
 * a reshaped wide dataset, a combo chart, and a polar chart — enough to exercise every projection
 * rule at once.
 */
export function createDashboardSpec(): GraphySpec {
  return {
    document: { title: 'Q3 revenue review', colorScheme: 'light' },
    datasets: {
      sales: {
        columns: [{ key: 'month' }, { key: 'region' }, { key: 'revenue' }],
        rows: [
          { month: 'Jan', region: 'EMEA', revenue: 120 },
          { month: 'Jan', region: 'AMER', revenue: 90 },
          { month: 'Feb', region: 'EMEA', revenue: 140 },
          { month: 'Feb', region: 'AMER', revenue: 110 },
        ],
      },
      wide: {
        columns: [{ key: 'month' }, { key: 'plan' }, { key: 'actual' }],
        rows: [
          { month: 'Jan', plan: 100, actual: 120 },
          { month: 'Feb', plan: 130, actual: 140 },
        ],
      },
    },
    charts: [
      {
        id: 'revenue-trend',
        datasetId: 'sales',
        title: 'Revenue by month',
        mapping: { x: 'month', y: 'revenue', color: 'region' },
        layers: [{ geom: 'line', params: { interpolate: 'linear', missingValues: null } }],
        scales: [
          { aesthetic: 'x', scaleType: 'inferred' },
          { aesthetic: 'y', scaleType: 'continuous', options: { zero: true, nice: true, domainMax: null } },
          { aesthetic: 'color', scaleType: 'palette' },
        ],
      },
      {
        id: 'region-share',
        datasetId: 'sales',
        title: 'Share by region',
        mapping: { x: 'region', y: 'revenue', color: 'region' },
        layers: [{ geom: 'bar', params: { width: 1 }, stat: 'sum' }],
        scales: [
          { aesthetic: 'x', scaleType: 'discrete' },
          { aesthetic: 'y', scaleType: 'continuous' },
          { aesthetic: 'color', scaleType: 'palette' },
        ],
        coord: { coordType: 'polar', params: { theta: 'y', innerRadius: 0.5, startAngle: null } },
      },
      {
        id: 'plan-vs-actual',
        datasetId: 'wide',
        title: 'Plan vs actual',
        mapping: { x: 'month', y: 'amount', color: 'metric' },
        layers: [{ geom: 'bar', position: 'dodge', params: { width: null } }],
        scales: [
          { aesthetic: 'x', scaleType: 'discrete' },
          { aesthetic: 'y', scaleType: 'continuous', options: { zero: true } },
          { aesthetic: 'color', scaleType: 'palette' },
        ],
        transforms: [
          {
            transformType: 'reshape',
            options: { reshape: ['plan', 'actual'], keyName: 'metric', valueName: 'amount', keep: null },
          },
        ],
      },
    ],
  };
}
