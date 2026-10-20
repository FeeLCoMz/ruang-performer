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
      'Partitur: ada',
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
    expect(blocks[0].sheetMusicXml).toBe('ada');
    expect(blocks[0].lyrics).toBe('Am        G\nBaris lirik pertama');
    expect(blocks[1]).toMatchObject({ title: 'Lagu Dua', key: 'C' });
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

  it('membaca judul yang baru muncul setelah metadata key/tempo', () => {
    // Chart tanpa pemisah: judul ditaruh setelah key, tempo, dan partitur.
    const text = [
      'Key : Am',
      'Tempo: 85',
      'Partitur: ada',
      'Judul: Rindu Setengah Mati',
      'Am       G',
      'Ku menunggu',
    ].join('\n');
    const single = splitBulkSongBlocks(text);
    expect(single).toHaveLength(1);
    expect(single[0]).toMatchObject({ title: 'Rindu Setengah Mati', key: 'Am', tempo: '85' });
    expect(single[0].lyrics).toBe('Am       G\nKu menunggu');
  });

  it('judul baru tanpa pemisah setelah lirik memulai lagu baru', () => {
    const blocks = splitBulkSongBlocks([
      'Judul: Lagu Satu',
      'Key: C',
      'C G Am F',
      'Judul: Lagu Dua',
      'Key: G',
      'G D Em C',
    ].join('\n'));
    expect(blocks.map((block) => block.title)).toEqual(['Lagu Satu', 'Lagu Dua']);
    expect(blocks.map((block) => block.key)).toEqual(['C', 'G']);
  });

  it('key/tempo yang ditulis di atas judul berikutnya belum bisa dipastikan (bug known)', () => {
    // "Key: G" di akhir lagu pertama tidak bisa dibedakan dari metadata lagu
    // pertama; format yang disarankan: tulis key lagu kedua SETELAH judulnya.
    const blocks = splitBulkSongBlocks([
      'Judul: Lagu Satu',
      'Key: C',
      'C G Am F',
      'Key: G',
      'Judul: Lagu Dua',
      'G D Em C',
    ].join('\n'));
    expect(blocks.map((block) => block.title)).toEqual(['Lagu Satu', 'Lagu Dua']);
    expect(blocks[1].key).toBe('');
  });

  it('header di atas pemisah "##" ikut ke lagu berikutnya', () => {
    const blocks = splitBulkSongBlocks(['Artis: Band', 'Key: Am', '', '## Lagu Satu', 'Am F C G'].join('\n'));
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ title: 'Lagu Satu', artist: 'Band', key: 'Am' });
  });

  it('key/tempo/partitur di atas "Judul:" tidak membuat blok tanpa judul', () => {
    const blocks = splitBulkSongBlocks([
      '## Lagu Satu',
      'Artis: Band',
      '',
      'Key: Am',
      'Tempo: 85',
      'Partitur: ada',
      'Judul: Lagu Satu',
      'Am F C G',
    ].join('\n'));
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      title: 'Lagu Satu',
      artist: 'Band',
      key: 'Am',
      tempo: '85',
      sheetMusicXml: 'ada',
    });
    expect(blocks[0].lyrics).toBe('Am F C G');
  });

  it('chart berawalan key lalu "Judul:" tetap satu lagu berjudul', () => {
    const blocks = splitBulkSongBlocks(['Key : Am', 'Tempo: 85', 'Judul: Rindu', 'Am G F E'].join('\n'));
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ title: 'Rindu', key: 'Am', tempo: '85' });
  });

  it('judul di bawah header "##" tidak memecah lagu menjadi blok baru', () => {
    const text = ['## Lagu Lengkap', 'Judul: Lagu Lengkap', 'Key: C', 'C G'].join('\n');
    const blocks = splitBulkSongBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].title).toBe('Lagu Lengkap');
    expect(blocks[0].key).toBe('C');
  });

  it('judul baru yang muncul setelah lirik memulai lagu baru', () => {
    const text = ['## Lagu', 'C G', 'Judul: Refrain', 'Am F'].join('\n');
    const blocks = splitBulkSongBlocks(text);
    expect(blocks.map((block) => block.title)).toEqual(['Lagu', 'Refrain']);
  });

  it('label "Judul:" yang sama persis di tengah lirik tidak memecah lagu', () => {
    const text = ['Judul: Sama', 'C G', 'Judul: Sama', 'Am F'].join('\n');
    const blocks = splitBulkSongBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].title).toBe('Sama');
    expect(blocks[0].lyrics).toBe('C G\nAm F');
  });

  it('label seksi bukan judul, dan baris lirik "Kunci:" tidak dianggap metadata', () => {
    const section = splitBulkSongBlocks(['Judul: Lagu', 'Verse: C G', 'Kunci: hatiku', 'C G'].join('\n'));
    expect(section).toHaveLength(1);
    expect(section[0].key).toBe('');
    expect(section[0].lyrics).toBe('Verse: C G\nKunci: hatiku\nC G');
  });

  it('Key dan Tempo dengan spasi sebelum titik dua tetap terbaca', () => {
    const [block] = splitBulkSongBlocks(['## Lagu', 'Key : Bb', 'BPM : 72', 'Bb Eb F'].join('\n'));
    expect(block.key).toBe('Bb');
    expect(block.tempo).toBe('72');
    expect(block.lyrics).toBe('Bb Eb F');
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
