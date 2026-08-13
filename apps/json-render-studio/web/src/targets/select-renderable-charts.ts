import type { GraphyChart, GraphySpec } from '@graphysdk/json-render/server';
import { validateGraphySpec } from '@graphysdk/json-render/server';

/**
 * The charts worth painting mid-stream.
 *
 * A chart lands whole — a truncated JSONL line never parses, so a patch either applies or does not —
 * but a chart can still arrive before the dataset it names, or with the model yet to append its
 * scales. Those compile-fail, and a wall of error boundaries mid-generation reads as breakage rather
 * than progress. Once the stream ends the filter lifts: a chart that is still broken is a real
 * result, and hiding it would be lying about what the model produced.
 */
export function selectRenderableCharts(spec: GraphySpec, streaming: boolean): GraphyChart[] {
  if (!streaming) {
    return spec.charts;
  }

  const brokenChartIds = new Set(
    validateGraphySpec(spec)
      .issues.filter((issue) => issue.severity === 'error' && issue.chartId !== undefined)
      .map((issue) => issue.chartId)
  );

  return spec.charts.filter((chart) => !brokenChartIds.has(chart.id));
}
