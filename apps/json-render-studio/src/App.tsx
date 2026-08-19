import { type FormEvent, type ReactElement, useEffect, useMemo, useRef, useState } from 'react';

import { CHART_STYLE_NAMES, type ChartStyleName, readChartStyleName } from '@graphysdk/json-render';

import { STUDIO_MODELS, type StudioModelId } from '../../shared/studio-models';

import { fetchSystemPrompt } from './api';
import { findChartIssues } from './chart-issues';
import { CodePanel } from './CodePanel';
import { EXAMPLE_PROMPTS, findPageIssues, isPageEmpty, type StudioIssue } from './page-spec';
import { PagePreview } from './PagePreview';
import { PreviewBoundary } from './PreviewBoundary';
import { type GenerationControls, useGeneration } from './use-generation';

type InspectorPanel = 'spec' | 'stream' | 'prompt';

const INSPECTOR_PANELS: Array<{ id: InspectorPanel; label: string }> = [
  { id: 'spec', label: 'Spec' },
  { id: 'stream', label: 'Stream' },
  { id: 'prompt', label: 'System prompt' },
];

/** What the main surface is showing: the page running, or the page as source. */
type Surface = 'preview' | 'code';

const SURFACES: Array<{ id: Surface; label: string }> = [
  { id: 'preview', label: 'Preview' },
  { id: 'code', label: 'Code' },
];

export const App = (): ReactElement => {
  const [prompt, setPrompt] = useState('');
  const [panel, setPanel] = useState<InspectorPanel>('spec');
  const [surface, setSurface] = useState<Surface>('preview');
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null);
  const [chartStyle, setChartStyle] = useState<ChartStyleName | undefined>(undefined);
  const [model, setModel] = useState<StudioModelId>('claude-opus-5');

  const generation = useGeneration();
  const streaming = generation.status === 'streaming';
  const hasSpec = generation.spec !== null && !isPageEmpty(generation.spec);

  // The prompt is the catalog's product; refetching on open is how you see a catalog edit land.
  useEffect(() => {
    setSystemPrompt(null);
    if (panel === 'prompt') {
      fetchSystemPrompt().then(setSystemPrompt, () => setSystemPrompt('Could not load the system prompt.'));
    }
  }, [panel]);

  const send = () => {
    if (prompt.trim() !== '' && !streaming) {
      hasAutoRepairedRef.current = false;
      void generation.generate(prompt, model);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    send();
  };

  // A half-streamed spec fails validation by definition — dangling children, empty elements the model
  // has not reached yet — so issues only mean something once the stream settles. Charts additionally
  // get a headless compile, so a spec the renderer would reject is named in the sidebar too.
  const issues = useMemo(
    () =>
      generation.spec === null || streaming
        ? []
        : [...findPageIssues(generation.spec), ...findChartIssues(generation.spec)],
    [generation.spec, streaming]
  );

  // One automatic repair per user prompt: when a finished generation leaves charts the compiler
  // rejects, refine once with the diagnostics. A repair that fails again is the user's call.
  const hasAutoRepairedRef = useRef(false);
  const [isAutoRepairing, setIsAutoRepairing] = useState(false);
  useEffect(() => {
    if (generation.status !== 'streaming' && isAutoRepairing) {
      setIsAutoRepairing(false);
    }
    if (generation.status !== 'done' || hasAutoRepairedRef.current) {
      return;
    }
    const chartErrors = issues.filter((issue) => issue.severity === 'error' && issue.message.startsWith('Chart "'));
    if (chartErrors.length === 0) {
      return;
    }
    hasAutoRepairedRef.current = true;
    setIsAutoRepairing(true);
    void generation.generate(buildRepairPrompt(chartErrors), model);
  }, [generation, issues, isAutoRepairing, model]);

  return (
    <div className="studio-shell">
      <header className="studio-header">
        <h1 className="studio-title">
          json-render <span className="studio-title-x">×</span> <span className="studio-title-brand">Graphy</span>
        </h1>
        <div className="studio-seg">
          {SURFACES.map((option) => (
            <button
              key={option.id}
              type="button"
              className="studio-seg-tab"
              aria-pressed={surface === option.id}
              onClick={() => setSurface(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <div className="studio-body">
        <aside className="studio-sidebar">
          <form className="studio-form" onSubmit={submit}>
            <textarea
              autoFocus
              className="studio-prompt"
              value={prompt}
              placeholder={hasSpec ? 'Describe a change…' : 'Describe what to build…'}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                // Enter sends, Shift+Enter breaks the line — the convention every AI input has taught.
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
            />
            <div className="studio-actions">
              <button type="submit" className="studio-button studio-button--primary" disabled={streaming}>
                {hasSpec ? 'Refine' : 'Generate'}
              </button>
              {streaming && (
                <button type="button" className="studio-button" onClick={generation.stop}>
                  Stop
                </button>
              )}
              {hasSpec && !streaming && (
                <button
                  type="button"
                  className="studio-button"
                  onClick={() => {
                    hasAutoRepairedRef.current = false;
                    generation.reset();
                  }}
                >
                  Clear
                </button>
              )}
              <div className="studio-actions-end">
                <label className="studio-inline-picker">
                  <span className="studio-inline-label">Model</span>
                  <select
                    className="studio-select studio-select--ghost"
                    value={model}
                    onChange={(event) => setModel(event.target.value as StudioModelId)}
                  >
                    {STUDIO_MODELS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="studio-inline-picker">
                  <span className="studio-inline-label">Style</span>
                  <select
                    className="studio-select studio-select--ghost"
                    value={chartStyle ?? ''}
                    onChange={(event) => setChartStyle(readChartStyleName(event.target.value))}
                  >
                    <option value="">Auto</option>
                    {CHART_STYLE_NAMES.map((name) => (
                      <option key={name} value={name}>
                        {formatStyleLabel(name)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            {(generation.error !== null || isAutoRepairing) && (
              <p className={generation.error === null ? 'studio-status' : 'studio-status studio-status--error'}>
                {generation.error ?? 'Repairing charts…'}
              </p>
            )}
          </form>

          {!hasSpec && !streaming && (
            <section className="studio-section">
              <h2 className="studio-section-title">Try</h2>
              <div className="studio-examples">
                {EXAMPLE_PROMPTS.map((example) => (
                  <button key={example} type="button" className="studio-example" onClick={() => setPrompt(example)}>
                    {example}
                  </button>
                ))}
              </div>
            </section>
          )}

          {issues.length > 0 && (
            <section className="studio-section">
              <h2 className="studio-section-title">Issues</h2>
              <ul className="studio-issues">
                {issues.map((issue) => (
                  <li
                    key={`${issue.severity}:${issue.message}`}
                    className={issue.severity === 'error' ? 'studio-issue studio-issue--error' : 'studio-issue'}
                  >
                    {issue.message}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="studio-inspector">
            <div className="studio-tabs">
              {INSPECTOR_PANELS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="studio-tab"
                  aria-pressed={panel === option.id}
                  onClick={() => setPanel(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <pre className="studio-code">{readPanel(panel, generation, systemPrompt)}</pre>
          </div>
        </aside>

        <main className="studio-main">
          {!hasSpec || generation.spec === null ? (
            <p className="studio-empty">{streaming ? 'Generating…' : 'Nothing generated yet.'}</p>
          ) : surface === 'code' ? (
            <CodePanel spec={generation.spec} />
          ) : (
            <div className="studio-preview">
              <PreviewBoundary resetKey={generation.status}>
                <PagePreview spec={generation.spec} isStreaming={streaming} chartStyle={chartStyle} />
              </PreviewBoundary>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

function buildRepairPrompt(chartErrors: StudioIssue[]): string {
  return [
    'Some charts failed to compile. Fix only the broken chart props; change nothing else on the page.',
    ...chartErrors.map((issue) => `- ${issue.message}`),
  ].join('\n');
}

function formatStyleLabel(name: string): string {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function readPanel(panel: InspectorPanel, generation: GenerationControls, systemPrompt: string | null): string {
  if (panel === 'prompt') {
    return systemPrompt ?? 'Loading…';
  }
  if (panel === 'stream') {
    return generation.rawStream === '' ? 'Nothing streamed yet.' : generation.rawStream;
  }
  return generation.spec === null ? 'No spec yet.' : JSON.stringify(generation.spec, null, 2);
}
