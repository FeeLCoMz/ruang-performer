import { createGigScheduleText, createGigCalendar } from '../utils/scheduleShareUtils.js';

describe('scheduleShareUtils', () => {
  const gigs = [
    {
      id: 'gig-1',
      bandName: 'Band A',
      date: '2026-05-31T20:00:00.000Z',
      venue: 'Teater Kecil',
      city: 'Jakarta',
      fee: 1500000,
      setlistName: 'Setlist A',
      notes: 'Soundcheck 19:00'
    },
    {
      id: 'gig-2',
      bandName: 'Band B',
      date: '2026-06-05T18:30:00.000Z',
      venue: 'Balai Budaya',
      city: 'Bandung'
    }
  ];

  test('createGigScheduleText returns formatted text with totals and URL', () => {
    const text = createGigScheduleText('Band A', gigs, 'https://example.com');
    expect(text).toMatch(/Jadwal Konser: Band A/);
    expect(text).toMatch(/Jumlah pertunjukan: 2/);
    expect(text).toContain('Lihat detail jadwal: https://example.com');
    expect(text).toContain('Band A');
    expect(text).toContain('Teater Kecil');
  });

  test('createGigScheduleText handles empty gigs list', () => {
    const text = createGigScheduleText('Band A', [], 'https://example.com');
    expect(text).toContain('Tidak ada jadwal konser saat ini.');
  });

  test('createGigCalendar returns valid ICS format', () => {
    const ics = createGigCalendar('Band A', gigs);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:Band A @ Teater Kecil');
    expect(ics).toContain('LOCATION:Teater Kecil, Jakarta');
    expect(ics).toContain('UID:gig-1');
  });
});
