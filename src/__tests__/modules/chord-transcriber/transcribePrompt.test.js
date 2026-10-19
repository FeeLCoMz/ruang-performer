// Vitest tests for the prompt/response helpers shared by the transcriber UI
// and the /api/ai/chord-transcribe endpoint.
import { describe, expect, it } from 'vitest';
import {
  buildTranscribePrompt,
  parseTranscriptionResponse,
  transcriptionToSongText,
} from '../../../modules/chord-transcriber/transcribePrompt.js';

const SAMPLE_RESPONSE = `\`\`\`json
{
  "key": "G",
  "tempo": 92,
  "timeSignature": "4/4",
  "capo": null,
  "sections": [
    { "label": "Intro", "chords": "| G | D | Em | C |", "lyrics": "" },
    { "label": "Verse 1", "chords": "| G  D | Em  C |", "lyrics": "Ketika malam tiba\\ndan aku sendiri" }
  ],
  "melody": "5 5 6 6 5 3",
  "notes": "Bagian bridge kurang jelas."
}
\`\`\``;

describe('buildTranscribePrompt', () => {
  it('mentions the source and the required JSON shape', () => {
    const prompt = buildTranscribePrompt({ sourceType: 'audio', sourceName: 'latihan.mp3' });
    expect(prompt).toContain('latihan.mp3');
    expect(prompt).toContain('"sections"');
    expect(prompt).toContain('not angka');
  });

  it('adds key, transpose, lyrics and MIDI context when supplied', () => {
    const prompt = buildTranscribePrompt({
      sourceType: 'midi',
      keyHint: 'D',
      transposeTarget: 'E',
      lyricsHint: 'Baris lirik',
      midiSummary: 'Kord per jendela 2s: D | A |',
    });
    expect(prompt).toContain('nada dasar D');
    expect(prompt).toContain('transpos hasilnya ke E');
    expect(prompt).toContain('Baris lirik');
    expect(prompt).toContain('Kord per jendela 2s: D | A |');
    expect(prompt).toMatch(/MIDI/);
  });
});

describe('parseTranscriptionResponse', () => {
  it('parses fenced JSON and normalises fields', () => {
    const result = parseTranscriptionResponse(SAMPLE_RESPONSE);
    expect(result.key).toBe('G');
    expect(result.tempo).toBe(92);
    expect(result.timeSignature).toBe('4/4');
    expect(result.sections).toHaveLength(2);
    expect(result.sections[1].lyrics).toContain('\n');
    expect(result.melody).toBe('5 5 6 6 5 3');
  });

  it('returns an empty structure for unparseable text instead of throwing', () => {
    const result = parseTranscriptionResponse('maaf, saya tidak bisa');
    expect(result.sections).toEqual([]);
    expect(result.key).toBeNull();
    expect(result.raw).toBe('maaf, saya tidak bisa');
  });

  it('drops empty sections and invalid tempo', () => {
    const result = parseTranscriptionResponse(JSON.stringify({
      key: null,
      tempo: 'cepat',
      sections: [{ label: 'Intro' }, { label: 'Chorus', chords: '| C |' }],
    }));
    expect(result.tempo).toBeNull();
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].label).toBe('Chorus');
  });
});

describe('transcriptionToSongText', () => {
  it('formats metadata and sections as song-editor text', () => {
    const text = transcriptionToSongText(parseTranscriptionResponse(SAMPLE_RESPONSE));
    expect(text).toContain('Original Key: G');
    expect(text).toContain('Tempo: 92');
    expect(text).toContain('[Intro]');
    expect(text).toContain('| G | D | Em | C |');
    expect(text).toContain('[Verse 1]');
    expect(text).toContain('Ketika malam tiba\ndan aku sendiri');
  });

  it('returns an empty string for empty input', () => {
    expect(transcriptionToSongText(null)).toBe('');
  });
});
