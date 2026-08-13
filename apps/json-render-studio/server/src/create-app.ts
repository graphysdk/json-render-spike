import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { Hono } from 'hono';
import { z } from 'zod';

import { findTarget, listTargets } from './targets/index.js';
import { buildStudioUserPrompt } from './build-user-prompt.js';
import type { StudioConfig } from './config.js';

const MAX_OUTPUT_TOKENS = 16_000;

const generateRequestSchema = z.object({
  target: z.string().min(1),
  prompt: z.string().min(1),
  /** Present on a refinement; the model is then asked for patches against it rather than a new spec. */
  currentSpec: z.record(z.string(), z.unknown()).nullable().optional(),
});

export function createApp(config: StudioConfig): Hono {
  const app = new Hono();

  app.get('/api/status', (context) =>
    context.json({ model: config.model, hasApiKey: config.hasApiKey, targets: listTargets() })
  );

  // The prompt is the catalog's product, so expose it: tuning a component description is a
  // studio workflow, and the only way to see the effect is to read what the catalog emitted.
  app.get('/api/system-prompt/:target', (context) => {
    const target = findTarget(context.req.param('target'));
    return target === undefined ? context.text('Unknown target.', 404) : context.text(target.systemPrompt);
  });

  app.post('/api/generate', async (context) => {
    if (!config.hasApiKey) {
      return context.json({ error: 'ANTHROPIC_API_KEY is not set. Add it to apps/json-render-studio/.env.' }, 400);
    }

    const parsed = generateRequestSchema.safeParse(await context.req.json());
    if (!parsed.success) {
      return context.json({ error: 'Expected { target: string, prompt: string, currentSpec?: object | null }.' }, 400);
    }

    const target = findTarget(parsed.data.target);
    if (target === undefined) {
      return context.json({ error: `Unknown target "${parsed.data.target}".` }, 400);
    }

    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const result = streamText({
      model: anthropic(config.model),
      system: target.systemPrompt,
      prompt: buildStudioUserPrompt(target, parsed.data.prompt, parsed.data.currentSpec ?? null),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });

    return result.toTextStreamResponse();
  });

  return app;
}
