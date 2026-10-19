/**
 * Cloudflare Pages Functions — catch-all handler.
 *
 * Alternative to the Worker entry (cloudflare/worker.js) when the site is
 * deployed as a Pages project instead of a Worker + static assets.
 *
 * Pages serves `dist/` itself and only invokes this function for paths that do
 * not exist as files. That is why routing is done through `next()`:
 *  - `/_worker.js` / `/api/*`  -> shared API router
 *  - anything else             -> `next()` (Pages serves index.html for the SPA)
 *
 * Requires the Node.js compatibility flag in the Pages project settings.
 */

import { dispatch } from '../api/_core/router.js';
import { createRequestContext } from '../api/_core/ctx.js';

const JSON_404 = { 'content-type': 'application/json; charset=utf-8' };

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
  // `bodyText` stays null: callers use the parsed `body` copy.
  return { body, bodyText: null };
}

async function handleApi(context) {
  const { request, env, params } = context;
  const { body, bodyText } = await bufferBody(request);
  const path = `/api${params.path ? `/${params.path}` : ''}`;
  const ctx = createRequestContext(request, { body, bodyText, path, env });
  const { req, res } = ctx;

  try {
    const { matched } = await dispatch(req, res);
    if (!matched) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: JSON_404 });
    }
    return new Response(ctx.sent ? ctx.body : '', { status: ctx.status, headers: res.getHeaders() });
  } catch (error) {
    console.error('Unhandled API error:', error);
    if (res.headersSent) {
      return new Response(ctx.sent ? ctx.body : '', { status: ctx.status, headers: res.getHeaders() });
    }
    return new Response(JSON.stringify({ error: 'Internal Server Error', message: error?.message }), {
      status: 500,
      headers: JSON_404,
    });
  }
}

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    return handleApi(context);
  }

  // Everything else is handled by Pages' static asset routing (SPA fallback).
  return next();
}
