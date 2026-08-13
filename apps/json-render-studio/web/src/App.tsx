import { type FormEvent, type ReactElement, useEffect, useState } from 'react';

import { fetchStatus, fetchSystemPrompt, type StudioStatus } from './api';
import { PreviewBoundary } from './PreviewBoundary';
import { findStudioTarget } from './targets';
import { type GenerationControls, useGeneration } from './use-generation';

type InspectorPanel = 'spec' | 'stream' | 'prompt';

const INSPECTOR_PANELS: Array<{ id: InspectorPanel; label: string }> = [
  { id: 'spec', label: 'Spec' },
  { id: 'stream', label: 'Stream' },
  { id: 'prompt', label: 'System prompt' },
];

const DEFAULT_TARGET_ID = 'webapp';

export const App = (): ReactElement => {
  const [status, setStatus] = useState<StudioStatus | null>(null);
  const [targetId, setTargetId] = useState(DEFAULT_TARGET_ID);
  const [prompt, setPrompt] = useState('');
  const [panel, setPanel] = useState<InspectorPanel>('spec');
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null);

  const generation = useGeneration();
  const target = findStudioTarget(targetId);
  const streaming = generation.status === 'streaming';
  const hasSpec = generation.spec !== null && target !== undefined && !target.isEmpty(generation.spec);

  useEffect(() => {
    fetchStatus().then(setStatus, () => setStatus(null));
  }, []);

  // The prompt is the catalog's product; refetching per target is how you see a catalog edit land.
  useEffect(() => {
    setSystemPrompt(null);
    if (panel === 'prompt') {
      fetchSystemPrompt(targetId).then(setSystemPrompt, () => setSystemPrompt('Could not load the system prompt.'));
    }
  }, [panel, targetId]);

  const selectTarget = (nextTargetId: string) => {
    if (nextTargetId !== targetId) {
      // Specs are per-schema, so a target switch cannot carry the old one forward.
      generation.reset();
      setTargetId(nextTargetId);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (prompt.trim() !== '' && !streaming) {
      void generation.generate(targetId, prompt);
    }
  };

  const issues = generation.spec === null || target === undefined ? [] : target.findIssues(generation.spec);

  return (
    <div className="studio-shell">
      <header className="studio-header">
        <h1 className="studio-title">json-render studio</h1>
        <div className="studio-targets">
          {(status?.targets ?? []).map((option) => (
            <button
              key={option.id}
              type="button"
              className="studio-target"
              aria-pressed={option.id === targetId}
              onClick={() => selectTarget(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span className="studio-model">{status === null ? 'connecting…' : status.model}</span>
      </header>

      <div className="studio-body">
        <aside className="studio-sidebar">
          {status !== null && !status.hasApiKey && (
            <p className="studio-status studio-status--error">
              ANTHROPIC_API_KEY is not set. Add it to apps/json-render-studio/.env.
            </p>
          )}

          <p className="studio-blurb">{status?.targets.find((option) => option.id === targetId)?.blurb}</p>

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

          {!hasSpec && !streaming && target !== undefined && (
            <>
              <h2 className="studio-section-title">Try</h2>
              <div className="studio-examples">
                {target.examples.map((example) => (
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

        <main className="studio-preview">
          {hasSpec && target !== undefined && generation.spec !== null ? (
            <PreviewBoundary resetKey={targetId}>{target.renderPreview(generation.spec, streaming)}</PreviewBoundary>
          ) : (
            <p className="studio-empty">{streaming ? 'Generating…' : 'Nothing generated yet.'}</p>
          )}
        </main>
      </div>
    </div>
  );
};

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
