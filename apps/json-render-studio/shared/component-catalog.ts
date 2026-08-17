import { defineCatalog } from '@json-render/core';
import { schema } from '@json-render/react/schema';
import { shadcnComponentDefinitions } from '@json-render/shadcn/catalog';

import { graphyChartComponentDefinition } from '@graphysdk/json-render/server';

/**
 * `Stack` renders `items-start` unless told otherwise, and in a flex column that means "hug your
 * children": a Grid inside it stops filling the page and shrinks toward the width of its text,
 * taking every card and chart down with it. Since a page root is almost always a vertical Stack,
 * the shipped example — `{direction, gap}` — is the shape a model copies straight into that trap.
 *
 * The renderer stays shadcn's, so the spec means the same thing here as in the app it lands in; it
 * is what the model reads that changes.
 */
const stackDefinition = {
  ...shadcnComponentDefinitions.Stack,
  description:
    'Flex container for layouts. A vertical Stack hugs its children — give it align "stretch" whenever it holds a Grid, Card, Table or chart, or they collapse to the width of their own text',
  example: { direction: 'vertical', gap: 'md', align: 'stretch' },
};

/**
 * A React page: shadcn's 36 components plus one of ours.
 *
 * `GraphyChart` sits in the same map as `Card` and `Table`, which is the point — a chart is a
 * component the model reaches for when the data calls for it, not a separate document type. It
 * carries the whole grammar of graphics in its props, so a chart never outgrows the page it is on.
 * Its definition travels with `@graphysdk/json-render`, so the studio composes catalogs rather than
 * describing charts.
 *
 * Shared because a catalog has two halves in two processes: the server turns it into the prompt, the
 * browser types the registry that paints what comes back. One definition, so they cannot drift.
 */
export const componentCatalog = defineCatalog(schema, {
  components: {
    ...shadcnComponentDefinitions,
    Stack: stackDefinition,
    GraphyChart: graphyChartComponentDefinition,
  },
  actions: {},
});
