/** A JSON Pointer segment, with RFC 6901's two escapes undone. */
function decodeSegment(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

/** Splits a JSON Pointer into its decoded segments. The root pointer yields none. */
export function readPointerSegments(pointer: string): string[] {
  const body = pointer.startsWith('/') ? pointer.slice(1) : pointer;
  return body === '' ? [] : body.split('/').map(decodeSegment);
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** True when a key can be written after a dot rather than in brackets. */
export function isIdentifier(name: string): boolean {
  return IDENTIFIER.test(name);
}

/**
 * Appends one pointer segment to a JavaScript expression.
 *
 * Every access past the first is optional-chained. A `$state` path may point at a value the initial
 * state never declared — a form field before anything is typed into it is the ordinary case — and a
 * plain `state.form.email` throws on that where json-render's own resolver returns undefined. The
 * first access is exempt because the state root is always an object.
 */
function appendSegment(base: string, segment: string, index: number): string {
  const optional = index === 0 ? '' : '?.';
  if (/^\d+$/.test(segment)) {
    return `${base}${optional}[${segment}]`;
  }
  if (isIdentifier(segment)) {
    return `${base}${index === 0 ? '.' : '?.'}${segment}`;
  }
  return `${base}${optional}[${JSON.stringify(segment)}]`;
}

/** Reads a JSON Pointer as member access off `root` — `/data/sales` becomes `state.data?.sales`. */
export function readStatePath(root: string, pointer: string): string {
  return readPointerSegments(pointer).reduce<string>(
    (expression, segment, index) => appendSegment(expression, segment, index),
    root
  );
}
