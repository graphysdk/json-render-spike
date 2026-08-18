import type { Spec } from '@json-render/core';
import { validateSpec } from '@json-render/core';

/** A problem worth surfacing before the spec is blamed on the model. */
export interface StudioIssue {
  severity: 'error' | 'warning';
  message: string;
}

const EMPTY_TREE: Spec = { root: '', elements: {} };

/** Prompts that each reach for a different corner of the chart grammar, offered while the canvas is empty. */
export const EXAMPLE_PROMPTS = [
  'An analytics dashboard for a bike-share service: KPI cards for rides and revenue, a line chart of daily rides, and a table of the busiest stations',
  'Compare rainfall and temperature across 12 months for three cities — bars for rainfall and a line for temperature on a secondary axis',
  'A radar chart comparing two smartphone models across six attributes — battery, camera, display, performance, storage, value',
  'A quarterly revenue review in the Braun style: a revenue trend by month, a donut of revenue by plan, and a stacked bar of new versus churned accounts',
  'A rose chart of monthly ad demand around a twelve-month clock, with the holiday quarter called out in its own color',
];

/**
 * Fills in the fields a half-streamed spec has not reached yet.
 *
 * A spec arrives as plain JSON, so this is where the studio narrows it — once, at the boundary,
 * which keeps the stream and the hook shape-agnostic. `/root` is the first patch a model emits and
 * `/elements` the second, so for one flush the spec has a root and no elements, and `validateSpec`
 * reads `elements[root]` without guarding.
 */
export function asElementTree(spec: Record<string, unknown>): Spec {
  return { ...EMPTY_TREE, ...(spec as Partial<Spec>) };
}

/** True while the spec has nothing worth painting, so the UI can hold the empty state. */
export function isPageEmpty(spec: Record<string, unknown>): boolean {
  const tree = asElementTree(spec);
  return !tree.root || Object.keys(tree.elements ?? {}).length === 0;
}

/** Checked on every flush, so it must be cheap and must tolerate a half-streamed spec. */
export function findPageIssues(spec: Record<string, unknown>): StudioIssue[] {
  return validateSpec(asElementTree(spec)).issues.map((issue) => ({
    severity: issue.severity === 'error' ? 'error' : 'warning',
    message: issue.message,
  }));
}
