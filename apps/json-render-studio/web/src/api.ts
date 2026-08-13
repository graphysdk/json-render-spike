export interface TargetSummary {
  id: string;
  label: string;
  blurb: string;
}

export interface StudioStatus {
  model: string;
  hasApiKey: boolean;
  targets: TargetSummary[];
}

export async function fetchStatus(): Promise<StudioStatus> {
  const response = await fetch('/api/status');
  if (!response.ok) {
    throw new Error(`Status request failed (${response.status}).`);
  }
  return (await response.json()) as StudioStatus;
}

export async function fetchSystemPrompt(targetId: string): Promise<string> {
  const response = await fetch(`/api/system-prompt/${targetId}`);
  if (!response.ok) {
    throw new Error(`System prompt request failed (${response.status}).`);
  }
  return response.text();
}

export interface GenerateRequest {
  target: string;
  prompt: string;
  currentSpec: Record<string, unknown> | null;
  signal: AbortSignal;
}

/**
 * Opens the JSONL stream.
 *
 * Errors arrive as JSON before the stream starts, so the body is only handed back once the response
 * is known good — a failed generation should surface its message, not an empty spec.
 */
export async function openGenerationStream(request: GenerateRequest): Promise<ReadableStream<Uint8Array>> {
  const { signal, ...body } = request;
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const failure = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(failure?.error ?? `Generation failed (${response.status}).`);
  }
  if (response.body === null) {
    throw new Error('Generation returned an empty response.');
  }

  return response.body;
}
