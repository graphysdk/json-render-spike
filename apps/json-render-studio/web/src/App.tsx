import { type FormEvent, type ReactElement, useEffect, useState } from 'react';

import { CHART_STYLE_NAMES, type ChartStyleName, readChartStyleName } from '@graphysdk/json-render';

import { fetchStatus, fetchSystemPrompt, type StudioStatus } from './api';
import { CodePanel } from './CodePanel';
import { EXAMPLE_PROMPTS, findPageIssues, isPageEmpty } from './page-spec';
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

const BLURB =
  'shadcn/ui components with state and actions. GraphyChart is one of the 37, and carries the whole grammar of graphics.';

export const App = (): ReactElement => {
  const [status, setStatus] = useState<StudioStatus | null>(null);
  const [prompt, setPrompt] = useState('');
  const [panel, setPanel] = useState<InspectorPanel>('spec');
  const [surface, setSurface] = useState<Surface>('preview');
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null);
  const [chartStyle, setChartStyle] = useState<ChartStyleName | undefined>(undefined);

  const generation = useGeneration();
  const streaming = generation.status === 'streaming';
  const hasSpec = generation.spec !== null && !isPageEmpty(generation.spec);

  useEffect(() => {
    fetchStatus().then(setStatus, () => setStatus(null));
  }, []);

  // The prompt is the catalog's product; refetching on open is how you see a catalog edit land.
  useEffect(() => {
    setSystemPrompt(null);
    if (panel === 'prompt') {
      fetchSystemPrompt().then(setSystemPrompt, () => setSystemPrompt('Could not load the system prompt.'));
    }
  }, [panel]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (prompt.trim() !== '' && !streaming) {
      void generation.generate(prompt);
    }
  };

  const issues = generation.spec === null ? [] : findPageIssues(generation.spec);

  return (
    <div className="studio-shell">
      <header className="studio-header">
        <h1 className="studio-title">json-render studio</h1>
        <span className="studio-model">{status === null ? 'connecting…' : describeStatus(status)}</span>
      </header>

      <div className="studio-body">
        <aside className="studio-sidebar">
          <p className="studio-blurb">{BLURB}</p>

          <form className="studio-inspector" onSubmit={submit}>
            <textarea
              className="studio-prompt"
              value={prompt}
              placeholder={hasSpec ? 'Describe a change…' : 'Describe what to build…'}
              onChange={(event) => setPrompt(event.target.value)}
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
                <button type="button" className="studio-button" onClick={generation.reset}>
                  Clear
                </button>
              )}
            </div>
          </form>

          <p className={generation.error === null ? 'studio-status' : 'studio-status studio-status--error'}>
            {generation.error ?? describeProgress(generation)}
          </p>

          <label className="studio-style-picker">
            <span className="studio-section-title">Chart style</span>
            <select
              className="studio-style-select"
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

          {!hasSpec && !streaming && (
            <>
              <h2 className="studio-section-title">Try</h2>
              <div className="studio-examples">
                {EXAMPLE_PROMPTS.map((example) => (
                  <button key={example} type="button" className="studio-example" onClick={() => setPrompt(example)}>
                    {example}
                  </button>
                ))}
              </div>
            </>
          )}

          {issues.length > 0 && (
            <>
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
            </>
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
          <div className="studio-surface-tabs">
            {SURFACES.map((option) => (
              <button
                key={option.id}
                type="button"
                className="studio-surface-tab"
                aria-pressed={surface === option.id}
                onClick={() => setSurface(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>

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

function formatStyleLabel(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function describeStatus(status: StudioStatus): string {
  // Which credentials are paying for a generation is worth seeing before you fire one off.
  const source = status.credentials === 'claude-subscription' ? ' · Claude subscription' : '';
  return `${status.model}${source}`;
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

function describeProgress(generation: GenerationControls): string {
  const { status, patchCount, droppedLines } = generation;
  // A dropped line is a patch the model emitted and the compiler could not parse. Saying so beats
  // leaving the reader to work out why the page has a hole in it.
  const dropped = droppedLines > 0 ? ` — ${droppedLines} unparseable lines dropped` : '';

  if (status === 'streaming') {
    return `Streaming… ${patchCount} patches applied${dropped}`;
  }
  if (status === 'done') {
    return `Done — ${patchCount} patches applied${dropped}`;
  }
  return 'Idle';
}
