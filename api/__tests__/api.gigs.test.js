// __tests__/api.gigs.test.js
// Jest test for /api/events/gig endpoint
require('../test-helpers/setupEnv.cjs');
const request = require('supertest');
const serverModule = require('../server');
const app = serverModule.default || serverModule;

describe('API /api/events/gig', () => {
  test('should reject invalid event type', async () => {
    const res = await request(app)
      .post('/api/events/invalid')
      .send({ venue: 'Test Venue' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalid route/i);
  });

  test('should create gig with valid data', async () => {
    const res = await request(app)
      .post('/api/events/gig')
      .send({ date: '2026-02-05', venue: 'Test Venue', city: 'Jakarta' });
    expect([200, 201]).toContain(res.statusCode);
    expect(res.body.id).toBeDefined();
  });
});
