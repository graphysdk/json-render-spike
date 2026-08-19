import { describe, expect, it } from 'vitest';

import { buildStudioUserPrompt } from './build-user-prompt';

describe('buildStudioUserPrompt', () => {
  it('appends the patch-ordering reminder on a fresh generation', () => {
    const prompt = buildStudioUserPrompt('a revenue dashboard', null);

    expect(prompt).toContain('a revenue dashboard');
    expect(prompt).toContain('/root first');
    expect(prompt).not.toContain('Change request');
  });

  it('sends the current spec and asks for patches when refining', () => {
    const prompt = buildStudioUserPrompt('make the bars horizontal', { root: 'page' });

    expect(prompt).toContain('"root": "page"');
    expect(prompt).toContain('Change request: make the bars horizontal');
    expect(prompt).toContain('ONLY the JSON Patch operations');
    // The fresh-generation reminder would tell the model to start over.
    expect(prompt).not.toContain('/root first');
  });

  it('truncates a prompt long enough to crowd out the spec', () => {
    const prompt = buildStudioUserPrompt('x'.repeat(9000), null);

    expect(prompt).not.toContain('x'.repeat(4001));
  });
});
