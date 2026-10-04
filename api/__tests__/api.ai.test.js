// Vitest tests for the /api/ai router and its Gemini model fallback logic.
// These exercise api/ai.js in isolation: no database, no supertest server and
// no real network calls (global.fetch is mocked per test).

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { Readable } from 'node:stream';

import handler, { buildGeminiModelCandidates } from '../ai.js';

/**
 * Build a minimal IncomingMessage-alike that readJson() can consume.
 * Omitting `body` forces the streaming branch to run.
 */
function makeReq({ url = '/', method = 'POST', rawBody, body } = {}) {
  const req = new Readable({ read() {} });
  req.url = url;
  req.method = method;
  if (body !== undefined) {
    req.body = body;
  } else {
    req.push(rawBody ?? '');
    req.push(null);
  }
  return req;
}

/** Minimal ServerResponse-alike capturing status/json calls. */
function makeRes() {
  const res = {
    statusCode: null,
    body: undefined,
    headersSent: false,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      this.headersSent = true;
      return this;
    },
    json(payload) {
      this.body = payload;
      this.headersSent = true;
      return this;
    },
  };
  return res;
}

function geminiErrorResponse(message) {
  return {
    ok: false,
    status: 403,
    json: async () => ({ error: { message } }),
  };
}

function geminiOkResponse(text) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
  };
}

const originalFetch = global.fetch;
const originalGeminiKey = process.env.GEMINI_API_KEY;

beforeEach(() => {
  process.env.GEMINI_API_KEY = 'test-gemini-key';
});

afterEach(() => {
  global.fetch = originalFetch;
  if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalGeminiKey;
  vi.restoreAllMocks();
});

describe('buildGeminiModelCandidates', () => {
  test('puts the requested model first', () => {
    const candidates = buildGeminiModelCandidates('gemini-3-pro-preview');
    expect(candidates[0]).toBe('gemini-3-pro-preview');
  });

  test('falls back to known-good models after the requested one', () => {
    const candidates = buildGeminiModelCandidates('gemini-2.5-flash');
    expect(candidates).toContain('gemini-2.5-pro');
    expect(candidates).toContain('gemini-2.0-flash');
  });

  test('skips a falsy model but still returns the fallback list', () => {
    const fallbackOnly = buildGeminiModelCandidates('gemini-2.5-flash');
    expect(buildGeminiModelCandidates('')).toEqual(fallbackOnly);
    expect(buildGeminiModelCandidates(null)).toEqual(fallbackOnly);
    expect(buildGeminiModelCandidates(undefined)).toEqual(fallbackOnly);
    expect(fallbackOnly[0]).toBe('gemini-2.5-flash');
  });

  test('never repeats a model', () => {
    const candidates = buildGeminiModelCandidates('gemini-2.5-flash');
    expect(new Set(candidates).size).toBe(candidates.length);
  });

  test('excludes the unsupported gemma-3n variants', () => {
    const candidates = buildGeminiModelCandidates('gemma-3n-e2b-it');
    expect(candidates).not.toContain('gemma-3n-e2b-it');
    expect(candidates).not.toContain('gemma-3n-e4b-it');
  });
});

describe('readJson body parsing', () => {
  test('rejects a malformed JSON body with 400', async () => {
    const res = makeRes();
    await handler(makeReq({ url: '/song-search', rawBody: '{ not json' }), res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Invalid request body');
  });

  test('rejects a song search without a title with 400', async () => {
    const res = makeRes();
    await handler(
      makeReq({ url: '/song-search', body: { artist: 'No Title Artist' } }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Title required');
  });

  test('rejects handleChat when neither prompt nor context is supplied', async () => {
    const res = makeRes();
    await handler(makeReq({ body: {} }), res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('prompt atau context diperlukan');
  });

  test('treats an empty body as {} rather than crashing', async () => {
    const res = makeRes();
    // Empty raw body -> readJson resolves {} -> prompt/context both empty.
    await handler(makeReq({ rawBody: '' }), res);

    expect(res.statusCode).toBe(400);
  });
});

describe('handleChat model fallback', () => {
  test('returns 500 when GEMINI_API_KEY is not configured', async () => {
    delete process.env.GEMINI_API_KEY;
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    const res = makeRes();
    await handler(makeReq({ body: { prompt: 'hello' } }), res);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('GEMINI_API_KEY tidak diset');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('returns the model that succeeded on the first attempt', async () => {
    global.fetch = vi.fn().mockResolvedValue(geminiOkResponse('halo'));

    const res = makeRes();
    await handler(
      makeReq({ body: { prompt: 'hi', model: 'gemini-2.5-flash' } }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.text).toBe('halo');
    expect(res.body.modelUsed).toBe('gemini-2.5-flash');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('falls through to the next model on a denied-access 403', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        geminiErrorResponse('The model is not allowed for project denied access')
      )
      .mockResolvedValueOnce(geminiOkResponse('second try works'));
    global.fetch = fetchMock;

    const res = makeRes();
    await handler(
      makeReq({ body: { prompt: 'hi', model: 'gemini-3-pro-preview' } }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.text).toBe('second try works');
    // First candidate denied, second candidate (gemini-2.5-flash) succeeded.
    expect(res.body.modelUsed).toBe('gemini-2.5-flash');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('stops immediately on a non-denied 400 error', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'Malformed request' } }),
    });
    global.fetch = fetchMock;

    const res = makeRes();
    await handler(makeReq({ body: { prompt: 'hi' } }), res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Malformed request');
    // A non-403 must not trigger a walk through the whole fallback list.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('reports the last error and attempted models when every candidate fails', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      geminiErrorResponse('project has been denied access for all models')
    );

    const res = makeRes();
    await handler(makeReq({ body: { prompt: 'hi' } }), res);

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('project has been denied access for all models');
    expect(Array.isArray(res.body.attemptedModels)).toBe(true);
    expect(res.body.attemptedModels.length).toBeGreaterThan(0);
    expect(res.body.attemptedModels[0]).toMatchObject({
      status: 403,
      message: 'project has been denied access for all models',
    });
    expect(res.body.suggestion).toMatch(/gemini-2\.5-flash/);
  });

  test('sends system and context as separate content parts', async () => {
    const fetchMock = vi.fn().mockResolvedValue(geminiOkResponse('ok'));
    global.fetch = fetchMock;

    const res = makeRes();
    await handler(
      makeReq({
        body: { system: 'be terse', context: 'song: Halo', prompt: 'what key?' },
      }),
      res
    );

    expect(res.statusCode).toBe(200);

    const [, init] = fetchMock.mock.calls[0];
    const contents = JSON.parse(init.body).contents;
    expect(contents).toHaveLength(3);
    expect(contents[0].parts[0].text).toBe('System: be terse');
    expect(contents[1].parts[0].text).toBe('Context:\nsong: Halo');
    expect(contents[2].parts[0].text).toBe('what key?');
  });
});

describe('handleChat method guard', () => {
  test('rejects a non-POST request with 405 and an Allow header', async () => {
    const res = makeRes();
    await handler(makeReq({ method: 'GET', body: {} }), res);

    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe('Method not allowed');
    expect(res.headers.Allow).toBe('POST');
  });
});