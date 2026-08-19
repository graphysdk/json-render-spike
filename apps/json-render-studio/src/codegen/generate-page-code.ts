import { collectUsedComponents } from '@json-render/codegen';
import type { Spec } from '@json-render/core';

import { createEmitContext, type EmitContext } from './context';
import { CHART_COMPONENT } from './emit-chart';
import { emitElementTag } from './emit-element';
import { emitCondition } from './emit-expression';
import { emitLiteral, INDENT_STEP } from './emit-value';
import { readSpecFacts, type SpecFacts } from './read-spec-facts';

/** Where the emitted page expects to find the catalog's components. */
const UI_IMPORT = '@/components/ui';

export interface GeneratedPageCode {
  /** The page as TSX source. */
  code: string;
  /** What the spec asked for that plain React cannot express, in the order it was met. */
  notes: string[];
}

/**
 * The engine reads a chart's data as a table, and a spec names its columns rather than carrying
 * them, so the rows have to say what they hold. A page whose rows arrive from state gets them one
 * render late, hence the default.
 */
const BUILD_CHART_DATA = `/** Rows as a viz-engine dataset, its columns the union of the keys the rows carry. */
function buildChartData(rows: Data['rows'] = []): Data {
  const keys = new Set(rows.flatMap((row) => Object.keys(row)));
  return { columns: [...keys].map((key) => ({ key })), rows };
}`;

const SET_BY_PATH = `/** A copy of \`target\` with the value at a JSON Pointer path replaced. */
function setByPath<T>(target: T, path: string, value: unknown): T {
  const segments = path.split('/').filter((segment) => segment !== '');
  const [head, ...rest] = segments;
  if (head === undefined) {
    return value as T;
  }

  const child = (target as Record<string, unknown> | undefined)?.[head];
  const next = rest.length === 0 ? value : setByPath(child, rest.join('/'), value);

  if (Array.isArray(target)) {
    const copy = [...target];
    copy[Number(head)] = next;
    return copy as T;
  }
  return { ...(target as Record<string, unknown>), [head]: next } as T;
}`;

function emitNotes(notes: string[]): string {
  if (notes.length === 0) {
    return '';
  }
  const lines = notes.map((note) => ` * - ${note}`);
  return ['/*', ' * Not carried over from the spec:', ...lines, ' */'].join('\n');
}

function emitImports(used: Set<string>, facts: SpecFacts, context: EmitContext): string[] {
  const uiComponents = [...used].filter((name) => name !== CHART_COMPONENT).sort();

  const reactImports = [facts.hasRepeat ? 'Fragment' : null, facts.writesState ? 'useState' : null].filter(
    (name): name is string => name !== null
  );

  const engineTypes = [
    context.helpers.has('buildChartData') ? 'Data' : null,
    context.specs.size > 0 ? 'SpecInput' : null,
  ]
    .filter((name): name is string => name !== null)
    .sort();

  const imports: string[] = [];
  if (reactImports.length > 0) {
    imports.push(`import { ${reactImports.join(', ')} } from 'react';`);
  }
  if (used.has(CHART_COMPONENT)) {
    imports.push(`import { GraphProvider, GraphRenderer } from '@graphysdk/react';`);
  }
  if (engineTypes.length > 0) {
    imports.push(`import type { ${engineTypes.join(', ')} } from '@graphysdk/viz-engine';`);
  }
  if (uiComponents.length > 0) {
    imports.push(`import { ${uiComponents.join(', ')} } from '${UI_IMPORT}';`);
  }
  return imports;
}

/** The chart specs the body lifted out of the component, each as its own constant. */
function emitHoistedSpecs(context: EmitContext): string {
  return [...context.specs.values()].map(({ name, source }) => `const ${name}: SpecInput = ${source};`).join('\n\n');
}

/** The body of the component's `return`, with the root's own visibility applied. */
function emitBody(spec: Spec, context: EmitContext): string {
  const bodyIndent = INDENT_STEP.repeat(2);
  const root = spec.elements[spec.root];

  if (root?.visible === false) {
    return 'return null;';
  }

  const tag = emitElementTag(spec.root, context, bodyIndent);
  if (tag === null) {
    return 'return null;';
  }

  if (root?.visible === undefined || root.visible === true) {
    return `return (\n${bodyIndent}${tag}\n${INDENT_STEP});`;
  }
  return `return ${emitCondition(root.visible, context)} ? (\n${bodyIndent}${tag}\n${INDENT_STEP}) : null;`;
}

/**
 * A generated spec as a standalone React page.
 *
 * The runtime resolves a spec on every render; this resolves it once, at export, so what comes out
 * has no json-render dependency left in it — `$state` paths become member access, `visible` becomes
 * a conditional, `repeat` becomes a map, and the state model becomes a hook. Whatever has no
 * equivalent is reported in `notes` and marked in the source rather than dropped, because a page
 * that quietly does less than its spec is the one failure this panel cannot help you see.
 */
export function generatePageCode(spec: Spec): GeneratedPageCode {
  if (!spec.root || spec.elements[spec.root] === undefined) {
    return { code: '// Nothing generated yet.', notes: [] };
  }

  const facts = readSpecFacts(spec);
  const used = collectUsedComponents(spec);
  const context = createEmitContext(spec, facts.writesState ? 'state' : 'initialState');

  // Emitting first, so the helpers and notes the body turns out to need are known before the
  // declarations above it are written.
  const body = emitBody(spec, context);

  const state = spec.state ?? {};
  const needsInitialState = facts.writesState || facts.readsState || Object.keys(state).length > 0;

  const component = [
    'export function Page() {',
    facts.writesState ? `${INDENT_STEP}const [state, setState] = useState(initialState);\n` : null,
    `${INDENT_STEP}${body}`,
    '}',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  const sections = [
    emitNotes(context.notes),
    emitImports(used, facts, context).join('\n'),
    needsInitialState ? `const initialState = ${emitLiteral(state, '')};` : '',
    emitHoistedSpecs(context),
    context.helpers.has('buildChartData') ? BUILD_CHART_DATA : '',
    context.helpers.has('setByPath') ? SET_BY_PATH : '',
    component,
  ].filter((section) => section !== '');

  return { code: `${sections.join('\n\n')}\n`, notes: context.notes };
}
