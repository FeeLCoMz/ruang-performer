/**
 * Read a JSON body from either an Express/Vercel request (IncomingMessage) or a
 * Web `Request` (Cloudflare Workers / Pages Functions).
 *
 * Express parses JSON via `express.json()` and sets `req.body`.
 * Vercel parses it as well before invoking the serverless function.
 * Cloudflare handlers receive a `Request` and hand it to the same logic, so the
 * helpers below cover all three shapes.
 */

/** Body already parsed by the platform (Express / Vercel). */
export function getParsedBody(req) {
  if (!req) return undefined;
  // Whatever Express/Vercel parsed (including an empty `{}`).
  if (req.rpParsedBody !== undefined) return req.rpParsedBody;
  if (req.body === undefined || req.body === null) return undefined;
  if (typeof req.body !== 'object') return undefined;
  // Binary payloads (Cloudflare adapter) are parsed elsewhere.
  if (typeof req.body.arrayBuffer === 'function') return undefined;
  if (req.body.byteLength !== undefined && typeof req.body.get !== 'function') return undefined;
  return req.body;
}

/** Read the raw request body as text. */
export async function readRawBody(req) {
  if (!req) return '';
  // Web Request (Cloudflare): the adapter already buffered the body, so read
  // from that copy — a Request body can only be consumed once.
  if (req.rpBodyText !== undefined && req.rpBodyText !== null) return req.rpBodyText;
  if (typeof req.arrayBuffer === 'function') {
    const buffer = await req.arrayBuffer();
    return new TextDecoder().decode(buffer);
  }
  // Node entry: raw bytes captured before a body parser consumed the stream.
  if (req.rawBody) {
    return typeof req.rawBody === 'string' ? req.rawBody : Buffer.from(req.rawBody).toString('utf8');
  }
  if (req.readableEnded) {
    if (req.rawBody) {
      return typeof req.rawBody === 'string' ? req.rawBody : Buffer.from(req.rawBody).toString('utf8');
    }
    return '';
  }
  if (typeof req.on !== 'function') return '';
  return await new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding?.('utf8');
    req.on('data', (chunk) => {
      data += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

/**
 * Read a JSON body, tolerating already-parsed bodies and empty requests.
 * @param {object} req
 * @param {{ strict?: boolean }} [options] - `strict` throws on malformed JSON
 *   so the caller can answer 400 instead of silently continuing with `{}`.
 */
export async function readJson(req, { strict = false } = {}) {
  const parsed = getParsedBody(req);
  if (parsed !== undefined) return parsed;
  const raw = await readRawBody(req);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    if (strict) throw error;
    return {};
  }
}
