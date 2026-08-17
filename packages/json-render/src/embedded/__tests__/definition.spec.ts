import { describe, expect, it } from 'vitest';

import { standardGeomDefinitions, standardTransformDefinitions } from '../../grammar/catalog';
import { graphyChartComponentDefinition } from '../definition';
import { graphyChartPropsSchema } from '../props-schema';

import { createLineChartProps } from './fixtures';

describe('graphyChartPropsSchema', () => {
  it('parses props that leave every optional field out, which is what a model emits', () => {
    // The prompt renders an optional field as `title?`, so models omit rather than null it.
    const omitted = {
      rows: [{ month: 'Jan', revenue: 1 }],
      mapping: { x: 'month', y: 'revenue' },
      layers: [{ geom: 'line' }],
      scales: [
        { aesthetic: 'x', scaleType: 'inferred' },
        { aesthetic: 'y', scaleType: 'continuous' },
      ],
    };

    const result = graphyChartPropsSchema.safeParse(omitted);

    expect(result.error?.issues ?? [], JSON.stringify(result.error?.issues)).toEqual([]);
    expect(result.success).toBe(true);
  });

  it('rejects a null where a field is merely absent, because the two are not the same input', () => {
    // Absent means "the compiler picks the default". Null is not a value any of these fields takes,
    // and passing one through would overwrite the default rather than fall back to it.
    const nulled = { ...createLineChartProps(), title: null, layers: [{ geom: 'line', params: null }] };

    expect(graphyChartPropsSchema.safeParse(nulled).success).toBe(false);
  });

  it('accepts only the geoms the catalog carries', () => {
    // Complete but for the geom, so the rejection can only be about the name.
    const props = {
      ...createLineChartProps(),
      layers: [{ geom: 'sankey' }],
    };

    expect(graphyChartPropsSchema.safeParse(props).success).toBe(false);
    expect(graphyChartPropsSchema.safeParse(createLineChartProps()).success).toBe(true);
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
});
