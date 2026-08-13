import type { Spec } from '@json-render/core';
import { validateSpec } from '@json-render/core';
import { defineRegistry, JSONUIProvider, Renderer } from '@json-render/react';
import { shadcnComponents } from '@json-render/shadcn';
import type { ReactElement } from 'react';

import { GraphyChartComponent } from '@graphysdk/json-render';

import { webappCatalog } from '../../../shared/webapp-catalog';

import type { StudioIssue, StudioTarget } from './studio-target';

/**
 * The paint half of the webapp catalog.
 *
 * One entry per catalog definition — shadcn's own implementations, plus ours for `GraphyChart`.
 * `GraphyChartComponent` takes the same `{ props }` a registry hands any component, so the chart
 * needs no adapter here.
 */
const { registry } = defineRegistry(webappCatalog, {
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
const PagePreview = ({ spec, isStreaming }: { spec: Spec; isStreaming: boolean }): ReactElement => (
  <JSONUIProvider
    key={`${spec.root}:${isStreaming ? 'streaming' : 'settled'}`}
    registry={registry}
    initialState={spec.state ?? {}}
  >
    <Renderer spec={spec} registry={registry} loading={isStreaming} />
  </JSONUIProvider>
);

const EMPTY_TREE: Spec = { root: '', elements: {} };

/**
 * Fills in the fields a half-streamed spec has not reached yet.
 *
 * `/root` is the first patch a model emits and `/elements` the second, so for one flush the spec has
 * a root and no elements — and `validateSpec` reads `elements[root]` without guarding.
 */
function asElementTree(spec: Record<string, unknown>): Spec {
  return { ...EMPTY_TREE, ...(spec as Partial<Spec>) };
}

export const webappTarget: StudioTarget = {
  id: 'webapp',

  examples: [
    'A pricing page for a developer tool with three tiers, a feature comparison table, and a FAQ accordion',
    'An analytics dashboard for a bike-share service: KPI cards for rides and revenue, a line chart of daily rides, and a table of the busiest stations',
    'A signup form with email, password and a plan select, validating on blur, and a summary card that updates as the form is filled',
  ],

  isEmpty: (spec) => {
    const tree = asElementTree(spec);
    return !tree.root || Object.keys(tree.elements ?? {}).length === 0;
  },

  renderPreview: (spec, streaming) => <PagePreview spec={asElementTree(spec)} isStreaming={streaming} />,

  findIssues: (spec): StudioIssue[] =>
    validateSpec(asElementTree(spec)).issues.map((issue) => ({
      severity: issue.severity === 'error' ? 'error' : 'warning',
      message: issue.message,
    })),
};
