import type { Data } from '@graphysdk/viz-engine';

import type { GraphyChart } from '../chart.types';

export const SALES_DATA: Data = {
  columns: [{ key: 'month' }, { key: 'region' }, { key: 'revenue' }],
  rows: [
    { month: 'Jan', region: 'EMEA', revenue: 120 },
    { month: 'Jan', region: 'AMER', revenue: 90 },
    { month: 'Feb', region: 'EMEA', revenue: 140 },
    { month: 'Feb', region: 'AMER', revenue: 110 },
  ],
};

export const WIDE_DATA: Data = {
  columns: [{ key: 'month' }, { key: 'plan' }, { key: 'actual' }],
  rows: [
    { month: 'Jan', plan: 100, actual: 120 },
    { month: 'Feb', plan: 130, actual: 140 },
  ],
};

/** Scale options both flattened and nested, and a layer that authored params. */
export function createLineChart(): GraphyChart {
  return {
    title: 'Revenue by month',
    mapping: { x: 'month', y: 'revenue', color: 'region' },
    layers: [{ geom: 'line', params: { interpolate: 'linear' } }],
    scales: [
      { aesthetic: 'x', scaleType: 'inferred' },
      { aesthetic: 'y', scaleType: 'continuous', options: { zero: true, nice: true } },
      { aesthetic: 'color', scaleType: 'palette' },
    ],
  };
}

/** A coord carrying params, and a layer with a stat. */
export function createPolarChart(): GraphyChart {
  return {
    title: 'Share by region',
    mapping: { x: 'region', y: 'revenue', color: 'region' },
    layers: [{ geom: 'bar', params: { width: 1 }, stat: 'sum' }],
    scales: [
      { aesthetic: 'x', scaleType: 'discrete' },
      { aesthetic: 'y', scaleType: 'continuous' },
      { aesthetic: 'color', scaleType: 'palette' },
    ],
    coord: { coordType: 'polar', params: { theta: 'y', innerRadius: 0.5 } },
  };
}

/** A transform, and a layer that authored no params at all. */
export function createReshapedChart(): GraphyChart {
  return {
    title: 'Plan vs actual',
    mapping: { x: 'month', y: 'amount', color: 'metric' },
    layers: [{ geom: 'bar', position: 'dodge' }],
    scales: [
      { aesthetic: 'x', scaleType: 'discrete' },
      { aesthetic: 'y', scaleType: 'continuous', options: { zero: true } },
      { aesthetic: 'color', scaleType: 'palette' },
    ],
    transforms: [
      {
        transformType: 'reshape',
        options: { reshape: ['plan', 'actual'], keyName: 'metric', valueName: 'amount' },
      },
    ],
  };
}
