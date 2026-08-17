import type { UIElement } from '@json-render/core';

import { addNote, type EmitContext } from './context';
import { emitExpression } from './emit-expression';
import { INDENT_STEP } from './emit-value';
import { isIdentifier } from './state-path';

/** The component a chart definition is painted by inside a json-render registry. */
export const CHART_COMPONENT = 'GraphyChart';

/** What the registry component falls back to. Emitted code has no such component, so it says it. */
const DEFAULT_HEIGHT = 320;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * True when nothing inside is resolved per render.
 *
 * Every expression json-render resolves is an object keyed `$state`, `$item`, `$template` and the
 * like, so one pass over the keys answers it — and a spec that holds none of them is the same object
 * on every render, which is what lets it be hoisted out of the component entirely.
 */
function isStatic(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.every(isStatic);
  }
  if (!isRecord(value)) {
    return true;
  }
  return Object.entries(value).every(([key, item]) => !key.startsWith('$') && isStatic(item));
}

/** Keys json-render resolves per render all start with `$`, and none of a spec's own keys do. */
function isExpressionNode(value: Record<string, unknown>): boolean {
  return Object.keys(value).some((key) => key.startsWith('$'));
}

/** The fields `SpecInput` requires and a spec authored for a page leaves to the component to fill. */
const REQUIRED_SPEC_FIELDS: Record<string, unknown> = { transforms: [], highlights: [], config: {} };

/**
 * The authored spec, whole.
 *
 * A chart component fills the arrays the compiler indexes without checking; a page that carries its
 * own spec has no such component, so what is emitted has to be a `SpecInput` in full — otherwise the
 * exported page is the one thing this panel must never produce: code that does not compile.
 */
function fillSpec(spec: Record<string, unknown>): Record<string, unknown> {
  const filled = { ...spec };
  for (const [field, empty] of Object.entries(REQUIRED_SPEC_FIELDS)) {
    if (filled[field] === undefined) {
      filled[field] = empty;
    }
  }
  return filled;
}

/**
 * The element's key as an identifier, suffixed and disambiguated so two charts cannot collide.
 *
 * Lower-cased at the front: a capitalised constant sitting in a TSX file reads as a component.
 */
function nameSpec(key: string, taken: Iterable<string>): string {
  const camel = key.replace(/[^A-Za-z0-9]+(.)?/g, (_, next: string | undefined) => next?.toUpperCase() ?? '');
  const stem = isIdentifier(camel) ? `${camel.charAt(0).toLowerCase()}${camel.slice(1)}` : 'chart';
  const names = new Set(taken);

  let name = `${stem}Spec`;
  for (let suffix = 2; names.has(name); suffix += 1) {
    name = `${stem}Spec${suffix}`;
  }
  return name;
}

/**
 * The expression `input` is given: a hoisted constant where the spec is fixed, the spec itself where
 * it is not.
 *
 * A spec built inline recompiles nothing — the engine diffs what it last compiled — but it is a new
 * object on every render and a page reads better with the chart's shape stated once, above the
 * markup, the way a hand-written one states it.
 */
function emitSpecInput(key: string, spec: unknown, context: EmitContext, indent: string): string {
  if (spec === undefined) {
    addNote(context, `chart "${key}" carries no spec, so there is nothing for its provider to draw`);
    return 'undefined';
  }

  const authored = isRecord(spec) && !isExpressionNode(spec) ? fillSpec(spec) : spec;

  if (!isStatic(authored)) {
    return emitExpression(authored, context, indent);
  }

  const hoisted = context.specs.get(key);
  if (hoisted !== undefined) {
    return hoisted.name;
  }

  const name = nameSpec(
    key,
    [...context.specs.values()].map((entry) => entry.name)
  );
  context.specs.set(key, { name, source: emitExpression(authored, context, '') });
  return name;
}

/**
 * A chart element as the pair viz-engine takes: a spec, and the data it is read against.
 *
 * Every other element becomes the component named on it, but this one's component is a json-render
 * registry entry — outside a registry it is a dependency the page has no reason to carry, and its
 * props already are a viz-engine spec. So a chart lands as the provider and renderer a hand-written
 * page would use. A chart sizes to its box, which a page layout rarely constrains vertically, hence
 * the wrapper.
 */
export function emitChart(key: string, element: UIElement, context: EmitContext, indent: string): string {
  const props = element.props ?? {};
  const inner = indent + INDENT_STEP;
  const attributeIndent = inner + INDENT_STEP;

  const height = props.height === undefined ? String(DEFAULT_HEIGHT) : emitExpression(props.height, context, inner);
  const input = emitSpecInput(key, props.spec, context, attributeIndent);
  const rows = emitExpression(props.rows ?? [], context, attributeIndent);

  context.helpers.add('buildChartData');

  // A spec built in place is the one attribute long enough to push the others off the line.
  const attributes = [`input={${input}}`, `data={buildChartData(${rows})}`];
  const open = input.includes('\n')
    ? [`${inner}<GraphProvider`, ...attributes.map((attribute) => `${attributeIndent}${attribute}`), `${inner}>`]
    : [`${inner}<GraphProvider ${attributes.join(' ')}>`];

  return [
    `<div style={{ height: ${height} }}>`,
    ...open,
    `${attributeIndent}<GraphRenderer />`,
    `${inner}</GraphProvider>`,
    `${indent}</div>`,
  ].join('\n');
}
