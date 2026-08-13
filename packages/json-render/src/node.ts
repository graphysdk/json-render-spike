import { renderGraphToPng, type RenderOptions } from '@graphysdk/node-renderer';

import type { GraphyChart, GraphySpec } from './spec.types';
import { resolveChartInput } from './to-spec-input';

/** A chart rendered to a PNG buffer, paired with the chart it came from. */
export interface RenderedChart {
  chartId: string;
  png: Buffer;
}

export type RenderSpecOptions = Omit<RenderOptions, 'colorScheme'> & {
  /** Overrides `spec.document.colorScheme`. */
  colorScheme?: RenderOptions['colorScheme'];
};

/**
 * Renders one chart of a spec to a PNG buffer.
 *
 * Throws when the chart names a dataset the spec does not carry, or when the projected spec fails
 * to compile — both are authoring errors a repair loop should see rather than a blank image.
 */
export async function renderChartToPng(
  spec: GraphySpec,
  chart: GraphyChart,
  options: RenderSpecOptions
): Promise<Buffer> {
  const renderInput = resolveChartInput(spec, chart);
  if (renderInput === undefined) {
    throw new Error(`Chart "${chart.id}" references dataset "${chart.datasetId}", which the spec does not define.`);
  }

  return renderGraphToPng(renderInput, { ...options, colorScheme: options.colorScheme ?? spec.document.colorScheme });
}

/** Renders every chart in a spec to a PNG buffer, in spec order. */
export async function renderSpecToPngs(spec: GraphySpec, options: RenderSpecOptions): Promise<RenderedChart[]> {
  const rendered: RenderedChart[] = [];

  for (const chart of spec.charts) {
    rendered.push({ chartId: chart.id, png: await renderChartToPng(spec, chart, options) });
  }

  return rendered;
}
