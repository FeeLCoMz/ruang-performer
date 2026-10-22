import { describe, test, expect } from 'vitest';
import {
  AUTOCOMPLETE_INSTRUMENTS,
  AUTOCOMPLETE_SECTION_LABELS,
  CUE_MARK_KEYWORDS,
  INSTRUMENT_KEYWORDS,
  METADATA_KEYS,
  MIDI_KEYS_ALSO_INSTRUMENT,
  MIDI_ROUTING_KEYS,
  SECTION_LABEL_REGEX_SOURCE,
  SECTION_NAME_ALIASES,
  STRUCTURE_SECTION_KEYWORDS,
  canonicalSectionKeyword,
  sectionToneOf,
  titleCaseKeyword,
} from '../config/chordDisplayConfig.js';
import { canonicalSection, parseSection } from '../utils/chordUtils.js';
import { lyricsCompletionOptions } from '../utils/lyricsCompletion.js';
import { detectSectionBadges } from '../utils/lyricsEditorUtils.js';
import { isSectionLine } from '../modules/bulk-lyrics/bulkLyricsParser.js';

/**
 * Kontrak konfigurasi: daftar keyword di chordDisplayConfig harus benar-benar
 * dibaca oleh parser, editor, autocomplete, dan bulk import. Test ini mencegah
 * daftar seksi disalin ulang ke file lain (dulu terjadi di 5 tempat).
 */
describe('chordDisplayConfig contract', () => {
  test('setiap keyword seksi dikenali parseSection dalam bentuk [Keyword]', () => {
    for (const keyword of STRUCTURE_SECTION_KEYWORDS) {
      const label = titleCaseKeyword(canonicalSectionKeyword(keyword));
      expect(parseSection(`[${label}]`), keyword).toMatchObject({ type: 'structure' });
    }
  });

  test('alias seksi menunjuk ke keyword yang ada dan terbaca parser', () => {
    for (const [alias, canonical] of Object.entries(SECTION_NAME_ALIASES)) {
      expect(STRUCTURE_SECTION_KEYWORDS, alias).toContain(alias);
      expect(STRUCTURE_SECTION_KEYWORDS, canonical).toContain(canonical);
      expect(canonicalSection(alias), alias).toBe(canonical);
    }
  });

  test('autocomplete hanya menawarkan bentuk kanonik, tanpa duplikat, dan semua terbaca parser', () => {
    expect(new Set(AUTOCOMPLETE_SECTION_LABELS).size).toBe(AUTOCOMPLETE_SECTION_LABELS.length);
    for (const label of AUTOCOMPLETE_SECTION_LABELS) {
      expect(parseSection(`[${label}]`), label).toMatchObject({ type: 'structure' });
      expect(lyricsCompletionOptions.map((option) => option.label), label).toContain(`[${label}]`);
    }
  });

  test('editor memberi badge untuk keyword dan alias yang dikenali parser', () => {
    const lines = ['[Intro]', '[Ending]', '[Bait 2]', '[Int.]', '[Post Chorus]', '[Soloist]'];
    expect(detectSectionBadges(lines.join('\n')).map((badge) => badge.label)).toEqual([
      'Intro',
      'Outro',
      'Verse 2',
      'Interlude',
      'Post-Chorus',
    ]);
  });

  test('bulk import tidak menganggap label seksi (termasuk alias) sebagai judul lagu', () => {
    for (const line of ['[Intro]', '[Ending]', 'Reff', 'Verse 2', 'Int.']) {
      expect(isSectionLine(line), line).toBe(true);
    }
    expect(isSectionLine('Lagu Baru')).toBe(false);
  });

  test('regex label seksi dari config: cocok untuk seksi, tidak untuk kata yang memuatnya', () => {
    const regex = new RegExp(SECTION_LABEL_REGEX_SOURCE, 'i');
    expect(regex.test('[Int.]')).toBe(true);
    expect(regex.test('[Intro]')).toBe(true);
    expect(regex.test('Chorus 2:')).toBe(true);
    expect(regex.test('[Soloist]')).toBe(false);
    expect(regex.test('Signature:')).toBe(false);
  });

  test('tone seksi stabil dan mengenali alias', () => {
    expect(sectionToneOf('Chorus')).toBe('chorus');
    expect(sectionToneOf('[Ending]')).toBe('intro');
    expect(sectionToneOf('Bait 2')).toBe('verse');
    expect(sectionToneOf('Bridge - Koplo')).toBe('verse');
    expect(sectionToneOf('Soloist')).toBe('verse');
  });

  test('tidak ada keyword instrumen yang diam-diam diklaim MIDI', () => {
    // 'keys' sengaja jadi instrumen DAN keyword MIDI: "[Keys: ...]" adalah
    // baris MIDI, sedangkan "[Keys]" polos tetap label instrumen keyboard.
    // Test ini memastikan daftar pengecualiannya tetap eksplisit.
    expect(MIDI_KEYS_ALSO_INSTRUMENT).toEqual(['keys']);
    for (const keyword of MIDI_KEYS_ALSO_INSTRUMENT) {
      expect(INSTRUMENT_KEYWORDS, keyword).toContain(keyword);
      expect(MIDI_ROUTING_KEYS, keyword).not.toContain(keyword);
    }
  });

  test('cue mark tidak pernah muncul sebagai instrumen di autocomplete', () => {
    const instrumentLabels = new Set(AUTOCOMPLETE_INSTRUMENTS.map((name) => titleCaseKeyword(name)));
    for (const cue of CUE_MARK_KEYWORDS) {
      // "Hit" dan "Stop" boleh jadi instrumen hanya bila memang didaftarkan;
      // saat ini tidak, jadi keduanya cukup muncul sebagai cue mark.
      if (INSTRUMENT_KEYWORDS.includes(cue)) continue;
      expect(instrumentLabels.has(titleCaseKeyword(cue)), cue).toBe(false);
    }
  });

  test('metadata MIDI tidak ikut dikenali sebagai metadata ChordDisplay', () => {
    for (const midiKey of MIDI_ROUTING_KEYS) {
      expect(METADATA_KEYS, midiKey).not.toContain(midiKey);
    }
  });
});
