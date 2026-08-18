import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { SwatchSlotProps } from '@graphysdk/react';

import { neoBrutalistSlots } from '../neo-brutalist-slots';

function readSwatchPaint(overrides: Partial<SwatchSlotProps>): { fill: string | null; stroke: string | null } {
  const Swatch = neoBrutalistSlots.Swatch;
  if (Swatch === undefined) throw new Error('the neo-brutalist slots must carry a Swatch');
  const { container } = render(
    <Swatch shape="square" surface="legend" label="series" color="#C8FF00" {...overrides} />
  );
  const swatchRect = container.querySelector('rect');
  if (swatchRect === null) throw new Error('the swatch must draw a rect');
  return { fill: swatchRect.getAttribute('fill'), stroke: swatchRect.getAttribute('stroke') };
}

describe('neoBrutalistSlots.Swatch', () => {
  it('fills the swatch with the series color', () => {
    expect(readSwatchPaint({ color: '#F0F0F0' })).toEqual({ fill: '#F0F0F0', stroke: 'none' });
  });

  it('draws a hollow acid outline for a transparent series, which would otherwise show nothing', () => {
    expect(readSwatchPaint({ color: 'transparent' })).toEqual({ fill: 'none', stroke: '#C8FF00' });
  });
});
