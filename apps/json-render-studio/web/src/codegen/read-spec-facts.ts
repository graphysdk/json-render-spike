import { traverseSpec } from '@json-render/codegen';
import type { Spec } from '@json-render/core';

/** Built-in actions that write to the state model. */
const WRITING_ACTIONS = new Set(['setState', 'pushState', 'removeState']);

const READING_KEYS = ['$state', '$bindState', '$template'];
const WRITING_KEYS = ['$bindState', '$bindItem'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** True when any of `keys` appears anywhere inside `value`, however deeply nested. */
function containsKey(value: unknown, keys: string[]): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => containsKey(item, keys));
  }
  if (!isRecord(value)) {
    return false;
  }
  return keys.some((key) => key in value) || Object.values(value).some((item) => containsKey(item, keys));
}

/**
 * What the emitted file has to declare before any of it is written.
 *
 * The shape of the component depends on the whole spec — a page that only reads state needs no
 * setter, one with a repeat needs `Fragment` — and those are cheaper to answer in one pass than to
 * discover halfway through emitting and then go back and add.
 */
export interface SpecFacts {
  /** A two-way binding or a state-writing action, so the state has to live in a hook. */
  writesState: boolean;
  /** A reference into the state model, so `initialState` has to exist even when the spec seeds none. */
  readsState: boolean;
  hasRepeat: boolean;
}

export function readSpecFacts(spec: Spec): SpecFacts {
  const facts: SpecFacts = { writesState: false, readsState: false, hasRepeat: false };

  traverseSpec(spec, (element) => {
    const props = element.props ?? {};

    if (containsKey(props, READING_KEYS) || containsKey(element.visible, READING_KEYS)) {
      facts.readsState = true;
    }
    if (containsKey(props, WRITING_KEYS)) {
      facts.writesState = true;
    }
    if (element.repeat !== undefined) {
      facts.hasRepeat = true;
      facts.readsState = true;
    }

    for (const binding of [...Object.values(element.on ?? {}), ...Object.values(element.watch ?? {})]) {
      for (const entry of Array.isArray(binding) ? binding : [binding]) {
        if (isRecord(entry) && typeof entry.action === 'string' && WRITING_ACTIONS.has(entry.action)) {
          facts.writesState = true;
        }
      }
    }
  });

  return facts;
}
