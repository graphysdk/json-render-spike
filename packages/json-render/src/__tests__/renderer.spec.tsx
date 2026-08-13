import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ChartRenderer, Renderer } from '../renderer';

import { createDashboardSpec } from './fixtures';

// jsdom lays nothing out, so responsive sizing would measure every chart at zero and paint nothing.
const FIXED_SIZING = { mode: 'fixed', width: 600, height: 300 } as const;

describe('Renderer', () => {
  it('paints one chart per spec chart', () => {
    const spec = createDashboardSpec();
    const { container } = render(<Renderer spec={spec} sizing={FIXED_SIZING} />);

    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(spec.charts.length);
  });

  it('hands the charts to the caller as siblings, so their container lays them out', () => {
    const spec = createDashboardSpec();
    const { container } = render(<Renderer spec={spec} />);

    // No wrapper of its own: a caller's grid or flex container sees the charts as its own children.
    expect(container.children.length).toBe(spec.charts.length);
  });

  it('gives every chart a box of the same height', () => {
    const { container } = render(<Renderer spec={createDashboardSpec()} height={480} />);
    const charts = [...container.children] as HTMLElement[];

    expect(charts.map((chart) => chart.style.height)).toEqual(['480px', '480px', '480px']);
  });

  it('renders the fallback for a chart whose dataset is missing, and keeps painting the rest', () => {
    const spec = createDashboardSpec();
    spec.charts[0]!.datasetId = 'nope';

    const { container } = render(
      <Renderer spec={spec} sizing={FIXED_SIZING} renderMissingDataset={(chart) => <p>no data for {chart.id}</p>} />
    );

    expect(screen.getByText(/no data for revenue-trend/)).toBeDefined();
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0);
  });
});

describe('ChartRenderer', () => {
  it('paints a single chart of the spec, so a caller can place charts one by one', () => {
    const spec = createDashboardSpec();
    const { container } = render(<ChartRenderer spec={spec} chart={spec.charts[1]!} sizing={FIXED_SIZING} />);

    expect(container.children.length).toBe(1);
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0);
  });

  it('falls back to a 320px box', () => {
    const spec = createDashboardSpec();
    const { container } = render(<ChartRenderer spec={spec} chart={spec.charts[0]!} />);

    expect((container.firstElementChild as HTMLElement).style.height).toBe('320px');
  });
});
