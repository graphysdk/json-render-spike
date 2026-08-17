import { type ReactElement, useEffect, useMemo, useState } from 'react';

import { generatePageCode } from './codegen/generate-page-code';
import { asElementTree } from './page-spec';

/** How long the copy button stays acknowledged, in ms. */
const COPIED_FOR_MS = 1500;

/**
 * The spec as the page it describes.
 *
 * Generated on mount rather than alongside the preview: the panel is one of two the main surface
 * switches between, so the spec only has to be resolved into source while that source is on screen.
 */
export const CodePanel = ({ spec }: { spec: Record<string, unknown> }): ReactElement => {
  const { code, notes } = useMemo(() => generatePageCode(asElementTree(spec)), [spec]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = window.setTimeout(() => setCopied(false), COPIED_FOR_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = (): void => {
    void navigator.clipboard.writeText(code).then(
      () => setCopied(true),
      () => setCopied(false)
    );
  };

  return (
    <div className="studio-code-panel">
      <div className="studio-code-bar">
        <span className="studio-code-name">page.tsx</span>
        {notes.length > 0 && (
          <span className="studio-code-notes" title={notes.join('\n')}>
            {notes.length} not carried over
          </span>
        )}
        <button type="button" className="studio-button studio-code-copy" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="studio-source">{code}</pre>
    </div>
  );
};
