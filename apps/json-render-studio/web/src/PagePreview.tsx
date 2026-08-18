import { createStateStore, defineRegistry, JSONUIProvider, Renderer } from '@json-render/react';
import { shadcnComponents } from '@json-render/shadcn';
import { type ReactElement, useEffect, useMemo, useRef, useState } from 'react';

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
 * The store is controlled: streamed `/state` patches are pushed into it as they land, so a
 * `$state`-bound table or chart fills with rows mid-stream — a model typically emits a chart's
 * element in one patch and then streams its dataset row by row, and the growing rows are the whole
 * partial-rendering show. An uncontrolled provider would seed from the first flush's still-empty
 * state and stay blank until a settle remount.
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

  const [store] = useState(() => createStateStore());
  // The patch compiler mutates state values in place, so reference equality can't spot a change —
  // fingerprint each top-level entry and push a fresh clone through the store when it moved. The
  // store only notifies subscribers for entries this actually updates.
  const stateFingerprintsRef = useRef<Record<string, string>>({});
  useEffect(() => {
    const streamedState = asElementTree(spec).state ?? {};
    const fingerprints = stateFingerprintsRef.current;
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(streamedState)) {
      const fingerprint = JSON.stringify(value);
      if (fingerprints[key] !== fingerprint) {
        fingerprints[key] = fingerprint;
        updates[`/${key}`] = structuredClone(value);
      }
    }
    for (const key of Object.keys(fingerprints)) {
      if (!(key in streamedState)) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- the fingerprint cache mirrors the streamed state's own keys
        delete fingerprints[key];
        updates[`/${key}`] = undefined;
      }
    }
    if (Object.keys(updates).length > 0) {
      store.update(updates);
    }
    // `spec` is a fresh object on every stream flush, so this re-runs exactly per flush even though
    // the compiler mutates the nested state in place.
  }, [spec, store]);

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
      <JSONUIProvider key={tree.root} registry={registry} store={store}>
        <Renderer spec={tree} registry={registry} loading={isStreaming} />
      </JSONUIProvider>
    </>
  );
};
