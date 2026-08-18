import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GraphyChartComponent } from '../component';
import type { GraphyChartComponentProps } from '../props-schema';

import { createLineChartProps } from './fixtures';

/** Props as they look mid-stream: mapping and layers landed, the scales have not. */
function createScalelessProps(): GraphyChartComponentProps {
  const props = createLineChartProps();
  return { ...props, spec: { ...props.spec, scales: [] } };
}

describe('GraphyChartComponent', () => {
  it('gives the chart a box of the authored pixel height', () => {
    const { container } = render(<GraphyChartComponent props={{ ...createLineChartProps(), height: 480 }} />);

    expect((container.firstElementChild as HTMLElement).style.height).toBe('480px');
  });

  it('falls back to a 400px box, since a page layout rarely constrains a cell vertically', () => {
    const { container } = render(<GraphyChartComponent props={createLineChartProps()} />);

    expect((container.firstElementChild as HTMLElement).style.height).toBe('400px');
  });

  it('mounts a chart under a baked-in style, whether the host or the props chose it', () => {
    expect(() => render(<GraphyChartComponent props={createLineChartProps()} chartStyle="braun" />)).not.toThrow();
    expect(() => render(<GraphyChartComponent props={{ ...createLineChartProps(), style: 'braun' }} />)).not.toThrow();
  });

  it('holds a placeholder while the streamed props cannot draw yet', () => {
    // The scales have not streamed in, so mounting the provider would paint marks at NaN positions.
    const scaleless = createScalelessProps();

    const { container } = render(<GraphyChartComponent props={scaleless} loading />);

    expect(container.querySelector('[data-testid="graphy-chart-placeholder"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="graph-sizer"]')).toBeNull();
  });

  it('renders the chart mid-stream once the props can already draw', () => {
    // Rows keep arriving after this point; the provider recompiles and animates them in.
    const { container } = render(<GraphyChartComponent props={createLineChartProps()} loading />);

    expect(container.querySelector('[data-testid="graph-sizer"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="graphy-chart-placeholder"]')).toBeNull();
  });

  it('paints the placeholder in the active style plate color', () => {
    const { container } = render(<GraphyChartComponent props={createScalelessProps()} chartStyle="braun" loading />);

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
