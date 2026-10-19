import { isTestEnv, getReqEnv } from './_core/env.js';

// Only used by the Node runtime. The Cloudflare build aliases this import to
// `@libsql/client/web` (see scripts/build-cloudflare.mjs) because the default
// entry pulls in `node:fs`/`node:os`, which Workers cannot bundle.
import { createClient } from '@libsql/client';

let webClientFactory;
let clientCache = new Map();

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function resolveEnv(req, name) {
  // `rz_`/`RZ_` prefixes are honoured for backwards compatibility.
  return firstDefined(
    req ? getReqEnv(req, name) : undefined,
    req ? getReqEnv(req, `rz_${name}`) : undefined,
    req ? getReqEnv(req, `RZ_${name}`) : undefined,
  );
}

function createClientFor(url, authToken) {
  const factory = createClient || webClientFactory;
  return factory({ url, authToken });
}

export function getTursoConfig(req) {
  return {
    url: resolveEnv(req, 'TURSO_DATABASE_URL'),
    authToken: resolveEnv(req, 'TURSO_AUTH_TOKEN'),
  };
}

/** Shared by handlers so a missing config becomes a JSON 500, not a crash. */
export function isTursoConfigured(req) {
  const { url, authToken } = getTursoConfig(req);
  return Boolean(url && authToken);
}

/**
 * Create (and cache) a Turso client.
 *
 * Values are read lazily on every call instead of at module load, because on
 * Cloudflare the bindings only exist inside a request (`req.rpEnv`).
 */
export function getTursoClient(req) {
  if (isTestEnv(req)) {
    // Return a mock client for tests
    return {
      execute: async () => ({ rows: [], columns: [] }),
      batch: async () => ({ results: [] }),
      close: () => {},
    };
  }

  const { url, authToken } = getTursoConfig(req);

  if (!url) {
    throw new Error('Missing TURSO_DATABASE_URL environment variable (or rz_TURSO_DATABASE_URL)');
  }
  if (!authToken) {
    throw new Error('Missing TURSO_AUTH_TOKEN environment variable (or rz_TURSO_AUTH_TOKEN)');
  }

  const cacheKey = `${url}|${String(authToken).slice(-8)}`;
  if (!clientCache.has(cacheKey)) {
    clientCache.set(cacheKey, { client: null });
  }
  const entry = clientCache.get(cacheKey);
  if (!entry.client) {
    entry.client = createClientFor(url, authToken);
  }
  return entry.client;
}

/** Allow a host (Cloudflare) to inject the web client lazily. */
export function __setTursoWebClientFactory(factory) {
  webClientFactory = factory;
  clientCache = new Map();
}

/** Test helper: drop cached clients (e.g. after switching databases). */
export function __resetTursoClients() {
  clientCache = new Map();
}