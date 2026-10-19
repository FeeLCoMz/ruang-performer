/**
 * A tiny request context used by the Cloudflare entries to call the existing
 * `(req, res)` handlers unchanged.
 *
 * `createContext(req, env)` wraps a Web `Request` in objects that expose the
 * same surface the Node handlers rely on:
 *   req.method, req.url, req.path, req.query, req.headers, req.body,
 *   req.params, req.rpEnv (Cloudflare bindings)
 *   res.status().json()/send()/end(), res.setHeader(), res.headersSent
 */

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

function decode(input) {
  try {
    return decodeURIComponent(input.replace(/\+/g, ' '));
  } catch {
    return input;
  }
}

function parseQuery(search) {
  const out = {};
  if (!search) return out;
  const params = new URLSearchParams(search);
  for (const [key, value] of params.entries()) {
    if (out[key] === undefined) {
      out[key] = value;
    } else if (Array.isArray(out[key])) {
      out[key].push(value);
    } else {
      out[key] = [out[key], value];
    }
  }
  return out;
}

function decodePath(pathname) {
  return pathname.split('/').map(decode).join('/');
}

function headersToObject(headers) {
  const out = {};
  if (!headers) return out;
  if (typeof headers.forEach === 'function') {
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  for (const [key, value] of Object.entries(headers)) {
    out[key] = Array.isArray(value) ? value.join(', ') : value;
  }
  return out;
}

export function createRequestContext(request, { body, bodyText, params = {}, path, query, env } = {}) {
  const url = new URL(request.url);
  const pathname = path || decodePath(url.pathname);
  const headerObject = headersToObject(request.headers);
  const queryObject = query || parseQuery(url.search);
  const rawBody = body;

  const req = {
    method: String(request.method || 'GET').toUpperCase(),
    url: pathname + url.search,
    originalUrl: url.pathname + url.search,
    path: pathname,
    query: queryObject,
    params: params,
    headers: headerObject,
    body: rawBody,
    rpEnv: env || {},
    ip: headerObject['cf-connecting-ip'] || headerObject['x-forwarded-for']?.split(',')[0]?.trim() || '127.0.0.1',
    // Keep the Web Request around for multipart streams (busboy-compatible).
    rawRequest: request,
    // The adapter buffers the request body once; helpers read this copy.
    rpBodyText: bodyText,
  };
  // `req.connection.remoteAddress` is used by the in-memory rate limiter.
  req.connection = { remoteAddress: req.ip };
  req.socket = { remoteAddress: req.ip };

  const headers = new Map();
  let statusCode = 200;
  let responseBody = '';
  let sent = false;

  const normalizeBody = (payload) => {
    if (payload === undefined || payload === null) return '';
    if (typeof payload === 'string') return payload;
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(payload)) return payload;
    if (payload instanceof ArrayBuffer) return new Uint8Array(payload);
    if (ArrayBuffer.isView(payload)) return payload;
    return JSON.stringify(payload);
  };

  const res = {
    get headersSent() {
      return sent;
    },
    get statusCode() {
      return statusCode;
    },
    get body() {
      return responseBody;
    },
    setHeader(name, value) {
      headers.set(String(name).toLowerCase(), value);
      return res;
    },
    getHeader(name) {
      return headers.get(String(name).toLowerCase());
    },
    removeHeader(name) {
      headers.delete(String(name).toLowerCase());
    },
    /** Plain object copy of the pending headers (Web `Response` needs this). */
    getHeaders() {
      return Object.fromEntries(headers.entries());
    },
    status(code) {
      if (!sent) statusCode = Number(code) || 200;
      return res;
    },
    json(payload) {
      if (!sent) {
        statusCode = statusCode || 200;
        headers.set('content-type', JSON_HEADERS['content-type']);
        responseBody = JSON.stringify(payload);
        sent = true;
      }
      return res;
    },
    send(payload) {
      if (!sent) {
        responseBody = normalizeBody(payload);
        sent = true;
      }
      return res;
    },
    end(payload) {
      return res.send(payload);
    },
    writeHead(code, headerBag) {
      if (headerBag && typeof headerBag === 'object') {
        for (const [key, value] of Object.entries(headerBag)) headers.set(key.toLowerCase(), value);
      }
      return res.status(code);
    },
  };

  return {
    req,
    res,
    get response() {
      return new Response(sent ? responseBody : '', {
        status: statusCode,
        headers,
      });
    },
    // Mutable accessors so callers can read the response AFTER the handler ran
    // (a getter captured above would evaluate once, before dispatch).
    get status() {
      return statusCode;
    },
    get body() {
      return responseBody;
    },
    get sent() {
      return sent;
    },
  };
}

/** Map `{ key: value }` params into the Express request shape. */
export function makeParams(params) {
  return params && typeof params === 'object' ? { ...params } : {};
}
