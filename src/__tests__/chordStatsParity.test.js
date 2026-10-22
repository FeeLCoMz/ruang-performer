import { describe, expect, test } from 'vitest';
import {
  parseChordPro,
  getAllChords,
  getChordUsageCounts,
  estimateKeyFromChordUsage,
  detectChordModulations,
} from '../utils/chord/analysis.js';

/**
 * Kontrak statistik chord yang dilihat pengguna (SongChordsAnalyzer,
 * rekomendasi key piano).
 *
 * Test ini mengunci HASIL, bukan implementasi: boleh diubah hanya kalau
 * angka barunya terbukti lebih benar. Tujuannya agar migrasi parser
 * (parseStandardFormat -> parseLines) tidak diam-diam mengubah laporan.
 */
const SAMPLES = {
  'format standar dengan seksi': `
Title: Lagu Uji
Artist: Ruang Performer
Original Key: C
Tempo: 80

[Intro]
C G Am F

[Verse 1]
Am F C G
ku menunggu di sini

[Chorus:]
F G C Am
dan aku pulang
`,
  'seksi ber-chord di baris yang sama': `
Intro: C G Am F
Chorus: F G Em Am
Am Em F G
`,
  'barline dan chord compact': `
[Verse]
|: C G | Am F :|
D..Gm..Bb..C
Dm D# A#
`,
  'baris kata seksi tapi lirik': `
Verse: ku menunggu
Chorus: kau pergi
C G Am F
`,
  'metadata non-lagu dan instrumen': `
[Gitar: Dist]
Patch: Piano
(Istirahat)
C G Am F
`,
};

const snapshot = (lyrics) => {
  const parsed = parseChordPro(lyrics);
  const usageCounts = getChordUsageCounts(parsed);

  return {
    chords: getAllChords(parsed),
    usageCounts,
    count: usageCounts.reduce((total, item) => total + item.count, 0),
    detectedKey: estimateKeyFromChordUsage(usageCounts),
    modulation: detectChordModulations(parsed).hasModulation,
  };
};

describe('statistik chord: kontrak hasil', () => {
  test('format standar dengan seksi', () => {
    expect(snapshot(SAMPLES['format standar dengan seksi'])).toEqual({
      chords: ['Am', 'C', 'F', 'G'],
      usageCounts: [
        { chord: 'Am', count: 3 },
        { chord: 'C', count: 3 },
        { chord: 'F', count: 3 },
        { chord: 'G', count: 3 },
      ],
      count: 12,
      detectedKey: { key: 'C', mode: 'major', confidence: 75, alternatives: ['Am', 'F'] },
      modulation: false,
    });
  });

  test('seksi ber-chord di baris yang sama', () => {
    expect(snapshot(SAMPLES['seksi ber-chord di baris yang sama'])).toEqual({
      chords: ['Am', 'C', 'Em', 'F', 'G'],
      usageCounts: [
        { chord: 'Am', count: 3 },
        { chord: 'F', count: 3 },
        { chord: 'G', count: 3 },
        { chord: 'Em', count: 2 },
        { chord: 'C', count: 1 },
      ],
      count: 12,
      detectedKey: { key: 'Am', mode: 'minor', confidence: 76, alternatives: ['C', 'F'] },
      modulation: false,
    });
  });

  test('barline dan chord compact', () => {
    expect(snapshot(SAMPLES['barline dan chord compact'])).toEqual({
      chords: ['A#', 'Am', 'Bb', 'C', 'D', 'D#', 'Dm', 'F', 'G', 'Gm'],
      usageCounts: [
        { chord: 'C', count: 2 },
        { chord: 'A#', count: 1 },
        { chord: 'Am', count: 1 },
        { chord: 'Bb', count: 1 },
        { chord: 'D', count: 1 },
        { chord: 'D#', count: 1 },
        { chord: 'Dm', count: 1 },
        { chord: 'F', count: 1 },
        { chord: 'G', count: 1 },
        { chord: 'Gm', count: 1 },
      ],
      count: 11,
      detectedKey: { key: 'Gm', mode: 'minor', confidence: 75, alternatives: ['Bb', 'Dm'] },
      modulation: false,
    });
  });

  test('baris "kata seksi: lirik" tidak menambah chord', () => {
    expect(snapshot(SAMPLES['baris kata seksi tapi lirik'])).toEqual({
      chords: ['Am', 'C', 'F', 'G'],
      usageCounts: [
        { chord: 'Am', count: 1 },
        { chord: 'C', count: 1 },
        { chord: 'F', count: 1 },
        { chord: 'G', count: 1 },
      ],
      count: 4,
      detectedKey: { key: 'C', mode: 'major', confidence: 75, alternatives: ['Am', 'F'] },
      modulation: false,
    });
  });

  test('metadata non-lagu dan baris instrumen tidak menambah chord', () => {
    expect(snapshot(SAMPLES['metadata non-lagu dan instrumen'])).toEqual({
      chords: ['Am', 'C', 'F', 'G'],
      usageCounts: [
        { chord: 'Am', count: 1 },
        { chord: 'C', count: 1 },
        { chord: 'F', count: 1 },
        { chord: 'G', count: 1 },
      ],
      count: 4,
      detectedKey: { key: 'C', mode: 'major', confidence: 75, alternatives: ['Am', 'F'] },
      modulation: false,
    });
  });

  test('metadata lagu dan seksi dikenali', () => {
    const parsed = parseChordPro(SAMPLES['format standar dengan seksi']);
    expect(parsed.metadata).toEqual({
      title: 'Lagu Uji',
      artist: 'Ruang Performer',
      original_key: 'C',
      tempo: '80',
    });
    expect(Object.keys(parsed.structures)).toEqual(['intro', 'verse', 'chorus']);
  });

  test('baris lirik tidak pernah menjadi baris chord kosong', () => {
    const parsed = parseChordPro(SAMPLES['baris kata seksi tapi lirik']);
    const emptyChordLines = parsed.lines.filter(
      (line) => line.type === 'line_with_chords' && line.chords.length === 0,
    );
    expect(emptyChordLines).toEqual([]);
  });
});
