import type { ReactElement, ReactNode } from 'react';

import { GraphProvider, GraphRenderer, type GraphSizing } from '@graphysdk/react';
import type { ColorScheme, CustomPalettesInput, Locale, Plugin } from '@graphysdk/viz-engine';

import type { GraphyChart, GraphySpec } from './spec.types';
import { resolveChartInput } from './to-spec-input';

export interface RendererProps extends ChartPaintProps {
  spec: GraphySpec;
}

export interface ChartRendererProps extends ChartPaintProps {
  spec: GraphySpec;
  chart: GraphyChart;
}

/** What painting a chart takes, beyond the chart itself. */
interface ChartPaintProps {
  /**
   * Custom geoms, stats and transforms available to every chart. Pair one with a catalog entry of
   * the same name and a model can author it like a built-in.
   */
  plugins?: readonly Plugin[];
  /** Overrides `spec.document.colorScheme`. */
  colorScheme?: ColorScheme;
  /** Height of a chart's box, in pixels. Defaults to 320. */
  height?: number;
  /**
   * How a chart claims space in its box. Defaults to filling it, which the pixel height above is
   * there to guarantee — pass a `fixed` sizing where a caller sizes the box some other way.
   */
  sizing?: GraphSizing;
  formattingLocale?: Locale;
  customPalettes?: CustomPalettesInput;
  /** Rendered in place of a chart whose `datasetId` names a dataset the spec does not carry. */
  renderMissingDataset?: (chart: GraphyChart) => ReactNode;
}

const DEFAULT_CHART_HEIGHT = 320;

/**
 * Paints every chart in a {@link GraphySpec}, in the order the spec lists them.
 *
 * Deliberately no container: the charts come out as siblings, so whatever the caller wraps them in
 * lays them out — a `display: grid` parent makes each chart a grid item, a flex parent a flex item.
 * Placement is a page's grammar rather than a chart spec's, and a caller who has one says it better
 * than a `columns`/`x`/`y` field here could. Reach for {@link ChartRenderer} to place charts
 * individually.
 */
export const Renderer = ({ spec, ...paint }: RendererProps): ReactElement => (
  <>
    {spec.charts.map((chart) => (
      <ChartRenderer key={chart.id} spec={spec} chart={chart} {...paint} />
    ))}
  </>
);

/**
 * One chart of a spec, in a box of its own height.
 *
 * No error boundary here: `<GraphProvider>` already funnels both a non-throwing compile failure and
 * a render throw into its own boundary, so a chart that fails shows the error in its box and its
 * neighbours keep rendering.
 */
export const ChartRenderer = ({
  spec,
  chart,
  plugins,
  colorScheme,
  height = DEFAULT_CHART_HEIGHT,
  sizing,
  formattingLocale,
  customPalettes,
  renderMissingDataset,
}: ChartRendererProps): ReactNode => {
  const renderInput = resolveChartInput(spec, chart);

  if (renderInput === undefined) {
    return renderMissingDataset?.(chart) ?? null;
  }

  return (
    <div style={{ height, width: '100%' }}>
      <GraphProvider
        input={renderInput.input}
        data={renderInput.data}
        plugins={plugins}
        colorScheme={colorScheme ?? spec.document.colorScheme}
        formattingLocale={formattingLocale}
        customPalettes={customPalettes}
      >
        <GraphRenderer sizing={sizing} />
      </GraphProvider>
    </div>
  );
};
