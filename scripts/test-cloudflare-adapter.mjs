#!/usr/bin/env node
/**
 * Smoke test for the Cloudflare adapter (no Wrangler/network needed).
 *
 * Proves that `cloudflare/worker.js` routes Web `Request`s through the same
 * handlers used on Vercel, and that env vars are read per request from the
 * Cloudflare-style `env` bag instead of `process.env`.
 *
 * Run: npm run test:cloudflare
 */

import assert from 'node:assert/strict';
import worker from '../cloudflare/worker.js';
import { getReqEnv } from '../api/_core/env.js';
import { verifyToken } from '../api/_auth.js';
import { readJson } from '../api/_core/body.js';
import { matchRoute } from '../api/_core/router.js';
import { uuid } from '../api/_core/crypto.js';

// `NODE_ENV: 'test'` makes handlers skip JWT + return a mock DB client, so this
// file exercises routing/body/env plumbing without credentials.
const env = { NODE_ENV: 'test' };

async function call(path, init = {}) {
  return worker.fetch(new Request(`https://example.com${path}`, init), env);
}

// 1. Status endpoint (no auth, no DB).
const status = await call('/api/status');
assert.equal(status.status, 200);
const statusBody = await status.json();
assert.equal(statusBody.status, 'ok');

// 2. Unknown API route -> JSON 404 (not the SPA).
const missing = await call('/api/does-not-exist');
assert.equal(missing.status, 404);
assert.match(missing.headers.get('content-type') || '', /application\/json/);

// 3. Protected route + per-request env bag. `NODE_ENV: 'test'` in the Cloudflare
//    env bag bypasses JWT and returns the mock Turso client, so a 200 proves the
//    handler saw `req.rpEnv` (a module-level `process.env` read would 401).
const guarded = await call('/api/songs', { method: 'GET' });
assert.equal(guarded.status, 200, 'JWT bypassed via per-request env; Turso mocked');
assert.match(guarded.headers.get('content-type') || '', /application\/json/);

// 4. JSON body is parsed once and visible to handlers.
const rawJson = JSON.stringify({ title: 'Song Test', artist: 'Test Artist' });
const bytes = new TextEncoder().encode(rawJson);
// Same shape the Worker passes to handlers (parsed body, raw text optional).
const parsed = await readJson({ body: JSON.parse(rawJson), rpBodyText: null });
assert.equal(parsed.title, 'Song Test');
// Raw fallback path (body parsers skipped).
const fromBytes = await readJson({ arrayBuffer: async () => bytes.slice().buffer, rpBodyText: null });
assert.equal(fromBytes.title, 'Song Test');

// 5. Route matching keeps Express-like params.
const match = matchRoute('/api/bands/abc/members/def?x=1');
assert.equal(match.rule.pattern, '/api/bands/:id/members/:userId');
assert.equal(match.match[1], 'abc');
assert.equal(match.match[2], 'def');

// 6. Env resolution prefers the per-request bag over process.env.
const scopedEnv = { TEST_ONLY_VALUE: 'from-bindings' };
assert.equal(getReqEnv({ rpEnv: scopedEnv }, 'TEST_ONLY_VALUE'), 'from-bindings');
assert.equal(getReqEnv(null, 'TEST_ONLY_VALUE'), undefined);

// 7. verifyToken: no token -> 401 (the secret is read per request, not frozen
//    at module load).
const tokenReq = { headers: {}, rpEnv: { JWT_SECRET: 'per-request-secret', NODE_ENV: 'production' } };
let failureStatus = 0;
const fakeRes = { status: (code) => { failureStatus = code; return { json: () => {} }; } };
assert.equal(verifyToken(tokenReq, fakeRes), false);
assert.equal(failureStatus, 401);

// 9. UUID helper works without node:crypto.
assert.match(uuid(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

console.log('Cloudflare adapter smoke tests passed.');
// Exit explicitly: the in-memory rate limiter may leave timers behind.
process.exit(0);
