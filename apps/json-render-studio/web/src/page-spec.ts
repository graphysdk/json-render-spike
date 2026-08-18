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
  'A bike-share dashboard: KPI cards, a line of daily rides, and a table of the busiest stations',
  'Rainfall as bars and temperature as a line on a secondary axis, monthly for three cities',
  'A radar chart comparing two phones across six specs, the winner in red',
  'A quarterly revenue review in the Braun style: monthly trend, donut by plan, stacked new vs churned',
  'Monthly signups with the December spike highlighted and a comment explaining it',
  'Revenue by month in €, with a total headline and its change versus last month',
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
