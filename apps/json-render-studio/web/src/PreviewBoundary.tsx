import { Component, type ErrorInfo, type ReactNode } from 'react';

interface PreviewBoundaryProps {
  /** Changing this clears an error the last spec caused, so the next one gets a fresh render. */
  resetKey: string;
  children: ReactNode;
}

interface PreviewBoundaryState {
  message: string | null;
}

/**
 * Keeps a generated spec from taking the studio with it.
 *
 * The whole point of the studio is to see what a model produced, including when that is a page that
 * throws — and a throw inside the preview unmounts the app, which also kills the fetch still
 * streaming into it, so the spec on screen ends up truncated and the real error invisible. A chart
 * carries its own boundary through `<GraphProvider>`; the element tree around it has none.
 */
export class PreviewBoundary extends Component<PreviewBoundaryProps, PreviewBoundaryState> {
  state: PreviewBoundaryState = { message: null };

  static getDerivedStateFromError(error: unknown): PreviewBoundaryState {
    return { message: error instanceof Error ? error.message : String(error) };
  }

  componentDidUpdate(previousProps: PreviewBoundaryProps): void {
    if (previousProps.resetKey !== this.props.resetKey && this.state.message !== null) {
      this.setState({ message: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[json-render-studio] preview threw', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.message !== null) {
      return (
        <div className="studio-preview-error">
          <strong>The preview threw.</strong>
          <p>{this.state.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}
