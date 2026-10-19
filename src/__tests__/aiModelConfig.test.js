import { describe, expect, it } from 'vitest';
import { GEMINI_TEXT_MODELS_SUPPORTED, buildGeminiModelCandidates } from '../../api/ai.js';

describe('Gemini model configuration', () => {
  it('excludes unsupported Gemma model names known to return 404', () => {
    expect(GEMINI_TEXT_MODELS_SUPPORTED).not.toContain('gemma-3n-e2b-it');
    expect(buildGeminiModelCandidates('gemma-3n-e2b-it')).not.toContain('gemma-3n-e2b-it');
  });

  it('keeps the requested model first', () => {
    const candidates = buildGeminiModelCandidates('gemini-2.5-flash');
    expect(candidates[0]).toBe('gemini-2.5-flash');
    expect(candidates).toContain('gemini-2.5-flash');
  });

  it('uses current Gemini 3.x flash models as audio fallbacks', () => {
    const candidates = buildGeminiModelCandidates('gemini-2.5-flash');
    // 2.5-* ditolak untuk API key baru (404), jadi model 3.x harus sudah ada
    // di rantai fallback dan diurutkan sebelum alias "-latest".
    expect(candidates).toContain('gemini-3.6-flash');
    expect(candidates.indexOf('gemini-3.6-flash')).toBeLessThan(candidates.indexOf('gemini-flash-latest'));
  });
});
