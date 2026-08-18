import { act, render, waitFor } from '@testing-library/react';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { GraphyChartComponent } from '../../embedded/component';
import type { GraphyChartComponentProps } from '../../embedded/props-schema';

// The sizer never measures in jsdom, so paint-level assertions need a ResizeObserver that reports
// a real box the moment it observes.
class MeasuringResizeObserver {
  private readonly callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    act(() => {
      this.callback(
        [
          {
            target,
            contentBoxSize: [{ inlineSize: 640, blockSize: 320 }],
            contentRect: { width: 640, height: 320 },
          } as unknown as ResizeObserverEntry,
        ],
        this as unknown as ResizeObserver
      );
    });
  }
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', MeasuringResizeObserver);

// jsdom's SVG elements report no dimensions; the echo renderers hold off painting until the panel
// measures, so give every svg a real box.
Object.defineProperty(SVGSVGElement.prototype, 'width', {
  configurable: true,
  get: () => ({ baseVal: { value: 640 } }),
});
Object.defineProperty(SVGSVGElement.prototype, 'height', {
  configurable: true,
  get: () => ({ baseVal: { value: 320 } }),
});

afterAll(() => {
  vi.unstubAllGlobals();
  delete (SVGSVGElement.prototype as { width?: unknown }).width;
  delete (SVGSVGElement.prototype as { height?: unknown }).height;
});

function createChartProps(
  geom: string,
  coords?: GraphyChartComponentProps['spec']['coords']
): GraphyChartComponentProps {
  return {
    rows: [
      { month: 'Jan', region: 'EMEA', revenue: 120 },
      { month: 'Jan', region: 'AMER', revenue: 90 },
      { month: 'Feb', region: 'EMEA', revenue: 145 },
      { month: 'Feb', region: 'AMER', revenue: 110 },
    ],
    spec: {
      mapping: { x: 'month', y: 'revenue', color: 'region' },
      layers: [{ type: 'layer', geom }],
      scales: [
        { type: 'scale', scaledAesthetic: 'x', scaleType: 'inferred' },
        { type: 'scale', scaledAesthetic: 'y', scaleType: 'continuous' },
        { type: 'scale', scaledAesthetic: 'color', scaleType: 'palette' },
      ],
      coords,
    },
  };
}

describe('mexico 68 geom renderers', () => {
  // The plugins have only ever painted the reference dashboards; every geom type they replace must
  // survive an arbitrary generated spec. The echo marks are stroked outlines in the series color,
  // so magenta strokes in the output mean the custom renderer painted, not the built-in.
  for (const geom of ['bar', 'line', 'point']) {
    it(`paints ${geom} marks through the echo renderer`, async () => {
      const { container } = render(<GraphyChartComponent props={createChartProps(geom)} chartStyle="mexico-68" />);

      await waitFor(() => {
        expect([...container.querySelectorAll('[stroke="#EC008C"]')].length).toBeGreaterThan(0);
      });
    });
  }

  it('paints polar slices through the echo renderer', async () => {
    const polar = createChartProps('bar', { type: 'coord', coordType: 'polar', params: { theta: 'y' } });

    const { container } = render(<GraphyChartComponent props={polar} chartStyle="mexico-68" />);

    await waitFor(() => {
      expect([...container.querySelectorAll('[stroke="#EC008C"]')].length).toBeGreaterThan(0);
    });
  });
});
