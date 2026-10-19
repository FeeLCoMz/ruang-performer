/**
 * Cloudflare Workers entry point.
 *
 * The Worker is a thin adapter: it converts the platform `Request` into the
 * `(req, res)` shape the existing handlers expect, dispatches through the shared
 * router (`api/_core/router.js`) and converts the resulting `Response` back.
 * All business logic stays in `api/` and is shared with Vercel.
 *
 * Deploy with the Node.js compatibility flag (bcryptjs/jsonwebtoken need
 * `node:crypto`, `node:buffer`, `node:stream`):
 *   compatibility_flags = ["nodejs_compat"]
 *
 * Secrets & vars (Dashboard -> Workers -> Settings -> Variables and Secrets, or
 * `wrangler secret put`):
 *   JWT_SECRET, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, GEMINI_API_KEY,
 *   VITE_YOUTUBE_API_KEY, APP_URL, SMTP_* (or MAIL_PROVIDER + provider key)
 *
 * Static assets (built by `npm run build:cloudflare`) are served first; unknown
 * `/api/*` paths return JSON 404, everything else falls back to `index.html`
 * so the SPA router keeps working.
 */

import { dispatch } from '../api/_core/router.js';
import { createRequestContext } from '../api/_core/ctx.js';

/** Build the platform Response lazily (after the handler has written to res). */
function toResponse(ctx) {
  return new Response(ctx.sent ? ctx.body : '', { status: ctx.status, headers: ctx.res.getHeaders() });
}

const API_PREFIX = '/api';
const JSON_404 = { 'content-type': 'application/json; charset=utf-8' };

function jsonResponse(status, payload, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...JSON_404, ...extraHeaders },
  });
}

/** Buffer the request once; multipart/JSON helpers read this copy later. */
async function bufferBody(request) {
  if (request.method === 'GET' || request.method === 'HEAD') return { body: undefined, bodyText: '' };
  const bytes = new Uint8Array(await request.arrayBuffer());
  const contentType = (request.headers.get('content-type') || '').toLowerCase();
  const isJson = contentType.includes('application/json') || contentType === '';
  const bodyText = new TextDecoder().decode(bytes);
  let body;
  if (isJson) {
    try {
      body = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      body = undefined;
    }
  } else {
    body = bytes;
  }
  // The adapter hands the body to the handlers, so re-reads are a no-op.
  return { body, bodyText: null };
}

async function handleApi(request, env) {
  const { body, bodyText } = await bufferBody(request);
  const ctx = createRequestContext(request, { body, bodyText, env });
  const { req, res } = ctx;

  try {
    const { matched } = await dispatch(req, res);
    if (!matched) return jsonResponse(404, { error: 'Not found' });
    return toResponse(ctx);
  } catch (error) {
    console.error('Unhandled API error:', error);
    if (res.headersSent) return toResponse(ctx);
    return jsonResponse(500, {
      error: 'Internal Server Error',
      message: error?.message,
    });
  }
}

async function serveAsset(request, env) {
  const assets = env.ASSETS;
  if (!assets || typeof assets.fetch !== 'function') return null;
  const response = await assets.fetch(request);
  return response && response.status !== 404 ? response : null;
}

async function serveSpaFallback(request, env) {
  const assets = env.ASSETS;
  if (!assets || typeof assets.fetch !== 'function') return null;
  const url = new URL(request.url);
  url.pathname = '/index.html';
  const response = await assets.fetch(new Request(url.toString(), request));
  return response && response.status !== 404 ? response : null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === API_PREFIX || url.pathname.startsWith(`${API_PREFIX}/`)) {
      return handleApi(request, env);
    }

    // CORS preflight for direct browser calls (same as Express `cors()`).
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
          'access-control-allow-headers': 'Content-Type, Authorization',
        },
      });
    }

    const asset = await serveAsset(request, env);
    if (asset) return asset;

    // SPA routes (/songs, /setlists, ...) are rendered client-side.
    const fallback = await serveSpaFallback(request, env);
    if (fallback) return fallback;

    return jsonResponse(404, { error: 'Not found' });
  },
};
