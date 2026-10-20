import { describe, expect, it } from 'vitest';
import {
  buildBulkSongRecords,
  recordsToSongPayloads,
  splitBulkSongBlocks,
  summarizeBulkRecords,
} from '../modules/bulk-lyrics/bulkLyricsParser.js';

describe('splitBulkSongBlocks', () => {
  it('memisahkan blok dengan "## Judul" dan membaca metadata', () => {
    const text = [
      '## Lagu Satu',
      'Artis: The Band',
      'Key: Am',
      'Tempo: 96 BPM',
      'Genre: Rock',
      'Time Signature: 6/8',
      'YouTube: https://youtube.com/watch?v=dQw4w9WgXcQ',
      'Keyboard Patch: Piano + Strings',
      '',
      'Am        G',
      'Baris lirik pertama',
      '',
      '## Lagu Dua',
      'Key: C',
      'C G Am F',
    ].join('\n');

    const blocks = splitBulkSongBlocks(text);

    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({
      title: 'Lagu Satu',
      artist: 'The Band',
      key: 'Am',
      tempo: '96 BPM',
      genre: 'Rock',
      timeSignature: '6/8',
      youtubeId: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
      keyboardPatch: 'Piano + Strings',
    });
    expect(blocks[0].lyrics).toBe('Am        G\nBaris lirik pertama');
    expect(blocks[1].title).toBe('Lagu Dua');
    expect(blocks[1].lyrics).toBe('C G Am F');
  });

  it('mengenali pemisah "===", "---" dan baris "Judul:"', () => {
    const text = [
      'Judul: Satu',
      'C G Am F',
      '===',
      'Judul: Dua',
      'Am F C G',
      '---',
      'Judul: Tiga',
      'D A Bm G',
    ].join('\n');

    const blocks = splitBulkSongBlocks(text);
    expect(blocks.map((block) => block.title)).toEqual(['Satu', 'Dua', 'Tiga']);
    expect(blocks.map((block) => block.lyrics)).toEqual(['C G Am F', 'Am F C G', 'D A Bm G']);
  });

  it('tidak memotong baris lirik yang mengandung titik dua', () => {
    const text = ['## Judul', 'Ku: mencintaimu', 'Dan kau: di sana'].join('\n');
    const [block] = splitBulkSongBlocks(text);
    expect(block.lyrics).toBe('Ku: mencintaimu\nDan kau: di sana');
  });

  it('memperlakukan metadata setelah lirik sebagai lirik', () => {
    const text = ['## Judul', 'C G', '[Keys: Stage Piano]', 'Key: Bukan Metadata'].join('\n');
    const [block] = splitBulkSongBlocks(text);
    expect(block.key).toBe('');
    expect(block.lyrics).toBe('C G\n[Keys: Stage Piano]\nKey: Bukan Metadata');
  });

  it('menangani CRLF dan teks tanpa pemisah', () => {
    const text = 'Artis: X\r\nKey: D\r\nD A Bm G\r\n';
    const blocks = splitBulkSongBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].artist).toBe('X');
    expect(blocks[0].key).toBe('D');
    expect(blocks[0].lyrics).toBe('D A Bm G');
  });
});

describe('buildBulkSongRecords', () => {
  const blocks = [
    {
      title: 'Lagu Valid',
      artist: 'Band',
      key: 'C',
      tempo: '120 BPM',
      timeSignature: '4/4',
      youtubeId: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      lyrics: '[reff]\nC      G\nKu menunggu',
    },
    {
      title: '',
      lyrics: 'Am F C G',
    },
    {
      title: 'Lagu Tanpa Lirik',
      key: 'H',
    },
  ];

  it('menormalkan tempo, youtube, dan memformat lirik', () => {
    const records = buildBulkSongRecords(blocks);
    const [valid] = records;
    expect(valid.errors).toEqual([]);
    expect(valid.tempo).toBe('120');
    expect(valid.youtubeId).toBe('dQw4w9WgXcQ');
    expect(valid.lyrics).toContain('[Chorus]');
  });

  it('menandai blok tanpa judul dan tanpa lirik sebagai error', () => {
    const records = buildBulkSongRecords(blocks);
    expect(records[1].errors).toContain('Judul lagu wajib diisi.');
    expect(records[2].errors.join(' ')).toMatch(/Lirik & chord masih kosong/);
    expect(records[2].errors.join(' ')).toMatch(/Format key tidak dikenal/);
  });

  it('memakai key default dan mematikan auto-format saat diminta', () => {
    const records = buildBulkSongRecords(
      [{ title: 'X', lyrics: 'C   G\nlirik' }],
      { autoFormat: false, defaultKey: 'G', defaultTempo: '80' },
    );
    expect(records[0].key).toBe('G');
    expect(records[0].tempo).toBe('80');
    expect(records[0].lyrics).toBe('C   G\nlirik');
  });

  it('menandai judul hasil tebakan tanpa memblokir simpan', () => {
    const records = buildBulkSongRecords([{ title: '', lyrics: 'Judul dari lirik\nbaris kedua' }], {
      guessTitle: true,
    });
    expect(records[0].title).toBe('Judul dari lirik');
    expect(records[0].titleGuessed).toBe(true);
    expect(records[0].errors.length).toBeGreaterThan(0);
  });
});

describe('summarizeBulkRecords & recordsToSongPayloads', () => {
  const records = buildBulkSongRecords([
    { title: 'A', key: 'C', tempo: '100', lyrics: 'C G' },
    { title: 'B', lyrics: 'Am F' },
    { title: 'C', lyrics: '' },
  ]);

  it('menghitung ringkasan', () => {
    const summary = summarizeBulkRecords(records);
    expect(summary.total).toBe(3);
    expect(summary.readyCount).toBe(2);
    expect(summary.errorCount).toBe(1);
  });

  it('hanya mengonversi record yang siap simpan', () => {
    const payloads = recordsToSongPayloads(records, { bandId: 'band-1' });
    expect(payloads).toHaveLength(2);
    expect(payloads[0]).toMatchObject({
      title: 'A',
      key: 'C',
      tempo: '100',
      time_signature: '4/4',
      bandId: 'band-1',
    });
  });
});
