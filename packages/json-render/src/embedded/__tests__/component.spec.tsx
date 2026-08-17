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

  it('falls back to a 320px box, since a page layout rarely constrains a cell vertically', () => {
    const { container } = render(<GraphyChartComponent props={createLineChartProps()} />);

    expect((container.firstElementChild as HTMLElement).style.height).toBe('320px');
  });

  it('mounts a chart whose props a host handed over unvalidated', () => {
    // A host resolves prop expressions without parsing them against the schema, so the component
    // has to survive props the schema would have rejected rather than blank the whole page.
    const sparse = {} as unknown as GraphyChartComponentProps;

    expect(() => render(<GraphyChartComponent props={sparse} />)).not.toThrow();
  });
});
