import { describe, expect, it } from 'vitest';

import { findChartIssues } from './chart-issues';

function createPageSpec(chartProps: Record<string, unknown>, state?: Record<string, unknown>) {
  return {
    root: 'main',
    elements: {
      main: { type: 'Stack', props: {}, children: ['revenueChart'] },
      revenueChart: { type: 'GraphyChart', props: chartProps, children: [] },
    },
    ...(state === undefined ? {} : { state }),
  };
}

const ROWS = [
  { month: 'Jan', revenue: 120 },
  { month: 'Feb', revenue: 145 },
];

const CLEAN_SPEC = {
  mapping: { x: 'month', y: 'revenue' },
  layers: [{ type: 'layer', geom: 'line' }],
  scales: [
    { type: 'scale', scaledAesthetic: 'x', scaleType: 'inferred' },
    { type: 'scale', scaledAesthetic: 'y', scaleType: 'continuous' },
  ],
};

describe('findChartIssues', () => {
  it('stays silent on a chart the compiler accepts', () => {
    expect(findChartIssues(createPageSpec({ rows: ROWS, spec: CLEAN_SPEC }))).toEqual([]);
  });

  it('names the element when a chart does not compile', () => {
    const broken = {
      rows: ROWS,
      spec: { ...CLEAN_SPEC, mapping: { x: 'month', y: 'missingColumn' } },
    };

    const issues = findChartIssues(createPageSpec(broken));

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]?.severity).toBe('error');
    expect(issues[0]?.message).toContain('revenueChart');
  });

  it('judges a $state-bound chart against the rows it will draw', () => {
    const bound = { rows: { $state: '/revenueData' }, spec: CLEAN_SPEC };

    expect(findChartIssues(createPageSpec(bound, { revenueData: ROWS }))).toEqual([]);
  });

  it('skips a chart whose rows never resolved, which is a page problem not a chart one', () => {
    const dangling = { rows: { $state: '/nowhere' }, spec: CLEAN_SPEC };

    expect(findChartIssues(createPageSpec(dangling))).toEqual([]);
  });

  it('flags a color mapped to a fixed value as a paint workaround', () => {
    const hardcoded = {
      rows: ROWS,
      spec: { ...CLEAN_SPEC, mapping: { ...CLEAN_SPEC.mapping, color: { value: '#FF0000' } } },
    };

    const issues = findChartIssues(createPageSpec(hardcoded));

    expect(issues.some((issue) => issue.severity === 'warning' && issue.message.includes('fixed value'))).toBe(true);
  });

  it('flags palette overrides pinning slots to fixed colors', () => {
    const pinned = {
      rows: ROWS,
      spec: {
        ...CLEAN_SPEC,
        mapping: { ...CLEAN_SPEC.mapping, color: 'month' },
        scales: [
          ...CLEAN_SPEC.scales,
          { type: 'scale', scaledAesthetic: 'color', scaleType: 'palette', overrides: { 1: { hex: '#FF0000' } } },
        ],
      },
    };

    const issues = findChartIssues(createPageSpec(pinned));

    expect(issues.some((issue) => issue.message.includes('overrides'))).toBe(true);
  });
});
