import type { ReactNode } from 'react';

/** A problem worth surfacing before the spec is blamed on the model. */
export interface StudioIssue {
  severity: 'error' | 'warning';
  message: string;
}

/**
 * The client half of a target: how to preview a spec of this shape, and what to warn about.
 *
 * Specs arrive as plain JSON, so each target narrows `spec` once at its own boundary. That keeps the
 * stream, the hook and the UI shape-agnostic — the only place that knows what a spec *is* is here.
 */
export interface StudioTarget {
  readonly id: string;
  readonly examples: readonly string[];
  /** True while the spec has nothing worth painting, so the UI can hold the empty state. */
  isEmpty: (spec: Record<string, unknown>) => boolean;
  renderPreview: (spec: Record<string, unknown>, streaming: boolean) => ReactNode;
  /** Checked on every flush, so it must be cheap and must tolerate a half-streamed spec. */
  findIssues: (spec: Record<string, unknown>) => StudioIssue[];
}
