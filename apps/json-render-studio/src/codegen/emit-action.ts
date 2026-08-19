import { addNote, type EmitContext } from './context';
import { emitExpression } from './emit-expression';
import { emitString, INDENT_STEP } from './emit-value';
import { readStatePath } from './state-path';

/** Column past which a handler stops being written on one line. */
const WRAP_COLUMN = 110;

/** An `on` / `watch` binding, read defensively because a generated spec is not a validated one. */
interface ActionBinding {
  action?: string;
  params?: Record<string, unknown>;
  confirm?: unknown;
  onSuccess?: unknown;
  onError?: unknown;
  preventDefault?: boolean;
}

/**
 * Name the state updater reads the current value through.
 *
 * An action's parameters are resolved when it fires, not when the element rendered, so a `$state`
 * reference inside one has to read the updater's argument rather than the render's snapshot —
 * otherwise two actions on the same event both write from the same stale value.
 */
const UPDATER_ARGUMENT = 'current';

function readBindings(binding: unknown): ActionBinding[] {
  const bindings = Array.isArray(binding) ? binding : [binding];
  return bindings.filter((entry): entry is ActionBinding => typeof entry === 'object' && entry !== null);
}

function noteUnsupportedFields(binding: ActionBinding, context: EmitContext): void {
  if (binding.confirm !== undefined) {
    addNote(context, `the "${binding.action}" action asks for a confirmation dialog, which is not emitted`);
  }
  if (binding.onSuccess !== undefined || binding.onError !== undefined) {
    addNote(context, `the "${binding.action}" action has an onSuccess/onError handler, which is not emitted`);
  }
}

/** A state update, folded onto one line while it fits there. */
function emitUpdate(expression: string, indent: string): string {
  const inline = `setState((${UPDATER_ARGUMENT}) => ${expression});`;
  if (indent.length + inline.length <= WRAP_COLUMN) {
    return inline;
  }
  return `setState((${UPDATER_ARGUMENT}) =>\n${indent}${INDENT_STEP}${expression}\n${indent});`;
}

/** Statements for one action, or `null` when it has no standalone equivalent. */
function emitAction(binding: ActionBinding, context: EmitContext, indent: string): string | null {
  const params = binding.params ?? {};
  const statePath = typeof params.statePath === 'string' ? params.statePath : null;
  const updaterContext: EmitContext = { ...context, stateRoot: UPDATER_ARGUMENT };
  const emitParam = (value: unknown): string => emitExpression(value, updaterContext, indent, true);

  noteUnsupportedFields(binding, context);

  if (binding.action === 'setState' && statePath !== null) {
    context.helpers.add('setByPath');
    return emitUpdate(`setByPath(${UPDATER_ARGUMENT}, ${emitString(statePath)}, ${emitParam(params.value)})`, indent);
  }

  if (binding.action === 'pushState' && statePath !== null) {
    context.helpers.add('setByPath');
    const list = readStatePath(UPDATER_ARGUMENT, statePath);
    const appended = `setByPath(${UPDATER_ARGUMENT}, ${emitString(statePath)}, [...(${list} ?? []), ${emitParam(params.value)}])`;
    if (typeof params.clearStatePath !== 'string') {
      return emitUpdate(appended, indent);
    }
    return emitUpdate(`setByPath(${appended}, ${emitString(params.clearStatePath)}, '')`, indent);
  }

  if (binding.action === 'removeState' && statePath !== null) {
    context.helpers.add('setByPath');
    const list = readStatePath(UPDATER_ARGUMENT, statePath);
    const kept = `(${list} ?? []).filter((_, position) => position !== ${emitParam(params.index)})`;
    return emitUpdate(`setByPath(${UPDATER_ARGUMENT}, ${emitString(statePath)}, ${kept})`, indent);
  }

  addNote(
    context,
    binding.action === 'validateForm'
      ? 'the validateForm action has no standalone equivalent — the field checks in the spec have to be reimplemented'
      : `the "${binding.action ?? 'unnamed'}" action is not a built-in one, so its handler has to be written by hand`
  );
  return null;
}

/**
 * An event binding as an arrow function.
 *
 * Actions that cannot be carried over still leave the handler in place, marked, rather than
 * disappearing into a control that silently does nothing when pressed.
 */
export function emitEventHandler(binding: unknown, context: EmitContext, indent: string): string {
  const bindings = readBindings(binding);
  // Emitted at the indent the block form puts statements at. A handler that ends up on one line has
  // no continuation lines, so the indent it was measured against cannot show.
  const inner = indent + INDENT_STEP;
  const statements = bindings.map(
    (entry) => emitAction(entry, context, inner) ?? `// TODO: the "${entry.action ?? 'unnamed'}" action`
  );
  const preventsDefault = bindings.some((entry) => entry.preventDefault === true);
  const only = statements.length === 1 ? statements[0] : undefined;

  if (!preventsDefault && only !== undefined && !only.startsWith('//') && !only.includes('\n')) {
    return `() => ${only.replace(/;$/, '')}`;
  }

  const body = preventsDefault ? ['event.preventDefault();', ...statements] : statements;
  const argument = preventsDefault ? 'event' : '';
  return `(${argument}) => {\n${body.map((line) => `${inner}${line}`).join('\n')}\n${indent}}`;
}
