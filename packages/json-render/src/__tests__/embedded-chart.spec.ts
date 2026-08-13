import { describe, expect, it } from 'vitest';

import { createCompiler } from '@graphysdk/viz-engine';

import { standardGeomDefinitions } from '../catalog';
import {
  graphyChartComponentDefinition,
  type GraphyChartComponentProps,
  graphyChartPropsSchema,
  resolveEmbeddedChartInput,
} from '../embedded-chart';

function createLineChartProps(): GraphyChartComponentProps {
  return {
    title: 'Revenue by month',
    subtitle: null,
    caption: null,
    height: null,
    rows: [
      { month: 'Jan', region: 'EMEA', revenue: 120 },
      { month: 'Jan', region: 'AMER', revenue: 90 },
      { month: 'Feb', region: 'EMEA', revenue: 145 },
      // A model routinely omits a column on a row rather than writing null.
      { month: 'Feb', revenue: 110 },
    ],
    mapping: { x: 'month', y: 'revenue', color: 'region' },
    layers: [{ geom: 'line', stat: null, position: null }],
    scales: [
      { aesthetic: 'x', scaleType: 'inferred' },
      { aesthetic: 'y', scaleType: 'continuous' },
      { aesthetic: 'color', scaleType: 'palette' },
    ],
    coord: null,
  };
}

describe('resolveEmbeddedChartInput', () => {
  it('takes columns from the union of the row keys', () => {
    const { data } = resolveEmbeddedChartInput(createLineChartProps());

    expect(data.columns.map((column) => column.key)).toEqual(['month', 'region', 'revenue']);
  });

  it('drops the nulls a model emits for absent fields', () => {
    const { input } = resolveEmbeddedChartInput(createLineChartProps());

    // A retained null would override the engine's default rather than fall back to it.
    expect(input.layers[0]).toMatchObject({ geom: 'line' });
    expect(input.layers[0]?.stat).toBeUndefined();
    expect(input.layers[0]?.position).toBeUndefined();
    expect(input.coords).toBeUndefined();
  });

  it('survives the fields a model omits rather than nulls', () => {
    // A host renderer resolves prop expressions and hands them over unvalidated, and `.nullable()`
    // reads to a model as permission to leave the key out — `coord` especially.
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
      layers: [{ geom: 'bar', stat: null, position: 'stack' }],
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
});

describe('graphyChartComponentDefinition', () => {
  it('accepts only the geoms the catalog carries', () => {
    const props = { ...createLineChartProps(), layers: [{ geom: 'sankey', stat: null, position: null }] };

    expect(graphyChartPropsSchema.safeParse(props).success).toBe(false);
    expect(graphyChartPropsSchema.safeParse(createLineChartProps()).success).toBe(true);
  });

  it('describes every geom by drawing on the catalog rather than restating it', () => {
    for (const [name, geom] of Object.entries(standardGeomDefinitions)) {
      expect(graphyChartComponentDefinition.description).toContain(name);
      expect(graphyChartComponentDefinition.description).toContain(geom.description);
    }
  });

  it('has no slots, because a chart takes no children', () => {
    expect(graphyChartComponentDefinition.slots).toEqual([]);
  });
});
