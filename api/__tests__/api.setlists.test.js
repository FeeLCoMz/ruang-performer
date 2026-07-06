// __tests__/api.setlists.test.js
// Jest test for /api/setlists endpoint
require('../test-helpers/setupEnv.cjs');
const request = require('supertest');
const jwt = require('jsonwebtoken');
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
});
