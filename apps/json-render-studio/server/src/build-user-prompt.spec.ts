import { describe, expect, it } from 'vitest';

import type { GenerationTarget } from './targets/index.js';
import { buildStudioUserPrompt } from './build-user-prompt.js';

const target: GenerationTarget = {
  id: 'dashboard',
  label: 'Test target',
  blurb: 'Test target',
  systemPrompt: 'unused',
  orderingReminder: 'Remember: /document first.',
};

describe('buildStudioUserPrompt', () => {
  it('appends the target ordering reminder on a fresh generation', () => {
    const prompt = buildStudioUserPrompt(target, 'a revenue dashboard', null);

    expect(prompt).toContain('a revenue dashboard');
    expect(prompt).toContain('Remember: /document first.');
    expect(prompt).not.toContain('Change request');
  });

  it('sends the current spec and asks for patches when refining', () => {
    const prompt = buildStudioUserPrompt(target, 'make the bars horizontal', { charts: [{ id: 'trend' }] });

    expect(prompt).toContain('"id": "trend"');
    expect(prompt).toContain('Change request: make the bars horizontal');
    expect(prompt).toContain('ONLY the JSON Patch operations');
    // The fresh-generation reminder would tell the model to start over.
    expect(prompt).not.toContain('Remember: /document first.');
  });

  it('truncates a prompt long enough to crowd out the spec', () => {
    const prompt = buildStudioUserPrompt(target, 'x'.repeat(9000), null);

    expect(prompt).not.toContain('x'.repeat(4001));
  });
});
