import { query } from '@anthropic-ai/claude-agent-sdk';

export interface ClaudeSubscriptionRequest {
  readonly model: string;
  readonly system: string;
  readonly prompt: string;
  readonly maxOutputTokens: number;
}

/**
 * Streams a completion through the local Claude Code install, which authenticates with the
 * developer's Claude subscription instead of an API key.
 *
 * Claude Code is an agent and the studio wants one completion, so the session runs with no tools,
 * no filesystem settings and a single turn: what comes back is the model's text, chunk for chunk,
 * so the browser's patch reader cannot tell this path from the API one.
 */
export async function* streamViaClaudeSubscription(request: ClaudeSubscriptionRequest): AsyncIterable<string> {
  const session = query({
    prompt: request.prompt,
    options: {
      model: request.model,
      systemPrompt: request.system,
      tools: [],
      maxTurns: 1,
      includePartialMessages: true,
      settingSources: [],
      env: { ...process.env, CLAUDE_CODE_MAX_OUTPUT_TOKENS: String(request.maxOutputTokens) },
    },
  });

  for await (const message of session) {
    if (message.type === 'result' && message.subtype !== 'success') {
      throw new Error(`Claude Code ended the generation (${message.subtype}).`);
    }
    if (message.type !== 'stream_event') {
      continue;
    }
    const { event } = message;
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}
