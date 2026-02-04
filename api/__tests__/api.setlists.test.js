// __tests__/api.setlists.test.js
// Jest test for /api/setlists endpoint
const request = require('supertest');
const app = require('../api/index'); // Adjust if using custom server

describe('API /api/setlists', () => {
  test('should reject POST without name', async () => {
    const res = await request(app)
      .post('/api/setlists')
      .send({ description: 'Test setlist' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  test('should create setlist with valid data', async () => {
    const res = await request(app)
      .post('/api/setlists')
      .send({ name: 'Setlist Test', description: 'Desc', songs: [] });
    expect([200, 201]).toContain(res.statusCode);
    expect(res.body.id).toBeDefined();
  });
});
