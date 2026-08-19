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

  it('hands the authored spec to the engine unchanged', () => {
    const props = createLineChartProps();

    const { input } = resolveEmbeddedChartInput(props);

    expect(input.mapping).toBe(props.spec.mapping);
    expect(input.layers).toBe(props.spec.layers);
    expect(input.scales).toBe(props.spec.scales);
    expect(input.config).toBe(props.spec.config);
  });

  it('leaves an omitted field absent, for the compiler to default', () => {
    const { input } = resolveEmbeddedChartInput(createLineChartProps());

    expect(input.layers[0]).toMatchObject({ geom: 'line' });
    expect(input.layers[0]?.stat).toBeUndefined();
    expect(input.layers[0]?.position).toBeUndefined();
    expect(input.coords).toBeUndefined();
  });

  it('fills the arrays the compiler indexes without checking', () => {
    const { input } = resolveEmbeddedChartInput(createLineChartProps());

    expect(input.transforms).toEqual([]);
    expect(input.highlights).toEqual([]);
  });

  it('survives a required prop a host never supplied', () => {
    // A host renderer resolves prop expressions and hands them over unvalidated, so even `rows` and
    // `spec` can arrive absent.
    const sparse = { rows: [{ month: 'Jan', revenue: 1 }] } as unknown as GraphyChartComponentProps;

    expect(() => resolveEmbeddedChartInput(sparse)).not.toThrow();
    expect(resolveEmbeddedChartInput(sparse).input.layers).toEqual([]);
    expect(resolveEmbeddedChartInput({} as unknown as GraphyChartComponentProps).data.rows).toEqual([]);
  });

  it('drops a transform whose options never arrived, which the compiler would fault on', () => {
    // While streaming, a transform node lands one patch before its options — and stays bare forever
    // when that patch was dropped. The compiler reads the options unguarded (INTERNAL_INVARIANT).
    const base = createLineChartProps();
    const halfStreamed = {
      ...base,
      spec: {
        ...base.spec,
        transforms: [
          { type: 'transform', transformType: 'reshape' },
          { type: 'transform', transformType: 'sort', options: { variableName: 'revenue' } },
        ],
      },
    } as unknown as GraphyChartComponentProps;

    const { input, data } = resolveEmbeddedChartInput(halfStreamed);

    expect(input.transforms).toHaveLength(1);
    expect(input.transforms[0]).toMatchObject({ transformType: 'sort' });
    expect(createCompiler().compile({ input, data }).ok).toBe(true);
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
    const base = createLineChartProps();
    const props: GraphyChartComponentProps = {
      ...base,
      spec: {
        ...base.spec,
        layers: [{ type: 'layer', geom: 'bar', position: 'stack' }],
        scales: [
          { type: 'scale', scaledAesthetic: 'x', scaleType: 'discrete' },
          { type: 'scale', scaledAesthetic: 'y', scaleType: 'continuous' },
          { type: 'scale', scaledAesthetic: 'color', scaleType: 'palette' },
        ],
        coords: { type: 'coord', coordType: 'polar', params: { theta: 'y', innerRadius: 0.5 } },
      },
    };

    const result = createCompiler().compile(resolveEmbeddedChartInput(props));

    const reason = result.ok ? '' : result.errors.map((diagnostic) => diagnostic.message).join('; ');
    expect(result.ok, reason).toBe(true);
    expect(result.ok && result.compiled.spec.coords).toMatchObject({ coordType: 'polar' });
  });

  it('compiles authored highlights, resolving each to a scoped id', () => {
    const base = createLineChartProps();
    const props: GraphyChartComponentProps = {
      ...base,
      spec: {
        ...base.spec,
        highlights: [{ type: 'highlight', predicate: { variable: 'region', eq: 'EMEA' }, scope: 'series' }],
      },
    };

    const result = createCompiler().compile(resolveEmbeddedChartInput(props));

    expect(result.ok).toBe(true);
    const highlights = result.ok ? result.compiled.spec.highlights : [];
    expect(highlights).toHaveLength(1);
    expect(highlights[0]).toMatchObject({ scope: 'series', id: expect.any(String) as string });
  });

  it('turns a comment into the rich-text content the engine reads, and compiles it', () => {
    const base = createLineChartProps();
    const props: GraphyChartComponentProps = {
      ...base,
      spec: {
        ...base.spec,
        annotations: { comments: [{ text: 'Holiday spike', at: { anchorValue: 'Feb', groupValue: 'EMEA' } }] },
      },
    };

    const { input, data } = resolveEmbeddedChartInput(props);

    expect(input.annotations?.comments?.[0]).toMatchObject({
      at: { anchorValue: 'Feb', groupValue: 'EMEA' },
      content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Holiday spike' }] }] },
    });
    const result = createCompiler().compile({ input, data });
    const reason = result.ok ? '' : result.errors.map((diagnostic) => diagnostic.message).join('; ');
    expect(result.ok, reason).toBe(true);
  });

  it('carries the whole grammar through to the engine spec', () => {
    const base = createLineChartProps();
    const props: GraphyChartComponentProps = {
      ...base,
      spec: {
        ...base.spec,
        layers: [
          { type: 'layer', geom: 'bar', params: { width: 0.8 }, stat: 'sum', position: 'stack' },
          {
            type: 'layer',
            geom: 'line',
            params: { interpolate: 'catmull-rom' },
            mapping: { y: 'margin' },
            yScaleType: 'secondary',
          },
        ],
        scales: [
          { type: 'scale', scaledAesthetic: 'x', scaleType: 'discrete' },
          { type: 'scale', scaledAesthetic: 'y', scaleType: 'continuous', zero: true },
          { type: 'scale', scaledAesthetic: 'ySecondary', scaleType: 'continuous' },
          { type: 'scale', scaledAesthetic: 'color', scaleType: 'palette' },
        ],
        transforms: [
          { type: 'transform', transformType: 'sort', options: { variableName: 'revenue', direction: 'desc' } },
        ],
        config: { legend: { position: 'bottom' } },
      },
    };

    const { input } = resolveEmbeddedChartInput(props);

    expect(input.layers[0]).toMatchObject({ params: { width: 0.8 }, stat: 'sum' });
    expect(input.layers[1]).toMatchObject({ mapping: { y: 'margin' }, yScaleType: 'secondary' });
    expect(input.transforms[0]).toMatchObject({ transformType: 'sort', options: { direction: 'desc' } });
    expect(input.scales[1]).toMatchObject({ scaledAesthetic: 'y', zero: true });
    expect(input.config.legend).toEqual({ position: 'bottom' });
  });

  it('turns gridlines off on a dual-axis chart, where two y scales would interleave two grids', () => {
    const base = createLineChartProps();
    const props: GraphyChartComponentProps = {
      ...base,
      spec: {
        ...base.spec,
        layers: [
          { type: 'layer', geom: 'bar' },
          { type: 'layer', geom: 'line', mapping: { y: 'margin' }, yScaleType: 'secondary' },
        ],
        scales: [...base.spec.scales, { type: 'scale', scaledAesthetic: 'ySecondary', scaleType: 'continuous' }],
        // The authored config even asks for the grid — the engine mirrors y's grid onto ySecondary,
        // so honoring it is what paints the two mismatched sets.
        config: { axes: { y: { label: 'Revenue, €', grid: { isVisible: true } } } },
      },
    };

    const { input } = resolveEmbeddedChartInput(props);

    expect(input.config.axes?.x?.grid?.isVisible).toBe(false);
    expect(input.config.axes?.y?.grid?.isVisible).toBe(false);
    expect(input.config.axes?.ySecondary?.grid?.isVisible).toBe(false);
    expect(input.config.axes?.y?.label).toBe('Revenue, €');
  });

  it('leaves grid config alone on a single-axis chart', () => {
    const base = createLineChartProps();
    const props: GraphyChartComponentProps = {
      ...base,
      spec: { ...base.spec, config: { axes: { y: { grid: { isVisible: true } } } } },
    };

    const { input } = resolveEmbeddedChartInput(props);

    expect(input.config.axes?.y?.grid?.isVisible).toBe(true);
    expect(input.config.axes?.x).toBeUndefined();
  });
});
