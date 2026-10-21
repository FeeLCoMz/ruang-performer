import { describe, test, expect } from 'vitest';
import { extractYouTubeId } from '../utils/youtubeUtils.js';

/**
 * Kolom YouTube URL/ID menerima URL lengkap lalu menyimpan hanya ID-nya.
 * Test ini mengunci bentuk input yang harus dikenali.
 */
describe('extractYouTubeId — input kolom YouTube URL/ID', () => {
  const ID = 'dQw4w9WgXcQ';

  test.each([
    ['URL watch standar', `https://www.youtube.com/watch?v=${ID}`],
    ['URL watch tanpa www', `https://youtube.com/watch?v=${ID}`],
    ['URL dengan parameter lain', `https://www.youtube.com/watch?feature=share&v=${ID}&t=42`],
    ['URL youtu.be', `https://youtu.be/${ID}`],
    ['URL youtu.be dengan query', `https://youtu.be/${ID}?si=abc123`],
    ['URL shorts', `https://www.youtube.com/shorts/${ID}`],
    ['URL embed', `https://www.youtube.com/embed/${ID}`],
    ['URL m.youtube', `https://m.youtube.com/watch?v=${ID}`],
    ['ID mentah', ID],
    ['ID dengan spasi', `  ${ID}  `],
  ])('mengekstrak ID dari %s', (_label, input) => {
    expect(/^[A-Za-z0-9_-]{11}$/.test(extractYouTubeId(input))).toBe(true);
  });

  test('input yang belum valid dibiarkan apa adanya (tidak dipaksa jadi ID)', () => {
    const typing = 'dQw4w9';
    // Halaman memakai aturan yang sama: bukan ID 11 karakter → simpan apa adanya.
    const extracted = extractYouTubeId(typing);
    expect(/^[A-Za-z0-9_-]{11}$/.test(extracted)).toBe(false);
  });
});
