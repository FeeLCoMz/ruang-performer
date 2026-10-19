/**
 * Platform-neutral routing table.
 *
 * Both hosts use this module as the single source of truth:
 * - Node / Vercel: `api/index.js` registers it on an Express app.
 * - Cloudflare: `cloudflare/worker.js` calls `dispatch()` for each request.
 *
 * Rules are tried in order. A rule matches on path only; the handler itself
 * rejects unsupported methods (as it always did). `auth: true` mirrors the
 * former `verifyToken` Express middleware.
 */

import { verifyToken } from '../_auth.js';

import songsHandler from '../songs/index.js';
import setlistsHandler from '../setlists/index.js';
import bandsHandler from '../bands/index.js';
import bandMembersHandler from '../bands/members.js';
import eventsHandler from '../events/index.js';
import aiHandler from '../ai.js';
import toolsHandler from '../tools/index.js';
import toolsBackupHandler from '../tools/backup.js';
import toolsRestoreHandler from '../tools/restore.js';
import usersHandler from '../users/index.js';
import userByIdHandler from '../users/[id].js';
import userResetPasswordHandler from '../users/reset-password.js';
import authRegisterHandler from '../auth/register.js';
import authLoginHandler from '../auth/login.js';
import authMeHandler from '../auth/me.js';
import authForgotHandler from '../auth/forgot-password.js';
import authResetHandler from '../auth/reset-password.js';
import changePasswordHandler from '../auth/change-password.js';
import userAuditLogsHandler from '../auth/user-audit-logs.js';
import extractChordHandler from '../extract-chord.js';

/** Compile `:param` segments into a regex, keeping the rest verbatim. */
function compile(pattern) {
  const names = [];
  const source = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\:(\w+)\?/g, (_, name) => {
      names.push(name);
      return '(?:\\/([^/]*))?';
    })
    .replace(/:(\w+)/g, (_, name) => {
      names.push(name);
      return '([^/]+)';
    });
  return { regex: new RegExp(`^${source}$`), names };
}

export const routeTable = [
  // Backup/restore must stay ahead of the /api/tools prefix.
  { pattern: '/api/tools/backup', handler: toolsBackupHandler, auth: true },
  { pattern: '/api/tools/restore', handler: toolsRestoreHandler, auth: true },
  { pattern: '/api/tools', handler: toolsHandler, auth: true },
  { pattern: '/api/tools/*rest', handler: toolsHandler, auth: true },

  { pattern: '/api/auth/register', handler: authRegisterHandler },
  { pattern: '/api/auth/login', handler: authLoginHandler },
  { pattern: '/api/auth/me', handler: authMeHandler, auth: true },
  { pattern: '/api/auth/user-audit-logs', handler: userAuditLogsHandler, auth: true },
  { pattern: '/api/auth/change-password', handler: changePasswordHandler, auth: true },
  { pattern: '/api/auth/forgot-password', handler: authForgotHandler },
  { pattern: '/api/auth/reset-password', handler: authResetHandler },

  { pattern: '/api/songs', handler: songsHandler, auth: true },
  { pattern: '/api/songs/*rest', handler: songsHandler, auth: true },
  { pattern: '/api/setlists', handler: setlistsHandler, auth: true },
  { pattern: '/api/setlists/*rest', handler: setlistsHandler, auth: true },

  // Members must match first, otherwise `/api/bands` swallows them.
  { pattern: '/api/bands/:id/members', handler: bandMembersHandler, auth: true },
  { pattern: '/api/bands/:id/members/:userId', handler: bandMembersHandler, auth: true },
  { pattern: '/api/bands', handler: bandsHandler, auth: true },
  { pattern: '/api/bands/:id', handler: bandsHandler, auth: true },

  { pattern: '/api/events/:type', handler: eventsHandler, auth: true },
  { pattern: '/api/events/:type/:id', handler: eventsHandler, auth: true },

  { pattern: '/api/users/:id/reset-password', handler: userResetPasswordHandler, auth: true },
  { pattern: '/api/users/:id', handler: userByIdHandler, auth: true },
  { pattern: '/api/users', handler: usersHandler, auth: true },

  { pattern: '/api/ai', handler: aiHandler },
  { pattern: '/api/ai/*rest', handler: aiHandler },
  { pattern: '/api/status', handler: (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() }) },
  { pattern: '/api/extract-chord', handler: extractChordHandler },
  { pattern: '/api', handler: (req, res) => res.status(404).json({ error: 'Not found' }) },
];

for (const rule of routeTable) {
  Object.assign(rule, compile(rule.pattern));
}

function splitUrl(url) {
  const index = url.indexOf('?');
  return index === -1 ? [url, ''] : [url.slice(0, index), url.slice(index + 1)];
}

function mergeQuery(query, search) {
  const merged = { ...(query || {}) };
  if (!search) return merged;
  const params = new URLSearchParams(search);
  for (const [key, value] of params.entries()) {
    if (merged[key] === undefined) merged[key] = value;
  }
  return merged;
}

function applyParams(req, rule, match) {
  const params = { ...(req.params || {}) };
  rule.names.forEach((name, index) => {
    const value = match[index + 1];
    if (value !== undefined && params[name] === undefined) params[name] = value;
  });
  if (rule.pattern.endsWith('/*rest') && params.rest === undefined) {
    // Wildcard tail, keeping the leading slash like Express `req.params[0]`.
    params.rest = match[match.length - 1] || '';
  }
  return params;
}

/**
 * Find the first rule whose path matches. Wildcard matches are exposed on
 * `req.params.rest` so legacy handlers keep working.
 */
export function matchRoute(url) {
  const [pathname, search] = splitUrl(url || '/');
  for (const rule of routeTable) {
    const match = rule.regex.exec(pathname);
    if (match) return { rule, match, pathname, search };
  }
  return null;
}

/**
 * Invoke a single `(req, res)` handler, awaiting async work and reporting
 * failures through the response object.
 */
export async function runHandler(rule, req, res) {
  if (rule.auth) {
    const authorized = await verifyToken(req, res);
    if (!authorized || res.headersSent) return res;
  }
  await rule.handler(req, res);
  return res;
}

/**
 * Dispatch a request that has already been normalised into the Node shape.
 * Returns a `{ matched, res }` descriptor.
 */
export async function dispatch(req, res) {
  const found = matchRoute(req.url || '/');
  if (!found) return { matched: false, res };

  const { rule, match, pathname, search } = found;
  req.path = pathname;
  req.params = applyParams(req, rule, match);
  req.query = mergeQuery(req.query, search);

  await runHandler(rule, req, res);
  return { matched: true, res };
}
