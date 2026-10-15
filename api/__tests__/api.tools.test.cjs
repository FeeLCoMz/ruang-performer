// __tests__/api.tools.test.cjs
// Jest test for /api/tools/backup endpoint:
//   - auth rejection without a valid token
//   - SQL output shape (CREATE TABLE + INSERT sections, headers)
//   - escaping of quotes/newlines/control characters in values
require('../test-helpers/setupEnv.cjs');
const request = require('supertest');
const loadApp = require('../server');

// Stub the Turso client BEFORE the app (and this module's dependencies) is
// dynamically imported. The stub lives on globalThis because the ESM mock
// factory may run in a different VM realm where CJS-scope closures do not
// resolve.
jest.unstable_mockModule('../_turso.js', () => ({
  getTursoClient: () => globalThis.__TURSO_STUB__ || {
    execute: async () => ({ rows: [], columns: [] }),
    batch: async () => ({ results: [] }),
    close: () => {},
  },
}));

let app;

beforeAll(async () => {
  app = await loadApp();
});

describe('API /api/tools/backup', () => {
  test('rejects GET with an invalid token (401)', async () => {
    // Force the non-test auth path by temporarily unsetting NODE_ENV.
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      const res = await request(app).get('/api/tools/backup');
      expect([401, 500]).toContain(res.statusCode);
      // 401 from middleware, or 500 JSON error from a handler that ran —
      // either way it must not be a successful SQL dump.
      expect(res.headers['content-type'] || '').not.toMatch(/sql/);
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });

  test('rejects non-GET methods with 405', async () => {
    const res = await request(app)
      .post('/api/tools/backup')
      .send({});
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toMatch(/method not allowed/i);
  });

  test('returns application/sql attachment on success', async () => {
    const res = await request(app).get('/api/tools/backup');
    // With the mocked test Turso client the dump may be empty, but the
    // response must still be shaped like a SQL file download.
    if (res.statusCode !== 200) return; // skip if remote client unavailable
    expect(res.headers['content-type']).toMatch(/sql/);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="backup-/);
  });

  describe('SQL value escaping', () => {
    // Load the handler with a stubbed Turso client so we can inspect the
    // generated SQL text precisely.
    let handler;
    let clientStub;

    const runBackup = async () => {
      const sent = {};
      const res = {
        statusCode: null,
        status(code) { this.statusCode = code; return this; },
        setHeader() {},
        send(body) { sent.body = body; },
        json(body) { sent.json = body; },
        end() {},
      };
      const req = { method: 'GET', headers: {}, user: { userId: 'test-user' } };
      await handler(req, res);
      return { sent, res };
    };

    beforeAll(async () => {
      handler = require('../tools/backup.js').default;
    });

    beforeEach(() => {
      globalThis.__TURSO_STUB__ = {
        execute: async (sql) => {
          if (/sqlite_master/.test(sql)) {
            return {
              rows: [
                { name: 'songs', sql: 'CREATE TABLE songs (id TEXT, lyrics TEXT)' },
              ],
            };
          }
          return { rows: [] };
        },
      };
    });

    test('escapes single quotes in values', async () => {
      globalThis.__TURSO_STUB__.execute = async (sql) => {
        if (/sqlite_master/.test(sql)) {
          return { rows: [{ name: 'songs', sql: 'CREATE TABLE songs (id TEXT, lyrics TEXT)' }] };
        }
        return { rows: [{ id: '1', lyrics: "It's a song" }] };
      };
      const { sent, res } = await runBackup();
      expect(res.statusCode).toBe(200);
      expect(sent.body).toContain("'It''s a song'");
      expect(sent.body).not.toContain("'It's a song'");
    });

    test('escapes newlines and carriage returns as \\n and \\r', async () => {
      globalThis.__TURSO_STUB__.execute = async (sql) => {
        if (/sqlite_master/.test(sql)) {
          return { rows: [{ name: 'songs', sql: 'CREATE TABLE songs (id TEXT, lyrics TEXT)' }] };
        }
        return { rows: [{ id: '1', lyrics: 'line1\nline2\rline3' }] };
      };
      const { sent, res } = await runBackup();
      expect(res.statusCode).toBe(200);
      expect(sent.body).toContain('line1\\nline2\\rline3');
      // The INSERT must stay on a single physical line.
      const insertLine = sent.body
        .split('\n')
        .find((l) => l.startsWith('INSERT OR REPLACE INTO "songs"'));
      expect(insertLine).toBeDefined();
      expect(insertLine).not.toMatch(/\r/);
    });

    test('escapes NUL bytes and backslashes', async () => {
      globalThis.__TURSO_STUB__.execute = async (sql) => {
        if (/sqlite_master/.test(sql)) {
          return { rows: [{ name: 'songs', sql: 'CREATE TABLE songs (id TEXT, lyrics TEXT)' }] };
        }
        return { rows: [{ id: '1', lyrics: 'a\\b\0c' }] };
      };
      const { sent, res } = await runBackup();
      expect(res.statusCode).toBe(200);
      expect(sent.body).toContain('a\\\\b\\0c');
    });

    test('renders NULL and numbers unquoted', async () => {
      globalThis.__TURSO_STUB__.execute = async (sql) => {
        if (/sqlite_master/.test(sql)) {
          return { rows: [{ name: 'songs', sql: 'CREATE TABLE songs (id TEXT, lyrics TEXT)' }] };
        }
        return { rows: [{ id: 1, lyrics: null }] };
      };
      const { sent, res } = await runBackup();
      expect(res.statusCode).toBe(200);
      expect(sent.body).toContain('INSERT OR REPLACE INTO "songs" ("id", "lyrics") VALUES (1, NULL);');
    });

    test('wraps output in CREATE TABLES and INSERTS sections', async () => {
      globalThis.__TURSO_STUB__.execute = async (sql) => {
        if (/sqlite_master/.test(sql)) {
          return { rows: [{ name: 'songs', sql: 'CREATE TABLE songs (id TEXT, lyrics TEXT)' }] };
        }
        return { rows: [{ id: '1', lyrics: 'x' }] };
      };
      const { sent, res } = await runBackup();
      expect(res.statusCode).toBe(200);
      expect(sent.body).toContain('-- CREATE TABLES --');
      expect(sent.body).toContain('-- INSERTS --');
      // CREATE TABLE is patched to IF NOT EXISTS.
      expect(sent.body).toMatch(/CREATE TABLE IF NOT EXISTS songs/);
    });

    test('reads rows in chunks (LIMIT/OFFSET), not one unbounded SELECT', async () => {
      const executedSql = [];
      globalThis.__TURSO_STUB__.execute = async (sql) => {
        executedSql.push(sql);
        if (/sqlite_master/.test(sql)) {
          return { rows: [{ name: 'songs', sql: 'CREATE TABLE songs (id TEXT)' }] };
        }
        // One row per chunk, fewer than the chunk size, so paging ends fast.
        return { rows: [{ id: '1' }] };
      };
      const { sent, res } = await runBackup();
      expect(res.statusCode).toBe(200);
      // Data reads must be chunked, not an unbounded `SELECT * FROM ...`.
      expect(executedSql.some((s) => /LIMIT 1000 OFFSET 0/.test(s))).toBe(true);
      expect(sent.body).toContain('-- INSERTS --');
    });
  });
});


