// __tests__/api.setlists.test.cjs
// Jest test for /api/setlists endpoint
require('../test-helpers/setupEnv.cjs');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { getTursoClient } = require('../_turso.js');
const serverModule = require('../server');
const app = serverModule.default || serverModule;

function createAuthToken() {
  const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  return jwt.sign({ userId: 'test-user-id', role: 'owner' }, secret, { expiresIn: '1h' });
}

describe('API /api/setlists', () => {
  test('should reject POST without name', async () => {
    const token = createAuthToken();
    const res = await request(app)
      .post('/api/setlists')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Test setlist' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  test('should create setlist with valid data', async () => {
    const token = createAuthToken();
    const res = await request(app)
      .post('/api/setlists')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Setlist Test', description: 'Desc', songs: [] });
    expect([200, 201]).toContain(res.statusCode);
    expect(res.body.id).toBeDefined();
  });

  test('should deduplicate song ids before inserting setlist songs', async () => {
    const { dedupeSongIds } = await import('../setlists/index.js');
    const result = dedupeSongIds([1, '1', '2', 2]);

    expect(result).toEqual(['1', '2']);
    expect(new Set(result).size).toBe(2);
  });
});
