import { describe, expect, it } from 'vitest';
import { GEMINI_TEXT_MODELS_SUPPORTED, buildGeminiModelCandidates } from '../../api/ai.js';

describe('Gemini model configuration', () => {
  it('excludes unsupported Gemma model names known to return 404', () => {
    expect(GEMINI_TEXT_MODELS_SUPPORTED).not.toContain('gemma-3n-e2b-it');
    expect(buildGeminiModelCandidates('gemma-3n-e2b-it')).not.toContain('gemma-3n-e2b-it');
  });

  it('keeps a safe default fallback model', () => {
    const candidates = buildGeminiModelCandidates('gemini-2.5-flash');
    expect(candidates[0]).toBe('gemini-2.5-flash');
    expect(candidates).toContain('gemini-2.5-flash');
  });
});
