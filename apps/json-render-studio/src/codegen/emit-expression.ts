import { addNote, type EmitContext, readScope } from './context';
import { emitKey, emitLiteral, emitString, INDENT_STEP, joinArray, joinObject } from './emit-value';
import { readStatePath } from './state-path';

/** Sentinel a `pushState` value uses to ask the runtime for a fresh id. */
const AUTO_ID = '$id';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Reads `$item` / `$bindItem` against the enclosing repeat, or notes that there is none. */
function emitItemRead(path: string, context: EmitContext): string {
  const scope = readScope(context);
  if (scope === null) {
    addNote(context, `an $item reference ("${path}") sits outside any repeat, so it has nothing to read`);
    return 'undefined';
  }
  return readStatePath(scope.item, path);
}

function emitIndexRead(context: EmitContext): string {
  const scope = readScope(context);
  if (scope === null) {
    addNote(context, 'an $index reference sits outside any repeat, so it has nothing to read');
    return 'undefined';
  }
  return scope.index;
}

const REFERENCE = /\$\{([^}]*)\}/g;

function escapeTemplateText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

/**
 * A `$template` string as a template literal.
 *
 * `${/path}` reads the state model. A bare `${field}` reads the repeat item first and falls back to
 * `/field` on the state model, which is the resolver's own order — so inside a repeat the same
 * template means the item's field, and outside it means the state's.
 */
function emitTemplate(template: string, context: EmitContext): string {
  const pieces: string[] = [];
  let cursor = 0;
  let sawReference = false;

  for (const match of template.matchAll(REFERENCE)) {
    const start = match.index;
    pieces.push(escapeTemplateText(template.slice(cursor, start)));
    cursor = start + match[0].length;
    sawReference = true;

    const reference = (match[1] ?? '').trim();
    const scope = readScope(context);
    const resolved = reference.startsWith('/')
      ? readStatePath(context.stateRoot, reference)
      : scope === null
        ? readStatePath(context.stateRoot, `/${reference}`)
        : `${readStatePath(scope.item, reference)} ?? ${readStatePath(context.stateRoot, `/${reference}`)}`;
    pieces.push(`\${${resolved}}`);
  }

  if (!sawReference) {
    return emitString(template);
  }
  pieces.push(escapeTemplateText(template.slice(cursor)));
  return `\`${pieces.join('')}\``;
}

/** The value a single condition tests, before any comparison operator. */
function emitConditionOperand(condition: Record<string, unknown>, context: EmitContext): string {
  if (typeof condition.$state === 'string') {
    return readStatePath(context.stateRoot, condition.$state);
  }
  if (typeof condition.$item === 'string') {
    return emitItemRead(condition.$item, context);
  }
  if (condition.$index === true) {
    return emitIndexRead(context);
  }
  addNote(context, 'a condition names no $state, $item or $index to test');
  return 'undefined';
}

const COMPARISONS: Array<{ key: string; operator: string }> = [
  { key: 'eq', operator: '===' },
  { key: 'neq', operator: '!==' },
  { key: 'gt', operator: '>' },
  { key: 'gte', operator: '>=' },
  { key: 'lt', operator: '<' },
  { key: 'lte', operator: '<=' },
];

/**
 * One `$state` / `$item` / `$index` condition, with at most one comparison applied.
 *
 * Without a comparison the test is truthiness, which has to be coerced: a bare `count && <El/>` puts
 * a literal `0` on the page where the spec asked for nothing. Negation already returns a boolean, so
 * it needs no second coercion.
 */
function emitSingleCondition(condition: Record<string, unknown>, context: EmitContext): string {
  const operand = emitConditionOperand(condition, context);
  const comparison = COMPARISONS.find(({ key }) => key in condition);
  const negated = condition.not === true;

  if (comparison === undefined) {
    return negated ? `!${operand}` : `Boolean(${operand})`;
  }

  const tested = `${operand} ${comparison.operator} ${emitExpression(condition[comparison.key], context, '')}`;
  return negated ? `!(${tested})` : tested;
}

function joinConditions(conditions: unknown[], separator: string, context: EmitContext): string {
  if (conditions.length === 0) {
    return 'true';
  }
  const parts = conditions.map((condition) => emitCondition(condition, context));
  return parts.length === 1 ? (parts[0] as string) : parts.map((part) => `(${part})`).join(separator);
}

/** A visibility condition as a boolean-typed expression. */
export function emitCondition(condition: unknown, context: EmitContext): string {
  if (typeof condition === 'boolean') {
    return String(condition);
  }
  if (Array.isArray(condition)) {
    return joinConditions(condition, ' && ', context);
  }
  if (!isRecord(condition)) {
    return 'true';
  }
  if (Array.isArray(condition.$and)) {
    return joinConditions(condition.$and, ' && ', context);
  }
  if (Array.isArray(condition.$or)) {
    return joinConditions(condition.$or, ' || ', context);
  }
  return emitSingleCondition(condition, context);
}

/**
 * A prop value as JavaScript source, with every expression resolved to a real reference.
 *
 * This is the half of code export that json-render's own `serializeProps` leaves alone: it prints
 * `{ $state: "/data/sales" }` back out, because its target components take the path and resolve it
 * themselves. Code that has left the runtime behind has no resolver, so the path has to become the
 * access it stands for.
 *
 * `autoIds` is set only for action parameters — `"$id"` is a sentinel the action runtime honours,
 * and a prop that happens to hold that string is just that string.
 */
export function emitExpression(value: unknown, context: EmitContext, indent: string, autoIds = false): string {
  if (autoIds && value === AUTO_ID) {
    return 'crypto.randomUUID()';
  }

  if (Array.isArray(value)) {
    return joinArray(
      value.map((item) => emitExpression(item, context, indent + INDENT_STEP, autoIds)),
      indent
    );
  }

  if (isRecord(value)) {
    if (typeof value.$state === 'string') {
      return readStatePath(context.stateRoot, value.$state);
    }
    if (typeof value.$bindState === 'string') {
      return readStatePath(context.stateRoot, value.$bindState);
    }
    if (typeof value.$item === 'string') {
      return emitItemRead(value.$item, context);
    }
    if (typeof value.$bindItem === 'string') {
      return emitItemRead(value.$bindItem, context);
    }
    if (value.$index === true) {
      return emitIndexRead(context);
    }
    if (typeof value.$template === 'string') {
      return emitTemplate(value.$template, context);
    }
    if ('$cond' in value) {
      const branchIndent = indent + INDENT_STEP;
      const test = emitCondition(value.$cond, context);
      const whenTrue = emitExpression(value.$then, context, branchIndent, autoIds);
      const whenFalse = emitExpression(value.$else, context, branchIndent, autoIds);
      return `${test} ? ${whenTrue} : ${whenFalse}`;
    }
    if (typeof value.$computed === 'string') {
      addNote(context, `the computed function "${value.$computed}" has to be supplied by hand`);
      const args = isRecord(value.args) ? emitExpression(value.args, context, indent, autoIds) : '{}';
      return `${value.$computed}(${args})`;
    }
    if (autoIds && AUTO_ID in value && Object.keys(value).length === 1) {
      return 'crypto.randomUUID()';
    }

    const entries = Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => `${emitKey(key)}: ${emitExpression(item, context, indent + INDENT_STEP, autoIds)}`);
    return joinObject(entries, indent);
  }

  return emitLiteral(value, indent);
}
