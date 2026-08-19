import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { z } from 'zod';

import { buildStudioUserPrompt } from '../../../server/src/build-user-prompt';
import { streamViaClaudeSubscription } from '../../../server/src/claude-subscription';
import { loadStudioConfig } from '../../../server/src/config';
import { SYSTEM_PROMPT } from '../../../server/src/system-prompt';
import { STUDIO_MODEL_IDS } from '../../../shared/studio-models';

const MAX_OUTPUT_TOKENS = 16_000;

/** A full page streams for minutes on the larger models; the platform default would cut it off. */
export const maxDuration = 300;

const generateRequestSchema = z.object({
  prompt: z.string().min(1),
  /** Present on a refinement; the model is then asked for patches against it rather than a new spec. */
  currentSpec: z.record(z.string(), z.unknown()).nullable().optional(),
  /** The model the client picked; the server's configured default when absent. */
  model: z.enum(STUDIO_MODEL_IDS).optional(),
});

export async function POST(request: Request): Promise<Response> {
  const parsed = generateRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: 'Expected { prompt: string, currentSpec?: object | null }.' }, { status: 400 });
  }

  const config = loadStudioConfig();
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
      return Response.json({ error: `Claude Code could not generate: ${describe(error)}` }, { status: 502 });
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
