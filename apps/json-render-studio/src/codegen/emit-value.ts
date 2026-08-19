import { escapeString } from '@json-render/codegen';

import { isIdentifier } from './state-path';

/** Column past which a container is broken across lines. */
const WRAP_COLUMN = 110;

export const INDENT_STEP = '  ';

/** A string literal in the quote style the rest of the file uses. */
export function emitString(value: string): string {
  return `'${escapeString(value, 'single')}'`;
}

/** An object key, bare where the syntax allows it. */
export function emitKey(key: string): string {
  return isIdentifier(key) ? key : emitString(key);
}

function fitsOnOneLine(parts: string[], indent: string, overhead: number): boolean {
  return (
    !parts.some((part) => part.includes('\n')) &&
    indent.length + overhead + parts.reduce((width, part) => width + part.length + 2, 0) <= WRAP_COLUMN
  );
}

/**
 * Lays out already-emitted array items.
 *
 * A chart's `rows` is the case that matters: a dozen observations on one line is unreadable, and one
 * field per line is just as bad, so each item is measured on its own and only the outer array wraps.
 */
export function joinArray(items: string[], indent: string): string {
  if (items.length === 0) {
    return '[]';
  }
  if (fitsOnOneLine(items, indent, 2)) {
    return `[${items.join(', ')}]`;
  }
  const inner = indent + INDENT_STEP;
  return `[\n${items.map((item) => `${inner}${item}`).join(',\n')},\n${indent}]`;
}

/** Lays out already-emitted `key: value` entries. */
export function joinObject(entries: string[], indent: string): string {
  if (entries.length === 0) {
    return '{}';
  }
  if (fitsOnOneLine(entries, indent, 4)) {
    return `{ ${entries.join(', ')} }`;
  }
  const inner = indent + INDENT_STEP;
  return `{\n${entries.map((entry) => `${inner}${entry}`).join(',\n')},\n${indent}}`;
}

/**
 * A plain JSON value as JavaScript source.
 *
 * Used for the initial state, which carries no expressions — anything that might is emitted by
 * `emitExpression` instead, which shares the layout above so a resolved reference sitting inside an
 * object does not change how that object is printed.
 */
export function emitLiteral(value: unknown, indent: string): string {
  if (typeof value === 'string') {
    return emitString(value);
  }
  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return joinArray(
      value.map((item) => emitLiteral(item, indent + INDENT_STEP)),
      indent
    );
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => `${emitKey(key)}: ${emitLiteral(item, indent + INDENT_STEP)}`);
    return joinObject(entries, indent);
  }
  return 'undefined';
}
