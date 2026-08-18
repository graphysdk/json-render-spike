import type { ReactElement } from 'react';

import type { GraphSlots, SwatchSlotProps } from '@graphysdk/react';

import { NB_COLORS } from './neo-brutalist';

/**
 * Sharp-cornered legend swatch mirroring the bars. A series whose color is `transparent` draws as a
 * hollow acid outline — the reference dashboards use that for forecasts, where the default swatch
 * would paint nothing at all.
 */
const NeoBrutalistSwatch = (props: SwatchSlotProps): ReactElement => {
  const width = props.width ?? 12;
  const height = props.height ?? 12;
  const isHollow = props.color === 'transparent' || props.color === 'none';
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <rect
        x={1}
        y={1}
        width={width - 2}
        height={height - 2}
        fill={isHollow ? 'none' : props.color}
        stroke={isHollow ? NB_COLORS.acid : 'none'}
        strokeWidth={1.5}
      />
    </svg>
  );
};

export const neoBrutalistSlots: GraphSlots = { Swatch: NeoBrutalistSwatch };
