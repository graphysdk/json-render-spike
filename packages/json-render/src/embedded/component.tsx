import type { ReactElement } from 'react';

import { GraphProvider, GraphRenderer } from '@graphysdk/react';
import type { ColorScheme, CustomPalettesInput, Locale, Plugin } from '@graphysdk/viz-engine';

import { applyChartStyle, type ChartStyleName, readChartStyleName } from '../styles/chart-styles';

import type { GraphyChartComponentProps } from './props-schema';
import { resolveEmbeddedChartInput } from './resolve-input';

export interface GraphyChartComponentRenderProps {
  props: GraphyChartComponentProps;
  plugins?: readonly Plugin[];
  colorScheme?: ColorScheme;
  formattingLocale?: Locale;
  customPalettes?: CustomPalettesInput;
  /** Host-chosen style override. When set it wins over a `style` authored on the props. */
  chartStyle?: ChartStyleName;
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
  chartStyle,
}: GraphyChartComponentRenderProps): ReactElement => {
  const { input, data } = resolveEmbeddedChartInput(props);
  const styleName = chartStyle ?? readChartStyleName(props.style);
  const styled = styleName === undefined ? undefined : applyChartStyle(input, styleName);

  return (
    <div style={{ height: props.height ?? DEFAULT_HEIGHT, width: '100%' }}>
      <GraphProvider
        input={styled?.input ?? input}
        data={data}
        plugins={plugins}
        colorScheme={colorScheme}
        formattingLocale={formattingLocale}
        customPalettes={styled === undefined ? customPalettes : { ...customPalettes, ...styled.customPalettes }}
        themeOverrides={styled?.themeOverrides}
      >
        <GraphRenderer />
      </GraphProvider>
    </div>
  );
};
