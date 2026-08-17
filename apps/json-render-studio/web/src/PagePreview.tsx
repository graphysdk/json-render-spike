import { defineRegistry, JSONUIProvider, Renderer } from '@json-render/react';
import { shadcnComponents } from '@json-render/shadcn';
import type { ReactElement } from 'react';

import { GraphyChartComponent } from '@graphysdk/json-render';

import { componentCatalog } from '../../shared/component-catalog';

import { asElementTree } from './page-spec';

/**
 * The paint half of the catalog.
 *
 * One entry per catalog definition — shadcn's own implementations, plus ours for `GraphyChart`.
 * `GraphyChartComponent` takes the same `{ props }` a registry hands any component, so the chart
 * needs no adapter here.
 */
const { registry } = defineRegistry(componentCatalog, {
  components: {
    ...shadcnComponents,
    GraphyChart: GraphyChartComponent,
  },
});

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
}: {
  spec: Record<string, unknown>;
  isStreaming: boolean;
}): ReactElement => {
  const tree = asElementTree(spec);

  return (
    <JSONUIProvider
      key={`${tree.root}:${isStreaming ? 'streaming' : 'settled'}`}
      registry={registry}
      initialState={tree.state ?? {}}
    >
      <Renderer spec={tree} registry={registry} loading={isStreaming} />
    </JSONUIProvider>
  );
};
