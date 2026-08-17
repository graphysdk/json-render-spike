import type { UIElement } from '@json-render/core';

import { addNote, type EmitContext, type RepeatScope } from './context';
import { emitEventHandler } from './emit-action';
import { CHART_COMPONENT, emitChart } from './emit-chart';
import { emitCondition, emitExpression } from './emit-expression';
import { emitString, INDENT_STEP } from './emit-value';
import { readPointerSegments, readStatePath } from './state-path';

/** Column past which an element's attributes go one per line. */
const WRAP_COLUMN = 110;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function capitalise(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** A string that can sit in JSX quotes as-is, rather than going through a brace. */
function isPlainAttributeText(value: string): boolean {
  return !/["\n\\{}<>]/.test(value);
}

/**
 * The write-back half of a two-way binding.
 *
 * json-render hands a component the resolved value and the path beside it, and the component writes
 * through the path itself. Nothing does that here, so the binding becomes the pair a React component
 * takes: the value, and a change handler that puts the next one back where it came from.
 */
function emitBindingHandler(name: string, pointer: string, context: EmitContext): string {
  context.helpers.add('setByPath');
  return `on${capitalise(name)}Change={(next) => setState((current) => setByPath(current, ${pointer}, next))}`;
}

/** The absolute pointer expression for a field on the current repeat item. */
function readItemPointer(path: string, context: EmitContext): string | null {
  const scope = context.scopes[context.scopes.length - 1];
  if (scope === undefined) {
    return null;
  }
  const suffix = readPointerSegments(path)
    .map((segment) => `/${segment}`)
    .join('');
  return `\`${scope.pointerBody}${suffix}\``;
}

function emitAttribute(name: string, value: unknown, context: EmitContext, indent: string): string[] {
  if (isRecord(value) && typeof value.$bindState === 'string') {
    const read = readStatePath(context.stateRoot, value.$bindState);
    return [`${name}={${read}}`, emitBindingHandler(name, emitString(value.$bindState), context)];
  }

  if (isRecord(value) && typeof value.$bindItem === 'string') {
    const read = emitExpression(value, context, indent);
    const pointer = readItemPointer(value.$bindItem, context);
    if (pointer === null) {
      addNote(context, `the two-way binding on "${name}" sits outside any repeat, so it has nothing to write back to`);
      return [`${name}={${read}}`];
    }
    return [`${name}={${read}}`, emitBindingHandler(name, pointer, context)];
  }

  if (value === true) {
    return [name];
  }

  if (typeof value === 'string') {
    return [isPlainAttributeText(value) ? `${name}="${value}"` : `${name}={${emitString(value)}}`];
  }

  return [`${name}={${emitExpression(value, context, indent)}}`];
}

function emitAttributes(element: UIElement, context: EmitContext, indent: string): string[] {
  const attributes: string[] = [];

  for (const [name, value] of Object.entries(element.props ?? {})) {
    if (value === undefined) {
      continue;
    }
    attributes.push(...emitAttribute(name, value, context, indent));
  }

  for (const [event, binding] of Object.entries(element.on ?? {})) {
    attributes.push(`on${capitalise(event)}={${emitEventHandler(binding, context, indent)}}`);
  }

  if (element.watch !== undefined) {
    addNote(context, 'a state watcher is not emitted — the actions it would fire have to be wired up by hand');
  }

  return attributes;
}

/** Opens a repeat scope named so an inner repeat does not shadow the item an outer one bound. */
function openScope(context: EmitContext, statePath: string): RepeatScope {
  const depth = context.scopes.length;
  const suffix = depth === 0 ? '' : String(depth + 1);
  const index = `index${suffix}`;
  return {
    item: `item${suffix}`,
    index,
    pointerBody: `${statePath}/\${${index}}`,
  };
}

/**
 * The children of an element, repeated once per item when it carries a `repeat`.
 *
 * The repeat sits on the parent and applies to its children as a group, so the map wraps all of them
 * in a fragment rather than each of them in a loop of its own.
 */
function emitChildren(element: UIElement, context: EmitContext, indent: string): string {
  const inner = indent + INDENT_STEP;

  if (element.repeat === undefined) {
    return renderChildList(element.children ?? [], context, inner);
  }

  const scope = openScope(context, element.repeat.statePath);
  context.scopes.push(scope);
  const body = renderChildList(element.children ?? [], context, inner + INDENT_STEP + INDENT_STEP);
  const key = element.repeat.key === undefined ? scope.index : readStatePath(scope.item, element.repeat.key);
  context.scopes.pop();

  const list = readStatePath(context.stateRoot, element.repeat.statePath);
  const mapIndent = inner + INDENT_STEP;
  return [
    `${inner}{${list}?.map((${scope.item}, ${scope.index}) => (`,
    `${mapIndent}<Fragment key={${key}}>`,
    body,
    `${mapIndent}</Fragment>`,
    `${inner}))}`,
  ]
    .filter((line) => line !== '')
    .join('\n');
}

function renderChildList(children: string[], context: EmitContext, indent: string): string {
  return children
    .map((child) => emitChild(child, context, indent))
    .filter((child): child is string => child !== null)
    .map((child) => `${indent}${child}`)
    .join('\n');
}

/** One element as a tag, without any visibility wrapper. */
export function emitElementTag(key: string, context: EmitContext, indent: string): string | null {
  const element = context.spec.elements[key];
  if (element === undefined) {
    addNote(context, `element "${key}" is referenced as a child but the spec never defines it`);
    return null;
  }

  if (element.type === CHART_COMPONENT) {
    return emitChart(key, element, context, indent);
  }

  // Attributes are emitted at the indent the wrapped form puts them at. When they fit on one line
  // instead they carry no continuation lines, so the indent they were built with cannot show.
  const attributes = emitAttributes(element, context, indent + INDENT_STEP);
  const children = emitChildren(element, context, indent);

  const inlineAttributes = attributes.join(' ');
  const fitsOnOneLine =
    !inlineAttributes.includes('\n') &&
    indent.length + element.type.length + inlineAttributes.length + 4 <= WRAP_COLUMN;

  const open = fitsOnOneLine
    ? `<${element.type}${inlineAttributes === '' ? '' : ` ${inlineAttributes}`}`
    : `<${element.type}\n${attributes.map((attribute) => `${indent}${INDENT_STEP}${attribute}`).join('\n')}\n${indent}`;

  if (children === '') {
    return `${open}${fitsOnOneLine ? ' ' : ''}/>`;
  }
  return `${open}>\n${children}\n${indent}</${element.type}>`;
}

/**
 * One element in its parent's child list, wrapped in whatever its `visible` condition asks for.
 *
 * A condition that is statically false drops the element and says so: leaving it out silently would
 * read as a spec that never had it.
 */
export function emitChild(key: string, context: EmitContext, indent: string): string | null {
  const element = context.spec.elements[key];

  if (element?.visible === false) {
    addNote(context, `element "${key}" has visible:false, so it is left out`);
    return null;
  }

  const isConditional = element !== undefined && element.visible !== undefined && element.visible !== true;
  const tag = emitElementTag(key, context, isConditional ? indent + INDENT_STEP : indent);

  if (tag === null || !isConditional) {
    return tag;
  }

  const condition = emitCondition(element.visible, context);
  return `{${condition} && (\n${indent}${INDENT_STEP}${tag}\n${indent})}`;
}
