import { describe, expect, it } from 'vitest';

import { standardGeomDefinitions, standardTransformDefinitions } from '../../grammar/catalog';
import { CHART_STYLE_NAMES, chartStyles } from '../../styles/chart-styles';
import { graphyChartComponentDefinition } from '../definition';
import { graphyChartPropsSchema } from '../props-schema';

import { createLineChartProps } from './fixtures';

describe('graphyChartPropsSchema', () => {
  it('parses props that leave every optional field out, which is what a model emits', () => {
    // The prompt renders an optional field as `height?`, so models omit rather than null it.
    const omitted = {
      rows: [{ month: 'Jan', revenue: 1 }],
      spec: {
        mapping: { x: 'month', y: 'revenue' },
        layers: [{ type: 'layer', geom: 'line' }],
        scales: [
          { type: 'scale', scaledAesthetic: 'x', scaleType: 'inferred' },
          { type: 'scale', scaledAesthetic: 'y', scaleType: 'continuous' },
        ],
      },
    };

    const result = graphyChartPropsSchema.safeParse(omitted);

    expect(result.error?.issues ?? [], JSON.stringify(result.error?.issues)).toEqual([]);
    expect(result.success).toBe(true);
  });

  it('accepts authored axes config, which is how a model labels an axis or drops a grid', () => {
    const props = createLineChartProps();
    const withAxes = {
      ...props,
      spec: {
        ...props.spec,
        config: {
          axes: { y: { label: 'Revenue, €', grid: { isVisible: false } }, x: { ticks: { isVisible: false } } },
        },
      },
    };

    const result = graphyChartPropsSchema.safeParse(withAxes);

    expect(result.success).toBe(true);
    expect(result.data?.spec.config?.axes?.y?.label).toBe('Revenue, €');
  });

  it('accepts number formatting and a headline, which is how a chart prints money and KPIs', () => {
    const props = createLineChartProps();
    const withFormat = {
      ...props,
      spec: {
        ...props.spec,
        config: {
          numberFormat: { prefix: '$', decimals: 1, abbreviation: 'auto' },
          headline: { show: 'total', compareWith: 'previous' },
        },
      },
    };

    const result = graphyChartPropsSchema.safeParse(withFormat);

    expect(result.success).toBe(true);
    expect(result.data?.spec.config?.numberFormat?.prefix).toBe('$');
    expect(result.data?.spec.config?.headline?.show).toBe('total');
  });

  it('keeps a scale option that sits flat on the node, which is where the engine reads it', () => {
    const props = createLineChartProps();
    const scaled = {
      ...props,
      spec: {
        ...props.spec,
        scales: [{ type: 'scale', scaledAesthetic: 'y', scaleType: 'continuous', zero: true, nice: true }],
      },
    };

    const result = graphyChartPropsSchema.safeParse(scaled);

    expect(result.success).toBe(true);
    expect(result.data?.spec.scales[0]).toMatchObject({ zero: true, nice: true });
  });

  it('rejects a null where a field is merely absent, because the two are not the same input', () => {
    // Absent means "the compiler picks the default". Null is not a value any of these fields takes,
    // and passing one through would overwrite the default rather than fall back to it.
    const props = createLineChartProps();
    const nulled = { ...props, spec: { ...props.spec, layers: [{ type: 'layer', geom: 'line', params: null }] } };

    expect(graphyChartPropsSchema.safeParse(nulled).success).toBe(false);
  });

  it('accepts only the geoms the catalog carries', () => {
    // Complete but for the geom, so the rejection can only be about the name.
    const props = createLineChartProps();
    const unknownGeom = { ...props, spec: { ...props.spec, layers: [{ type: 'layer', geom: 'sankey' }] } };

    expect(graphyChartPropsSchema.safeParse(unknownGeom).success).toBe(false);
    expect(graphyChartPropsSchema.safeParse(createLineChartProps()).success).toBe(true);
  });

  it('rejects a node that leaves out its own type tag, since the engine dispatches on it', () => {
    const props = createLineChartProps();
    const untagged = { ...props, spec: { ...props.spec, layers: [{ geom: 'line' }] } };

    expect(graphyChartPropsSchema.safeParse(untagged).success).toBe(false);
  });
});

describe('graphyChartComponentDefinition', () => {
  it('shows the model an example with no nulls in it', () => {
    expect(JSON.stringify(graphyChartComponentDefinition.example)).not.toContain('null');
  });

  it('describes every geom and transform by drawing on the catalog rather than restating it', () => {
    for (const [name, entry] of Object.entries({ ...standardGeomDefinitions, ...standardTransformDefinitions })) {
      expect(graphyChartComponentDefinition.description).toContain(name);
      expect(graphyChartComponentDefinition.description).toContain(entry.description);
    }
  });

  it('spells out the values a param accepts, not just its name', () => {
    // A key name alone leaves a model writing `interpolate: "smooth"`, which the geom does not take.
    expect(graphyChartComponentDefinition.description).toContain('interpolate: "linear"|"catmull-rom"');
  });

  it('has no slots, because a chart takes no children', () => {
    expect(graphyChartComponentDefinition.slots).toEqual([]);
  });

  it('teaches every baked-in style by drawing on the registry rather than restating it', () => {
    for (const name of CHART_STYLE_NAMES) {
      expect(graphyChartComponentDefinition.description).toContain(name);
      expect(graphyChartComponentDefinition.description).toContain(chartStyles[name].description);
    }
  });
});
