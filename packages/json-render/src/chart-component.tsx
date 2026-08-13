import type { ReactElement } from 'react';

import { GraphProvider, GraphRenderer } from '@graphysdk/react';
import type { ColorScheme, CustomPalettesInput, Locale, Plugin } from '@graphysdk/viz-engine';

import { type GraphyChartComponentProps, resolveEmbeddedChartInput } from './embedded-chart';

export interface GraphyChartComponentRenderProps {
  props: GraphyChartComponentProps;
  plugins?: readonly Plugin[];
  colorScheme?: ColorScheme;
  formattingLocale?: Locale;
  customPalettes?: CustomPalettesInput;
}

const DEFAULT_HEIGHT = 320;

/**
 * `GraphyChart` for an element-tree registry.
 *
 * The `{ props }` argument is the shape `@json-render/react`'s `defineRegistry` hands a component,
 * so this drops straight into a registry beside shadcn's. A chart sizes to its cell, which a page
 * layout rarely constrains vertically — hence the pixel height in the props.
 */
export const GraphyChartComponent = ({
  props,
  plugins,
  colorScheme,
  formattingLocale,
  customPalettes,
}: GraphyChartComponentRenderProps): ReactElement => {
  const { input, data } = resolveEmbeddedChartInput(props);

  return (
    <div style={{ height: props.height ?? DEFAULT_HEIGHT, width: '100%' }}>
      <GraphProvider
        input={input}
        data={data}
        plugins={plugins}
        colorScheme={colorScheme}
        formattingLocale={formattingLocale}
        customPalettes={customPalettes}
      >
        <GraphRenderer />
      </GraphProvider>
    </div>
  );
};
