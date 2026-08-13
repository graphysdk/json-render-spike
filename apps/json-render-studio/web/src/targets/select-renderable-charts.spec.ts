import { describe, expect, it } from 'vitest';

import type { GraphySpec } from '@graphysdk/json-render/server';

import { selectRenderableCharts } from './select-renderable-charts';

function createSpec(charts: GraphySpec['charts'], datasetIds: string[]): GraphySpec {
  return {
    document: {},
    datasets: Object.fromEntries(
      datasetIds.map((id) => [
        id,
        { columns: [{ key: 'month' }, { key: 'revenue' }], rows: [{ month: 'Jan', revenue: 1 }] },
      ])
    ),
    charts,
  };
}

const completeChart: GraphySpec['charts'][number] = {
  id: 'trend',
  datasetId: 'sales',
  mapping: { x: 'month', y: 'revenue' },
  layers: [{ geom: 'line' }],
  scales: [
    { aesthetic: 'x', scaleType: 'inferred' },
    { aesthetic: 'y', scaleType: 'continuous' },
  ],
};

describe('selectRenderableCharts', () => {
  it('holds back a chart whose dataset has not streamed in yet', () => {
    const spec = createSpec([completeChart, { ...completeChart, id: 'pending', datasetId: 'not-yet' }], ['sales']);

    expect(selectRenderableCharts(spec, true).map((chart) => chart.id)).toEqual(['trend']);
  });

  it('holds back a chart still missing a position scale', () => {
    const spec = createSpec([completeChart, { ...completeChart, id: 'half-built', scales: [] }], ['sales']);

    expect(selectRenderableCharts(spec, true).map((chart) => chart.id)).toEqual(['trend']);
  });

  it('shows every chart once the stream ends, so a real failure stays visible', () => {
    const spec = createSpec([completeChart, { ...completeChart, id: 'broken', scales: [] }], ['sales']);

    expect(selectRenderableCharts(spec, false).map((chart) => chart.id)).toEqual(['trend', 'broken']);
  });
});
