/* eslint-disable no-template-curly-in-string --
   `${...}` appears here as the source these tests assert on, not as an interpolation they meant. */
import type { Spec } from '@json-render/core';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { generatePageCode } from './generate-page-code';

const dashboard: Spec = {
  root: 'page',
  elements: {
    page: {
      type: 'Stack',
      props: { direction: 'vertical', gap: 'md', align: 'stretch' },
      children: ['heading', 'card'],
    },
    heading: { type: 'Heading', props: { content: 'Bike share', level: 1 } },
    card: { type: 'Card', props: { title: 'Daily rides' }, children: ['chart'] },
    chart: {
      type: 'GraphyChart',
      props: {
        rows: { $state: '/data/rides' },
        height: 280,
        spec: {
          mapping: { x: 'day', y: 'rides' },
          layers: [{ type: 'layer', geom: 'line' }],
          scales: [
            { type: 'scale', scaledAesthetic: 'x', scaleType: 'inferred' },
            { type: 'scale', scaledAesthetic: 'y', scaleType: 'continuous', zero: true },
          ],
        },
      },
    },
  },
  state: {
    data: {
      rides: [
        { day: 'Mon', rides: 120 },
        { day: 'Tue', rides: 140 },
      ],
    },
  },
};

describe('generatePageCode', () => {
  it('holds an empty spec', () => {
    expect(generatePageCode({ root: '', elements: {} }).code).toBe('// Nothing generated yet.');
  });

  it('emits a page whose imports name only the components used', () => {
    const { code } = generatePageCode(dashboard);

    expect(code).toContain("import { GraphProvider, GraphRenderer } from '@graphysdk/react';");
    expect(code).toContain("import type { Data, SpecInput } from '@graphysdk/viz-engine';");
    expect(code).toContain("import { Card, Heading, Stack } from '@/components/ui';");
    expect(code).not.toContain("from 'react'");
    expect(code).not.toContain('@graphysdk/json-render');
  });

  it('resolves a $state reference to the access it stands for', () => {
    const { code } = generatePageCode(dashboard);

    expect(code).toContain('data={buildChartData(initialState.data?.rides)}');
    expect(code).not.toContain('$state');
  });

  it('reads state straight off the initial value when nothing writes to it', () => {
    const { code } = generatePageCode(dashboard);

    expect(code).toContain('const initialState = {');
    expect(code).not.toContain('useState');
  });

  it('paints a chart with the engine, not with the registry component the spec named', () => {
    const { code } = generatePageCode(dashboard);

    expect(code).toContain('<div style={{ height: 280 }}>');
    expect(code).toContain('<GraphProvider input={chartSpec} data={buildChartData(initialState.data?.rides)}>');
    expect(code).toContain('<GraphRenderer />');
    expect(code).not.toContain('<GraphyChart');
  });

  it('lifts a fixed spec out of the component, where it is built once rather than per render', () => {
    const { code } = generatePageCode(dashboard);

    expect(code).toContain('const chartSpec: SpecInput = {');
    expect(code).toContain("{ type: 'layer', geom: 'line' }");
    expect(code).toContain("{ type: 'scale', scaledAesthetic: 'y', scaleType: 'continuous', zero: true }");
  });

  it('completes the spec with the fields the engine requires and the component was filling', () => {
    const { code } = generatePageCode(dashboard);

    expect(code).toContain('transforms: []');
    expect(code).toContain('highlights: []');
  });

  it('gives a chart the height the engine would otherwise have to guess', () => {
    const spec: Spec = {
      root: 'chart',
      elements: { chart: { type: 'GraphyChart', props: { rows: [], spec: { mapping: {}, layers: [], scales: [] } } } },
    };

    expect(generatePageCode(spec).code).toContain('<div style={{ height: 320 }}>');
  });

  it('builds the spec in place when it reads something that changes per render', () => {
    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'Stack', props: {}, repeat: { statePath: '/cities' }, children: ['chart'] },
        chart: {
          type: 'GraphyChart',
          props: {
            rows: { $item: 'data' },
            spec: {
              mapping: { x: 'month' },
              layers: [{ type: 'layer', geom: 'bar' }],
              scales: [{ type: 'scale', scaledAesthetic: 'x', scaleType: 'discrete' }],
              config: { content: { title: { $item: 'name' } } },
            },
          },
        },
      },
      state: { cities: [{ name: 'Lisbon', data: [] }] },
    };
    const { code } = generatePageCode(spec);

    expect(code).toContain('config: { content: { title: item.name } }');
    expect(code).toContain('data={buildChartData(item.data)}');
    expect(code).not.toContain('SpecInput');
  });

  it('reports nothing to carry over for a spec that translates whole', () => {
    expect(generatePageCode(dashboard).notes).toEqual([]);
  });
});

const form: Spec = {
  root: 'page',
  elements: {
    page: { type: 'Stack', props: {}, children: ['email', 'summary'] },
    email: { type: 'Input', props: { label: 'Email', value: { $bindState: '/form/email' } } },
    summary: {
      type: 'Text',
      props: { content: { $template: 'Signing up ${/form/email}' } },
      visible: { $state: '/form/email' },
    },
  },
  state: { form: {} },
};

const todos: Spec = {
  root: 'page',
  elements: {
    page: { type: 'Stack', props: {}, children: ['list', 'add'] },
    list: { type: 'Stack', props: {}, repeat: { statePath: '/todos', key: 'id' }, children: ['row'] },
    row: { type: 'Text', props: { content: { $item: 'label' }, position: { $index: true } } },
    add: {
      type: 'Button',
      props: { label: 'Add' },
      on: { press: { action: 'pushState', params: { statePath: '/todos', value: { id: '$id', label: 'New' } } } },
    },
  },
  state: { todos: [{ id: 'a', label: 'Write it down' }] },
};

describe('generatePageCode, state the page writes', () => {
  it('lifts the state into a hook', () => {
    const { code } = generatePageCode(form);

    expect(code).toContain("import { useState } from 'react';");
    expect(code).toContain('const [state, setState] = useState(initialState);');
  });

  it('pairs a two-way binding with the handler that writes it back', () => {
    const { code } = generatePageCode(form);

    expect(code).toContain('value={state.form?.email}');
    expect(code).toContain("onValueChange={(next) => setState((current) => setByPath(current, '/form/email', next))}");
    expect(code).toContain('function setByPath<T>(target: T, path: string, value: unknown): T {');
  });

  it('turns a template into a template literal and a condition into a guard', () => {
    const { code } = generatePageCode(form);

    expect(code).toContain('content={`Signing up ${state.form?.email}`}');
    expect(code).toContain('{Boolean(state.form?.email) && (');
  });
});

describe('generatePageCode, repeats and actions', () => {
  it('maps the repeat over the state array, keyed by the field the spec named', () => {
    const { code } = generatePageCode(todos);

    expect(code).toContain("import { Fragment, useState } from 'react';");
    expect(code).toContain('{state.todos?.map((item, index) => (');
    expect(code).toContain('<Fragment key={item.id}>');
    expect(code).toContain('content={item.label}');
    expect(code).toContain('position={index}');
  });

  it('translates a built-in action into the state update it performs', () => {
    const { code } = generatePageCode(todos);

    expect(code).toContain(
      "setByPath(current, '/todos', [...(current.todos ?? []), { id: crypto.randomUUID(), label: 'New' }])"
    );
  });

  it('reads an action parameter off the updater rather than the render it was bound in', () => {
    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'Stack', props: {}, children: ['add'] },
        add: {
          type: 'Button',
          props: { label: 'Add' },
          on: { press: { action: 'pushState', params: { statePath: '/todos', value: { $state: '/draft' } } } },
        },
      },
      state: { draft: '', todos: [] },
    };

    expect(generatePageCode(spec).code).toContain('...(current.todos ?? []), current.draft');
  });

  it('writes a binding on a repeat item back through the pointer the item came from', () => {
    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'Stack', props: {}, repeat: { statePath: '/todos' }, children: ['check'] },
        check: { type: 'Checkbox', props: { checked: { $bindItem: 'done' }, visible: true } },
      },
      state: { todos: [{ done: false }] },
    };

    expect(generatePageCode(spec).code).toContain(
      'onCheckedChange={(next) => setState((current) => setByPath(current, `/todos/${index}/done`, next))}'
    );
  });

  it('negates a truthiness test without coercing it twice', () => {
    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'Stack', props: {}, repeat: { statePath: '/todos' }, children: ['label'] },
        label: { type: 'Text', props: { content: 'Todo' }, visible: { $item: 'done', not: true } },
      },
      state: { todos: [{ done: false }] },
    };

    expect(generatePageCode(spec).code).toContain('{!item.done && (');
  });

  it('names an action it cannot carry over rather than dropping the handler', () => {
    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'Stack', props: {}, children: ['submit'] },
        submit: { type: 'Button', props: { label: 'Submit' }, on: { press: { action: 'validateForm' } } },
      },
    };
    const { code, notes } = generatePageCode(spec);

    expect(notes).toEqual([expect.stringContaining('validateForm')]);
    expect(code).toContain('// TODO: the "validateForm" action');
    expect(code).toContain('Not carried over from the spec:');
  });
});

/**
 * The panel's one hard promise: whatever it shows is real TSX.
 *
 * Every assertion above reads one fragment of the output, which is exactly how a page that parses
 * nowhere still passes a suite — so the whole file goes through the compiler's parser as well.
 */
describe('generatePageCode, syntax', () => {
  const parseErrors = (code: string): string[] => {
    const result = ts.transpileModule(code, {
      fileName: 'page.tsx',
      reportDiagnostics: true,
      compilerOptions: { jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext },
    });
    return (result.diagnostics ?? []).map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '));
  };

  it.each([
    ['a dashboard', dashboard],
    ['a form', form],
    ['a repeat with actions', todos],
  ])('emits %s as TSX that parses', (_label, spec) => {
    expect(parseErrors(generatePageCode(spec).code)).toEqual([]);
  });
});
