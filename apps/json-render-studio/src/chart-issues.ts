import type { Spec } from '@json-render/core';

import { resolveEmbeddedChartInput } from '@graphysdk/json-render/server';
import type { SpecInput } from '@graphysdk/viz-engine';
import { createCompiler } from '@graphysdk/viz-engine';

import { asElementTree, type StudioIssue } from './page-spec';

/**
 * Compiles every generated chart headlessly and reports what the renderer would only show as an
 * in-place error panel — plus paint workarounds worth knowing about. The engine compiles without a
 * DOM, so this is the same judgement the chart gets on screen, delivered as sidebar issues that
 * name the element.
 */
export function findChartIssues(spec: Record<string, unknown>): StudioIssue[] {
  const tree = asElementTree(spec);
  const compiler = createCompiler();
  const issues: StudioIssue[] = [];

  for (const [key, element] of Object.entries(tree.elements ?? {})) {
    if ((element as { type?: string }).type !== 'GraphyChart') continue;
    const props = resolveStateRefs((element as { props?: unknown }).props ?? {}, tree.state);
    const { input, data } = resolveEmbeddedChartInput(props as Parameters<typeof resolveEmbeddedChartInput>[0]);
    // A chart whose rows never resolved (a dangling $state path) has nothing to judge yet.
    if (data.rows.length === 0) continue;

    const result = compiler.compile({ input, data });
    if (!result.ok) {
      for (const error of result.errors) {
        issues.push({ severity: 'error', message: `Chart "${key}": ${readMessage(error)}` });
      }
    } else {
      for (const warning of result.warnings) {
        issues.push({ severity: 'warning', message: `Chart "${key}": ${readMessage(warning)}` });
      }
    }

    for (const note of findPaintWorkarounds(input)) {
      issues.push({ severity: 'warning', message: `Chart "${key}": ${note}` });
    }
  }

  return issues;
}

/**
 * Paint the grammar deliberately excludes, smuggled in anyway. Before a stylesheet surface exists
 * these mark pent-up styling demand; once one does, they mark a model that bypassed it.
 */
function findPaintWorkarounds(input: SpecInput): string[] {
  const notes: string[] = [];

  const mappings = [input.mapping, ...input.layers.map((layer) => layer.mapping ?? {})];
  if (mappings.some((mapping) => isConstantColor(mapping['color']))) {
    notes.push('maps `color` to a fixed value — series colors belong to the palette or a baked style');
  }

  const hasOverrides = input.scales.some(
    (scale) => scale.scaleType === 'palette' && scale.overrides !== undefined && Object.keys(scale.overrides).length > 0
  );
  if (hasOverrides) {
    notes.push('pins palette slots to fixed colors via `overrides`');
  }

  return notes;
}

function isConstantColor(value: unknown): boolean {
  return typeof value === 'object' && value !== null && 'value' in value;
}

function readMessage(entry: unknown): string {
  const message = (entry as { message?: unknown }).message;
  return typeof message === 'string' ? message : 'did not compile';
}

/**
 * Resolves `$state` references the way the host renderer would, so a chart bound to page state is
 * judged against the rows it will actually draw. Anything unresolvable reads as `undefined`, which
 * downstream treats as "no rows yet".
 */
function resolveStateRefs(value: unknown, state: Spec['state']): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => resolveStateRefs(entry, state));
  }
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    if (typeof record['$state'] === 'string') {
      return readStatePath(state, record['$state']);
    }
    return Object.fromEntries(Object.entries(record).map(([key, entry]) => [key, resolveStateRefs(entry, state)]));
  }
  return value;
}

function readStatePath(state: unknown, path: string): unknown {
  let current: unknown = state;
  for (const segment of path.split('/').filter((part) => part !== '')) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}
