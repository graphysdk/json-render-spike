import { defineCatalog } from '@json-render/core';
import { describe, expect, it } from 'vitest';

import {
  standardCoordDefinitions,
  standardGeomDefinitions,
  standardScaleDefinitions,
  standardStatDefinitions,
  standardTransformDefinitions,
} from '../catalog';
import { schema } from '../schema';

function createStandardCatalog() {
  return defineCatalog(schema, {
    geoms: standardGeomDefinitions,
    stats: standardStatDefinitions,
    scales: standardScaleDefinitions,
    coords: standardCoordDefinitions,
    transforms: standardTransformDefinitions,
  });
}

describe('schema', () => {
  it('builds a prompt listing every catalog section', () => {
    const prompt = createStandardCatalog().prompt();

    expect(prompt).toContain('AVAILABLE GEOMS (5)');
    expect(prompt).toContain('AVAILABLE STATS (5)');
    expect(prompt).toContain('AVAILABLE SCALE TYPES (6)');
    expect(prompt).toContain('AVAILABLE COORDINATE SYSTEMS (3)');
    expect(prompt).toContain('AVAILABLE TRANSFORMS (5)');
  });

  it('teaches the grammar rules a compilable spec depends on', () => {
    const prompt = createStandardCatalog().prompt();

    expect(prompt).toContain('There is no chart-type field');
    expect(prompt).toContain('Position scales are never created for you');
  });

  it('appends caller rules after the built-in ones', () => {
    const prompt = createStandardCatalog().prompt({ customRules: ['Prefer fewer than four series per chart'] });

    expect(prompt).toContain('Prefer fewer than four series per chart');
  });

  it('carries a custom geom into the prompt alongside the built-ins', () => {
    const catalog = defineCatalog(schema, {
      geoms: {
        ...standardGeomDefinitions,
        sankey: { props: standardGeomDefinitions.point!.props, description: 'Flow diagram between stages.' },
      },
      stats: standardStatDefinitions,
      scales: standardScaleDefinitions,
      coords: standardCoordDefinitions,
      transforms: standardTransformDefinitions,
    });

    expect(catalog.prompt()).toContain('sankey:');
  });
});
