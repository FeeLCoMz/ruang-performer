/**
 * Runtime-agnostic environment access.
 *
 * Why this exists:
 * - Vercel / local Express: values live on `process.env`.
 * - Cloudflare Workers / Pages: there is no `process.env`; values are passed to
 *   the fetch handler as `env` and exposed through a per-request `ctx` object.
 *
 * Handlers must therefore read configuration through `getEnv(name)` instead of
 * `process.env[...]`. Never capture env values in module scope: on Cloudflare a
 * module can be evaluated before any request (and therefore before `env` is
 * known), which would freeze `undefined` into the module.
 */

const REQUEST_ENV = Symbol.for('ruang-performer.env');

/** Attach a Cloudflare-style env bag to a request context object. */
export function setRequestEnv(ctx, env) {
  if (ctx && env && typeof env === 'object') {
    Object.defineProperty(ctx, REQUEST_ENV, {
      value: env,
      enumerable: false,
      writable: true,
      configurable: true,
    });
  }
  return ctx;
}

function fromProcess(name) {
  try {
    if (typeof process !== 'undefined' && process && process.env) {
      return process.env[name];
    }
  } catch {
    // `process` is not defined on the Worker runtime.
  }
  return undefined;
}

/**
 * Read an environment variable.
 * @param {string} name
 * @param {string} [fallback]
 */
export function getEnv(name, fallback) {
  const scope = globalThis.__RP_ENV__;
  if (scope && scope[name] !== undefined) return scope[name];
  const value = fromProcess(name);
  return value === undefined ? fallback : value;
}

/** Per-request env (Cloudflare binding bag), if the adapter provided one. */
export function getRequestEnv(ctx) {
  return ctx ? ctx[REQUEST_ENV] : undefined;
}

/** Read a variable from the request env first, then the process env. */
export function getRequestEnvVar(ctx, name, fallback) {
  const scope = getRequestEnv(ctx);
  if (scope && scope[name] !== undefined) return scope[name];
  return getEnv(name, fallback);
}

/**
 * Bridge used by the legacy `(req, res)` handlers.
 * The adapters copy the Cloudflare env bag onto `req.rpEnv` so shared helpers
 * (JWT, Turso, SMTP, ...) can see it without importing a runtime SDK.
 */
// Tests set NODE_ENV=test in process.env; that must win over whatever the
// request scope says (the same rule the Node setup always applied).
export function getReqEnv(req, name, fallback) {
  if (name === 'NODE_ENV' && getEnv('NODE_ENV') === 'test') return 'test';
  if (req && req.rpEnv && req.rpEnv[name] !== undefined) {
    return req.rpEnv[name];
  }
  return getEnv(name, fallback);
}

export function isTestEnv(req) {
  if (req && req.rpEnv && req.rpEnv.NODE_ENV === 'test') return true;
  return getEnv('NODE_ENV') === 'test';
}
