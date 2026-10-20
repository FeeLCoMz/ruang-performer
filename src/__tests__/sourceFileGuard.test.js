import { describe, test, expect } from 'vitest';
import { readSource, stripComments } from './helpers/sourceFile.js';

/**
 * Guard untuk guard: memastikan test yang membaca source gagal keras saat file
 * hilang/terlalu pendek, bukan lolos diam-diam terhadap string kosong.
 */
describe('sourceFile guard helper', () => {
  test('membaca file yang ada', () => {
    const source = readSource('package.json', { minLength: 10 });
    expect(source).toContain('"name"');
  });

  test('melempar error jelas saat file tidak ditemukan', () => {
    expect(() => readSource('server/handlers/__tidak_ada__.js')).toThrow(/File tidak ditemukan/);
  });

  test('error menyebut path relatif agar mudah diperbaiki', () => {
    expect(() => readSource('api/songs/index.js')).toThrow(/api[\\/]songs[\\/]index\.js/);
  });

  test('menolak file yang isinya terlalu pendek', () => {
    // Isi nyata (bukan file hilang) tapi di bawah ambang minimum.
    expect(() => readSource('package.json', { minLength: 10_000_000 }))
      .toThrow(/terlalu pendek/);
  });

  test('stripComments membuang komentar baris dan blok', () => {
    const code = stripComments(`
      // komentar baris: item.timestamps
      const a = 1; // ekor
      /* blok
         body.time_markers */
      const b = 2;
    `);
    expect(code).not.toContain('item.timestamps');
    expect(code).not.toContain('body.time_markers');
    expect(code).toContain('const a = 1;');
    expect(code).toContain('const b = 2;');
  });

  test('stripComments menangani akhiran CRLF', () => {
    const code = stripComments('const a = 1; // komentar\r\nconst b = 2;\r\n');
    expect(code).not.toContain('komentar');
    expect(code).toContain('const b = 2;');
  });
});
