import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GraphyChartComponent } from '../component';
import type { GraphyChartComponentProps } from '../props-schema';

import { createLineChartProps } from './fixtures';

describe('GraphyChartComponent', () => {
  it('gives the chart a box of the authored pixel height', () => {
    const { container } = render(<GraphyChartComponent props={{ ...createLineChartProps(), height: 480 }} />);

    expect((container.firstElementChild as HTMLElement).style.height).toBe('480px');
  });

  it('falls back to a 360px box, since a page layout rarely constrains a cell vertically', () => {
    const { container } = render(<GraphyChartComponent props={createLineChartProps()} />);

    expect((container.firstElementChild as HTMLElement).style.height).toBe('360px');
  });

  it('mounts a chart under a baked-in style, whether the host or the props chose it', () => {
    expect(() => render(<GraphyChartComponent props={createLineChartProps()} chartStyle="braun" />)).not.toThrow();
    expect(() => render(<GraphyChartComponent props={{ ...createLineChartProps(), style: 'braun' }} />)).not.toThrow();
  });

  it('holds a placeholder while the host is still streaming the props', () => {
    // Half-built props would compile to errors; the placeholder keeps the box calm until settle.
    const { container } = render(<GraphyChartComponent props={createLineChartProps()} loading />);

    expect(container.querySelector('[data-testid="graphy-chart-placeholder"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="graph-sizer"]')).toBeNull();
  });

  it('paints the placeholder in the active style plate color', () => {
    const { container } = render(<GraphyChartComponent props={createLineChartProps()} chartStyle="braun" loading />);

    const placeholder = container.querySelector('[data-testid="graphy-chart-placeholder"]') as HTMLElement;
    expect(placeholder.style.background).toMatch(/239, 237, 232|#EFEDE8/i);
  });

  it('mounts a chart whose props a host handed over unvalidated', () => {
    // A host resolves prop expressions without parsing them against the schema, so the component
    // has to survive props the schema would have rejected rather than blank the whole page.
    const sparse = {} as unknown as GraphyChartComponentProps;

    expect(() => render(<GraphyChartComponent props={sparse} />)).not.toThrow();
  });
});
