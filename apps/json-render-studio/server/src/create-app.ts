import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { Hono } from 'hono';
import { z } from 'zod';

import { STUDIO_MODEL_IDS } from '../../shared/studio-models.js';

import { buildStudioUserPrompt } from './build-user-prompt.js';
import { streamViaClaudeSubscription } from './claude-subscription.js';
import type { StudioConfig } from './config.js';
import { SYSTEM_PROMPT } from './system-prompt.js';

const MAX_OUTPUT_TOKENS = 16_000;

const generateRequestSchema = z.object({
  prompt: z.string().min(1),
  /** Present on a refinement; the model is then asked for patches against it rather than a new spec. */
  currentSpec: z.record(z.string(), z.unknown()).nullable().optional(),
  /** The model the client picked; the server's configured default when absent. */
  model: z.enum(STUDIO_MODEL_IDS).optional(),
});

export function createApp(config: StudioConfig): Hono {
  const app = new Hono();

  app.get('/api/status', (context) => context.json({ model: config.model, credentials: config.credentials }));

  // The prompt is the catalog's product, so expose it: tuning a component description is a
  // studio workflow, and the only way to see the effect is to read what the catalog emitted.
  app.get('/api/system-prompt', (context) => context.text(SYSTEM_PROMPT));

  app.post('/api/generate', async (context) => {
    const parsed = generateRequestSchema.safeParse(await context.req.json());
    if (!parsed.success) {
      return context.json({ error: 'Expected { prompt: string, currentSpec?: object | null }.' }, 400);
    }

    const prompt = buildStudioUserPrompt(parsed.data.prompt, parsed.data.currentSpec ?? null);
    const model = parsed.data.model ?? config.model;

    if (config.credentials === 'claude-subscription') {
      try {
        return await respondWithText(
          streamViaClaudeSubscription({
            model,
            system: SYSTEM_PROMPT,
            prompt,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
          })
        );
      } catch (error) {
        return context.json({ error: `Claude Code could not generate: ${describe(error)}` }, 502);
      }
    }

    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const result = streamText({
      model: anthropic(model),
      system: SYSTEM_PROMPT,
      prompt,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });

    return result.toTextStreamResponse();
  });

  return app;
}

/**
 * Sends text as it arrives, but waits for the first chunk before answering: Claude Code reports a
 * missing login on that read, and a message the studio can show beats a stream that ends empty.
 */
async function respondWithText(chunks: AsyncIterable<string>): Promise<Response> {
  const reader = chunks[Symbol.asyncIterator]();
  const first = await reader.next();
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (let step = first; !step.done; step = await reader.next()) {
          controller.enqueue(encoder.encode(step.value));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
    cancel: () => {
      // Ends the Claude Code session rather than leaving it running for a browser that walked away.
      void reader.return?.();
    },
  });

  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
