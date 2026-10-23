import { describe, test, expect } from 'vitest';
import {
  tagNameFromLine,
  scanSong,
  scanSongs,
  filterNewFindings,
} from '../pages/admin/tag-detection/songTagScan.js';

/**
 * Pindai tag pada lagu NYATA: tag "[...]" yang dibaca sebagai lirik oleh
 * parser adalah kandidat kata kunci yang belum terdaftar.
 */
describe('pindai tag pada lagu di database', () => {
  const song = (id, title, lyrics) => ({ id, title, lyrics });

  test('tagNameFromLine mengambil nama tag, mengabaikan detail setelah titik dua', () => {
    expect(tagNameFromLine('[Jembatan]')).toBe('jembatan');
    expect(tagNameFromLine('[Gitar: Dist]')).toBe('gitar');
    expect(tagNameFromLine('  [JEMBATAN 2]  ')).toBe('jembatan 2');
    expect(tagNameFromLine('[Intro]')).toBe('intro');
    // Baris yang bukan tag utuh (teks sebelum/sesudah) tidak dianggap tag.
    expect(tagNameFromLine('lihat [Jembatan] ini')).toBe('');
    expect(tagNameFromLine('[a] [b]')).toBe('');
  });

  test('scanSong mengabaikan lagu tanpa lirik', () => {
    expect(scanSong(song('s1', 'Kosong', ''))).toBeNull();
    expect(scanSong(song('s2', 'Spasi', '   \n  '))).toBeNull();
  });

  test('scanSong hanya mengembalikan tag yang TIDAK dikenali', () => {
    const result = scanSong(
      song(
        's1',
        'Lagu',
        [
          '[Jembatan]',
          '| C | G |',
          'lirik biasa',
          '[Jembatan]', // duplikat dalam satu lagu dihitung sekali
        ].join('\n'),
      ),
    );

    expect(result.tags).toEqual([{ name: 'jembatan', line: '[Jembatan]' }]);
    expect(result.lineCount).toBe(4);
  });

  test('scanSongs mengelompokkan per nama dan mengurutkan dari terbanyak', () => {
    // "interlude", "tutti", dan "jembatan" (nama instrumen) terdaftar di
    // bawaan, jadi sengaja memakai tag yang benar-benar belum dikenal parser.
    const songs = [
      song('s1', 'Satu', '[Tag Sembarang]\n[Tag Sembarang]\n| C |'),
      song('s2', 'Dua', '[Tag Sembarang]\n[Blok Akhir]'),
      song('s3', 'Tiga', '[Tag Sembarang]'),
      song('s4', 'Tanpa lirik', ''),
    ];

    const result = scanSongs(songs);

    expect(result.scannedSongs).toBe(3);
    expect(result.skippedSongs).toBe(1);
    expect(result.findings.map((item) => item.name)).toEqual(['tag sembarang', 'blok akhir']);
    expect(result.findings[0].count).toBe(3);
    expect(result.findings[0].samples.map((item) => item.title)).toEqual(['Satu', 'Dua', 'Tiga']);
    expect(result.totalTags).toBe(4);
  });

  test('contoh lagu dibatasi lima per tag', () => {
    const songs = Array.from({ length: 8 }, (_, index) =>
      song(`s${index}`, `Lagu ${index}`, '[Jembatan]'),
    );

    const [finding] = scanSongs(songs).findings;
    expect(finding.count).toBe(8);
    expect(finding.samples).toHaveLength(5);
  });

  test('scanSongs menandai hasil yang terpotong karena batas lagu', () => {
    const songs = Array.from({ length: 4 }, (_, index) => song(`s${index}`, `L${index}`, '[X]'));
    expect(scanSongs(songs, { limitSongs: 2 })).toMatchObject({
      scannedSongs: 2,
      truncated: true,
    });
  });

  test('filterNewFindings menyembunyikan tag yang sudah terdaftar', () => {
    const findings = [{ name: 'jembatan' }, { name: 'tag sembarang' }];

    expect(filterNewFindings(findings, ['tag sembarang']).map((item) => item.name)).toEqual([
      'jembatan',
    ]);
    // Pencocokan tidak peka kapitalisasi.
    expect(filterNewFindings(findings, ['Tag Sembarang']).map((item) => item.name)).toEqual([
      'jembatan',
    ]);
  });
});
