import type { ReactElement } from 'react';

import { GraphProvider, GraphRenderer } from '@graphysdk/react';
import type { ColorScheme, CustomPalettesInput, Locale, Plugin } from '@graphysdk/viz-engine';

import { chartStylePlugins } from '../styles/chart-style-plugins';
import { chartStyleSlots } from '../styles/chart-style-slots';
import { applyChartStyle, type ChartStyleName, chartStyles, readChartStyleName } from '../styles/chart-styles';

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
  /** The host's streaming flag. While true the chart holds a placeholder instead of compiling half-built props. */
  // eslint-disable-next-line react/boolean-prop-naming -- mirrors the host registry's ComponentContext field, which a wrapper spreads through verbatim
  loading?: boolean;
}

const DEFAULT_HEIGHT = 320;

const PLACEHOLDER_BARS = [
  { x: 2, height: 14, delay: '0s' },
  { x: 18, height: 22, delay: '0.25s' },
  { x: 34, height: 28, delay: '0.5s' },
];

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
  loading,
}: GraphyChartComponentRenderProps): ReactElement => {
  const styleName = chartStyle ?? readChartStyleName(props.style);
  const box = { height: props.height ?? DEFAULT_HEIGHT, width: '100%' };

  // While the host is still streaming, the props are half-built by definition — mounting the
  // provider would compile them and paint the failures. Hold an intentional placeholder instead,
  // already wearing the style's plate color when one is known.
  if (loading === true) {
    const activeStyle = styleName === undefined ? undefined : chartStyles[styleName];
    return (
      <div style={box}>
        <ChartPlaceholder
          background={activeStyle?.panelBackground}
          glyphColor={activeStyle?.themeOverrides.textSecondary}
        />
      </div>
    );
  }

  const { input, data } = resolveEmbeddedChartInput(props);
  const styled = styleName === undefined ? undefined : applyChartStyle(input, styleName);
  const stylePlugins = styleName === undefined ? undefined : chartStylePlugins[styleName];

  return (
    <div style={box}>
      {/* The provider freezes plugins at mount, so a style flip must remount to swap renderers. */}
      <GraphProvider
        key={styleName ?? 'unstyled'}
        input={styled?.input ?? input}
        data={data}
        plugins={stylePlugins === undefined ? plugins : [...stylePlugins, ...(plugins ?? [])]}
        colorScheme={colorScheme}
        formattingLocale={formattingLocale}
        customPalettes={styled === undefined ? customPalettes : { ...customPalettes, ...styled.customPalettes }}
        themeOverrides={styled?.themeOverrides}
      >
        <GraphRenderer slots={styleName === undefined ? undefined : chartStyleSlots[styleName]} />
      </GraphProvider>
    </div>
  );
};

/** Pulsing bar glyph filling the chart's box while a host streams the props in. */
const ChartPlaceholder = ({ background, glyphColor }: { background?: string; glyphColor?: string }): ReactElement => (
  <div
    data-testid="graphy-chart-placeholder"
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      background: background ?? 'rgba(0, 0, 0, 0.04)',
    }}
  >
    <svg width="44" height="32" viewBox="0 0 44 32" aria-hidden="true">
      {PLACEHOLDER_BARS.map((bar) => (
        <rect
          key={bar.x}
          x={bar.x}
          y={32 - bar.height}
          width="8"
          rx="2"
          height={bar.height}
          fill={glyphColor ?? 'rgba(0, 0, 0, 0.25)'}
        >
          <animate
            attributeName="opacity"
            values="0.35;0.9;0.35"
            dur="1.5s"
            begin={bar.delay}
            repeatCount="indefinite"
          />
        </rect>
      ))}
    </svg>
  </div>
);
