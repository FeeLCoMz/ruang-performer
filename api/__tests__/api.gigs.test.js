// __tests__/api.gigs.test.js
// Jest test for /api/gigs endpoint
const request = require('supertest');
const app = require('../index');

describe('API /api/gigs', () => {
  test('should reject POST without date', async () => {
    const res = await request(app)
      .post('/api/gigs')
      .send({ venue: 'Test Venue' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/date|tanggal/i);
  });

  test('should create gig with valid data', async () => {
    const res = await request(app)
      .post('/api/gigs')
      .send({ date: '2026-02-05', venue: 'Test Venue', city: 'Jakarta' });
    expect([200, 201]).toContain(res.statusCode);
    expect(res.body.id).toBeDefined();
  });
});
