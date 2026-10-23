// __tests__/api.settings.test.cjs
// Jest test untuk /api/settings:
//   - GET mengembalikan pengaturan global (dibaca semua user login)
//   - PUT menyimpan (hanya owner/admin) + validasi isi
//   - DELETE menghapus (kembali ke bawaan)
//
// Turso distub dengan penyimpanan in-memory agar alur tabel app_settings
// (CREATE TABLE IF NOT EXISTS + UPSERT) ikut teruji tanpa database sungguhan.
require('../test-helpers/setupEnv.cjs');
const request = require('supertest');
const loadApp = require('../server');

const store = new Map();

function makeClient() {
  return {
    execute: async (input) => {
      const sql = typeof input === 'string' ? input : input.sql;
      const args = typeof input === 'string' ? [] : (input.args || []);

      if (/^\s*CREATE TABLE/i.test(sql)) return { rows: [], columns: [] };
      if (/^\s*INSERT INTO app_settings/i.test(sql)) {
        store.set(args[0], { value: args[1], updatedBy: args[3] });
        return { rows: [], columns: [] };
      }
      if (/^\s*SELECT value FROM app_settings/i.test(sql)) {
        const row = store.get(args[0]);
        return { rows: row ? [{ value: row.value }] : [], columns: [] };
      }
      if (/^\s*DELETE FROM app_settings/i.test(sql)) {
        store.delete(args[0]);
        return { rows: [], columns: [] };
      }
      if (/^\s*PRAGMA/i.test(sql)) return { rows: [], columns: [] };
      // audit_logs dan tabel lain tidak relevan untuk test ini.
      return { rows: [], columns: [] };
    },
    batch: async () => ({ results: [] }),
    close: () => {},
  };
}

jest.unstable_mockModule('../../server/_turso.js', () => ({
  getTursoClient: () => globalThis.__TURSO_STUB__ || makeClient(),
}));

let app;

beforeAll(async () => {
  globalThis.__TURSO_STUB__ = makeClient();
  app = await loadApp();
});

beforeEach(() => store.clear());

describe('API /api/settings', () => {
  test('GET mengembalikan null saat pengaturan belum pernah disimpan', async () => {
    const res = await request(app).get('/api/settings/chordDisplayTags');
    expect(res.statusCode).toBe(200);
    expect(res.body.settings.chordDisplayTags).toBeNull();
  });

  test('PUT menyimpan pengaturan global dan GET mengembalikannya', async () => {
    const payload = {
      sections: ['intro', 'verse'],
      instruments: ['gitar', 'suling'],
    };

    const put = await request(app).put('/api/settings/chordDisplayTags').send(payload);
    expect(put.statusCode).toBe(200);
    expect(put.body.saved).toBe(true);

    const res = await request(app).get('/api/settings/chordDisplayTags');
    expect(res.statusCode).toBe(200);
    expect(res.body.settings.chordDisplayTags).toEqual(payload);
  });

  test('PUT menormalkan keyword (huruf kecil, tanpa duplikat)', async () => {
    await request(app)
      .put('/api/settings/chordDisplayTags')
      .send({ instruments: ['  Gitar ', 'gitar', 'SULING'] });

    const res = await request(app).get('/api/settings/chordDisplayTags');
    expect(res.body.settings.chordDisplayTags.instruments).toEqual(['gitar', 'suling']);
  });

  test('PUT menolak keyword dengan karakter tidak aman', async () => {
    const res = await request(app)
      .put('/api/settings/chordDisplayTags')
      .send({ instruments: ['(gitar)'] });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/tidak diizinkan/i);
  });

  test('DELETE menghapus pengaturan global (kembali ke bawaan)', async () => {
    await request(app).put('/api/settings/chordDisplayTags').send({ instruments: ['gitar'] });

    const del = await request(app).delete('/api/settings/chordDisplayTags');
    expect(del.statusCode).toBe(200);

    const res = await request(app).get('/api/settings/chordDisplayTags');
    expect(res.body.settings.chordDisplayTags).toBeNull();
  });

  test('key pengaturan yang tidak dikenal ditolak', async () => {
    const res = await request(app).put('/api/settings/unknown-key').send({ a: 1 });
    expect(res.statusCode).toBe(400);
  });
});
