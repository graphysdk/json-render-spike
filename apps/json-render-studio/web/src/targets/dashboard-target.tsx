import type { GraphySpec } from '@graphysdk/json-render';
import { Renderer, validateGraphySpec } from '@graphysdk/json-render';

import { selectRenderableCharts } from './select-renderable-charts';
import type { StudioIssue, StudioTarget } from './studio-target';

const EMPTY_DASHBOARD: GraphySpec = { document: {}, datasets: {}, charts: [] };

/** Fills in the fields a half-streamed spec has not reached yet. */
function asDashboard(spec: Record<string, unknown>): GraphySpec {
  return { ...EMPTY_DASHBOARD, ...(spec as Partial<GraphySpec>) };
}

export const dashboardTarget: StudioTarget = {
  id: 'dashboard',

  examples: [
    'Quarterly revenue for a SaaS company: a trend line by month, a donut of revenue by plan, and a stacked bar of new versus churned accounts by region',
    'Compare rainfall and temperature across 12 months for three cities — bars for rainfall and a line for temperature on a secondary axis',
    'A horizontal bar chart ranking the 10 most-visited countries, plus a scatter of visitors against tourism revenue',
  ],

  isEmpty: (spec) => asDashboard(spec).charts.length === 0,

  // The package paints charts and nothing else, so the grid they land in is the studio's to choose.
  renderPreview: (spec, streaming) => {
    const dashboard = asDashboard(spec);
    return (
      <div className="studio-dashboard">
        <Renderer spec={{ ...dashboard, charts: selectRenderableCharts(dashboard, streaming) }} />
      </div>
    );
  },

  findIssues: (spec): StudioIssue[] =>
    validateGraphySpec(asDashboard(spec)).issues.map((issue) => ({
      severity: issue.severity,
      message: issue.chartId === undefined ? issue.message : `${issue.chartId}: ${issue.message}`,
    })),
};
