// __tests__/api.songs.test.js
// Jest test for /api/songs endpoint
require('../test-helpers/setupEnv.cjs');
const request = require('supertest');
const serverModule = require('../server');
const app = serverModule.default || serverModule;

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

  test('should return trending data when requested from songs API', async () => {
    const songsHandler = require('../songs/index.js').default;
    const originalNodeEnv = process.env.NODE_ENV;
    const originalFetch = global.fetch;
    process.env.NODE_ENV = 'test';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'abc123',
            snippet: {
              title: 'Trending Song',
              channelTitle: 'Test Channel',
              publishedAt: '2024-01-01T00:00:00Z',
              description: 'A test trending song',
              thumbnails: { high: { url: 'https://example.com/cover.jpg' } }
            },
            statistics: { viewCount: '123456' }
          }
        ]
      })
    });

    const req = {
      method: 'GET',
      query: { include: 'trending' },
      url: '/api/songs?include=trending',
      headers: {},
      user: { userId: 'test-user' }
    };
    const res = {
      statusCode: null,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(payload) { this.body = payload; return this; },
      setHeader() {}
    };

    await songsHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.songs)).toBe(true);
    expect(res.body.trending[0]).toMatchObject({
      videoId: 'abc123',
      title: 'Trending Song'
    });

    process.env.NODE_ENV = originalNodeEnv;
    global.fetch = originalFetch;
  });
});
