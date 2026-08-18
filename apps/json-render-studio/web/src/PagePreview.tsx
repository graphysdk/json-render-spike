import { defineRegistry, JSONUIProvider, Renderer } from '@json-render/react';
import { shadcnComponents } from '@json-render/shadcn';
import { type ReactElement, useMemo } from 'react';

import {
  type ChartStyleName,
  chartStyles,
  GraphyChartComponent,
  type GraphyChartComponentRenderProps,
} from '@graphysdk/json-render';

import { componentCatalog } from '../../shared/component-catalog';

import { asElementTree } from './page-spec';

// Under Auto the style arrives on the generated props, so which typeface a page needs is unknowable
// up front — load every registered style's stylesheet once; there are few and they are cheap.
const STYLE_FONT_URLS = [
  ...new Set(Object.values(chartStyles).flatMap((registeredStyle) => registeredStyle.fontsUrl ?? [])),
];

/**
 * A generated page owns state: an Input writes to it, a Table reads its rows back out of it.
 * `JSONUIProvider` supplies that store and the visibility, action and validation contexts every
 * element resolves against — without it `<Renderer>` throws on the first element it paints.
 *
 * `initialState` is read once, at mount, but a model interleaves `/state` patches with `/elements`
 * ones — so the provider mounted on the first flush would seed from a state that is still empty, and
 * every `$state`-bound table and chart would render blank. Keying on the streaming flag remounts it
 * once the stream settles, against the state the model actually finished with. A page is not
 * interactive until it is complete, so nothing a user did is lost in that remount.
 */
export const PagePreview = ({
  spec,
  isStreaming,
  chartStyle,
}: {
  spec: Record<string, unknown>;
  isStreaming: boolean;
  chartStyle?: ChartStyleName;
}): ReactElement => {
  const tree = asElementTree(spec);

  // The paint half of the catalog: shadcn's own implementations, plus ours for `GraphyChart`. The
  // chosen chart style is a render-time default, not part of the generated spec, so it rides in on
  // a wrapper closed over the selection — a `style` the model authored still wins inside the chart.
  const { registry } = useMemo(
    () =>
      defineRegistry(componentCatalog, {
        components: {
          ...shadcnComponents,
          GraphyChart: (renderProps: GraphyChartComponentRenderProps) => (
            <GraphyChartComponent {...renderProps} chartStyle={chartStyle} />
          ),
        },
      }),
    [chartStyle]
  );

  return (
    <>
      {STYLE_FONT_URLS.map((fontsUrl) => (
        <link key={fontsUrl} rel="stylesheet" precedence="default" href={fontsUrl} />
      ))}
      <JSONUIProvider
        key={`${tree.root}:${isStreaming ? 'streaming' : 'settled'}`}
        registry={registry}
        initialState={tree.state ?? {}}
      >
        <Renderer spec={tree} registry={registry} loading={isStreaming} />
      </JSONUIProvider>
    </>
  );
};
