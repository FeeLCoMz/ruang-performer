// __tests__/api.songs.test.cjs
// Jest test for /api/songs endpoint
require('../test-helpers/setupEnv');
const request = require('supertest');
const app = require('../server');

describe('API /api/songs', () => {
  test('should reject POST without title', async () => {
    const res = await request(app)
      .post('/api/songs')
      .send({ artist: 'Test Artist' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/judul|title/i);
  });

  test('should create song with valid data', async () => {
    const res = await request(app)
      .post('/api/songs')
      .send({ title: 'Song Test', artist: 'Test Artist', genre: 'Pop' });
    expect([200, 201]).toContain(res.statusCode);
    expect(res.body.id).toBeDefined();
  });
});
