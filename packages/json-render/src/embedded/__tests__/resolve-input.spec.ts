import { describe, expect, it } from 'vitest';

import { createCompiler } from '@graphysdk/viz-engine';

import type { GraphyChartComponentProps } from '../props-schema';
import { resolveEmbeddedChartInput } from '../resolve-input';

import { createLineChartProps } from './fixtures';

describe('resolveEmbeddedChartInput', () => {
  it('takes columns from the union of the row keys', () => {
    const { data } = resolveEmbeddedChartInput(createLineChartProps());

    expect(data.columns.map((column) => column.key)).toEqual(['month', 'region', 'revenue']);
  });

  it('leaves an omitted field absent, for the compiler to default', () => {
    const { input } = resolveEmbeddedChartInput(createLineChartProps());

    expect(input.layers[0]).toMatchObject({ geom: 'line' });
    expect(input.layers[0]?.stat).toBeUndefined();
    expect(input.layers[0]?.position).toBeUndefined();
    expect(input.coords).toBeUndefined();
  });

  it('survives a required prop a host never supplied', () => {
    // A host renderer resolves prop expressions and hands them over unvalidated, so even `rows` and
    // `mapping` can arrive absent.
    const sparse = {
      rows: [{ month: 'Jan', revenue: 1 }],
      mapping: { x: 'month', y: 'revenue' },
    } as unknown as GraphyChartComponentProps;

    expect(() => resolveEmbeddedChartInput(sparse)).not.toThrow();
    expect(resolveEmbeddedChartInput(sparse).input.coords).toBeUndefined();
    expect(resolveEmbeddedChartInput({} as unknown as GraphyChartComponentProps).data.rows).toEqual([]);
  });

  it('unwraps rows a host resolved one level too deep', () => {
    // `rows: [{"$state": "/data/sales"}]` resolves to the array inside the array.
    const wrapped = {
      ...createLineChartProps(),
      rows: [createLineChartProps().rows],
    } as unknown as GraphyChartComponentProps;

    const { data } = resolveEmbeddedChartInput(wrapped);

    expect(data.columns.map((column) => column.key)).toEqual(['month', 'region', 'revenue']);
    expect(data.rows).toHaveLength(4);
  });

  it('produces a spec the engine compiles', () => {
    const result = createCompiler().compile(resolveEmbeddedChartInput(createLineChartProps()));

    const reason = result.ok ? '' : result.errors.map((diagnostic) => diagnostic.message).join('; ');
    expect(result.ok, reason).toBe(true);
  });

  it('compiles a donut, which is a bar under polar coords', () => {
    const props: GraphyChartComponentProps = {
      ...createLineChartProps(),
      layers: [{ geom: 'bar', position: 'stack' }],
      scales: [
        { aesthetic: 'x', scaleType: 'discrete' },
        { aesthetic: 'y', scaleType: 'continuous' },
        { aesthetic: 'color', scaleType: 'palette' },
      ],
      coord: { coordType: 'polar', params: { theta: 'y', innerRadius: 0.5 } },
    };

    const result = createCompiler().compile(resolveEmbeddedChartInput(props));

    const reason = result.ok ? '' : result.errors.map((diagnostic) => diagnostic.message).join('; ');
    expect(result.ok, reason).toBe(true);
    expect(result.ok && result.compiled.spec.coords).toMatchObject({ coordType: 'polar' });
  });

  it('carries the whole grammar through to the engine spec', () => {
    const props: GraphyChartComponentProps = {
      ...createLineChartProps(),
      layers: [
        { geom: 'bar', params: { width: 0.8 }, stat: 'sum', position: 'stack' },
        {
          geom: 'line',
          params: { interpolate: 'catmull-rom' },
          mapping: { y: 'margin' },
          yScaleType: 'secondary',
        },
      ],
      scales: [
        { aesthetic: 'x', scaleType: 'discrete' },
        { aesthetic: 'y', scaleType: 'continuous', options: { zero: true } },
        { aesthetic: 'ySecondary', scaleType: 'continuous' },
        { aesthetic: 'color', scaleType: 'palette' },
      ],
      transforms: [{ transformType: 'sort', options: { variableName: 'revenue', direction: 'desc' } }],
      legendPosition: 'bottom',
    };

    const { input } = resolveEmbeddedChartInput(props);

    expect(input.layers[0]).toMatchObject({ params: { width: 0.8 }, stat: 'sum' });
    expect(input.layers[1]).toMatchObject({ mapping: { y: 'margin' }, yScaleType: 'secondary' });
    expect(input.transforms[0]).toMatchObject({ transformType: 'sort', options: { direction: 'desc' } });
    // Non-`inferred` scale options flatten onto the engine's scale node rather than staying nested.
    expect(input.scales[1]).toMatchObject({ scaledAesthetic: 'y', zero: true });
    expect(input.config.legend).toEqual({ position: 'bottom' });
  });
});
