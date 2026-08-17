import type { Spec } from '@json-render/core';

/** Names bound by one enclosing `repeat`. */
export interface RepeatScope {
  item: string;
  index: string;
  /**
   * The item's absolute JSON Pointer as template-literal text — `/todos/${index}`, without the
   * enclosing backticks, so a field can be appended before the literal is closed.
   *
   * A two-way binding onto a repeat item writes back through the state model, not through the item
   * it was handed, so the write needs the path the item came from.
   */
  pointerBody: string;
}

/** A helper the emitted file has to define, collected while emitting rather than guessed up front. */
export type HelperName = 'setByPath' | 'buildChartData';

/** A chart spec lifted to module scope, keyed by the element it was authored on. */
export interface HoistedSpec {
  /** The constant's name, unique across the page. */
  name: string;
  /** The spec as source, at module-scope indentation. */
  source: string;
}

export interface EmitContext {
  spec: Spec;
  /** Identifier the state model is read through: `state` when the page writes, `initialState` when not. */
  stateRoot: string;
  /** Enclosing repeats, innermost last. */
  scopes: RepeatScope[];
  /**
   * What could not be carried over, in the order it was met.
   *
   * A spec reaches further than plain React does — form validation and state watchers have no
   * standalone equivalent — and code that quietly drops those reads as code that never needed them.
   */
  notes: string[];
  helpers: Set<HelperName>;
  /** Chart specs hoisted out of the component, in the order they were met. */
  specs: Map<string, HoistedSpec>;
}

export function createEmitContext(spec: Spec, stateRoot: string): EmitContext {
  return { spec, stateRoot, scopes: [], notes: [], helpers: new Set(), specs: new Map() };
}

export function addNote(context: EmitContext, note: string): void {
  if (!context.notes.includes(note)) {
    context.notes.push(note);
  }
}

/** The innermost repeat scope, or `null` outside one. */
export function readScope(context: EmitContext): RepeatScope | null {
  return context.scopes[context.scopes.length - 1] ?? null;
}
