// __tests__/api.bands.test.js
// Jest test for /api/bands endpoint
const request = require('supertest');
const app = require('../index');

describe('API /api/bands', () => {
  test('should reject POST without name', async () => {
    const res = await request(app)
      .post('/api/bands')
      .send({ genre: 'Rock' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/name|nama/i);
  });

  test('should create band with valid data', async () => {
    const res = await request(app)
      .post('/api/bands')
      .send({ name: 'Band Test', genre: 'Rock' });
    expect([200, 201]).toContain(res.statusCode);
    expect(res.body.id).toBeDefined();
  });
});
