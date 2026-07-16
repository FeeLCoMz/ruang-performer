import { describe, test, expect } from 'vitest';
import { buildRecentActivities, buildUpcomingEvents } from '../utils/dashboardUtils.js';

describe('dashboardUtils', () => {
  test('buildRecentActivities builds and caps activity list', () => {
    const now = new Date('2026-07-07T10:00:00.000Z');

    const result = buildRecentActivities({
      bandsData: [{ id: 1 }, { id: 2 }],
      setlistsData: [{ id: 1 }],
      songsData: [{ id: 1 }, { id: 2 }, { id: 3 }],
      gigsData: [
        { id: 1, date: '2026-07-01T10:00:00.000Z' },
        { id: 2, date: '2026-07-10T10:00:00.000Z' },
      ],
      now,
    });

    expect(result).toHaveLength(4);
    expect(result[0].text).toContain('3 lagu dalam database');
    expect(result.some(item => item.text.includes('2 band terdaftar'))).toBe(true);
    expect(result.some(item => item.text.includes('1 setlist tersedia'))).toBe(true);
    expect(result.some(item => item.text.includes('1 gig telah selesai'))).toBe(true);
  });

  test('buildUpcomingEvents returns sorted events within seven days', () => {
    const now = new Date('2026-07-07T00:00:00.000Z');

    const gigsData = [
      { id: 'g1', date: '2026-07-09T10:00:00.000Z', venue: 'Hall', bandName: 'Band C' },
      { id: 'g2', date: '2026-07-05T10:00:00.000Z', venue: 'Past', bandName: 'Band D' },
    ];

    const result = buildUpcomingEvents({ gigsData, now });

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('gig');
    expect(result[0].id).toBe('g1');
  });
});
