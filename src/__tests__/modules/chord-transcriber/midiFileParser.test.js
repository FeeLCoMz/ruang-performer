// Vitest tests for the client-side MIDI parser used by the
// AI Chord & Sheet Music Transcriber module.
import { describe, expect, it } from 'vitest';
import {
  isMidiFile,
  midiNumberToNoteName,
  parseMidiFile,
  summarizeMidi,
} from '../../../modules/chord-transcriber/midiFileParser.js';

/** Rakit header MThd + satu track MTrk dari byte event. */
function buildMidiTrack(trackBytes) {
  const header = [
    0x4d, 0x54, 0x68, 0x64, // MThd
    0x00, 0x00, 0x00, 0x06, // header length
    0x00, 0x00, // format 0
    0x00, 0x01, // 1 track
    0x01, 0xe0, // 480 ticks per quarter
  ];
  const length = trackBytes.length;
  const trackHeader = [
    0x4d, 0x54, 0x72, 0x6b, // MTrk
    (length >>> 24) & 0xff,
    (length >>> 16) & 0xff,
    (length >>> 8) & 0xff,
    length & 0xff,
  ];
  return new Uint8Array([...header, ...trackHeader, ...trackBytes]).buffer;
}

// note on C4 (60) di tick 0, note on E4 (64) di tick 0, note off keduanya
// (delta 480), lalu end-of-track.
const TRACK = [
  0x00, 0x90, 0x3c, 0x64, // delta 0, note on 60
  0x00, 0x90, 0x40, 0x64, // delta 0, note on 64
  0x83, 0x60, 0x80, 0x3c, 0x40, // delta 480 (variable length), note off 60
  0x00, 0x80, 0x40, 0x40, // delta 0, note off 64
  0x00, 0xff, 0x2f, 0x00, // end of track
];

describe('parseMidiFile', () => {
  it('reads notes, ticks per quarter and duration from a minimal MIDI file', () => {
    const parsed = parseMidiFile(buildMidiTrack(TRACK));

    expect(parsed.ticksPerQuarter).toBe(480);
    expect(parsed.notes).toHaveLength(2);
    expect(parsed.notes.map((note) => note.midi).sort()).toEqual([60, 64]);
    expect(parsed.notes[0].endTick).toBe(480);
    // 480 ticks @ 120 BPM default = 0.5 detik.
    expect(parsed.durationSeconds).toBeCloseTo(0.5, 3);
    expect(parsed.tempos[0].microsecondsPerQuarter).toBe(500000);
  });

  it('throws a readable error for a non-MIDI buffer', () => {
    const buffer = new TextEncoder().encode('bukan midi sama sekali').buffer;
    expect(() => parseMidiFile(buffer)).toThrow(/Bukan file MIDI/);
  });

  it('never produces a note list at negative duration', () => {
    const parsed = parseMidiFile(buildMidiTrack(TRACK));
    parsed.notes.forEach((note) => {
      expect(note.endTick).toBeGreaterThanOrEqual(note.startTick);
    });
  });
});

describe('summarizeMidi', () => {
  it('produces a compact summary suitable for the AI prompt', () => {
    const parsed = parseMidiFile(buildMidiTrack(TRACK));
    const summary = summarizeMidi(parsed);

    expect(summary).toContain('Durasi:');
    expect(summary).toContain('Kord per jendela');
    expect(summary).toContain('Not (tick@nada');
    // C + E tanpa G bukan triad lengkap, jadi fallback nama nada muncul.
    expect(summary).toMatch(/C4|E4/);
  });

  it('reports an empty file clearly', () => {
    expect(summarizeMidi({ notes: [], tempos: [], durationSeconds: 0 })).toMatch(/tidak berisi not/i);
  });
});

describe('midi helpers', () => {
  it('detects MIDI files by extension and mime type', () => {
    expect(isMidiFile('sesi.mid', '')).toBe(true);
    expect(isMidiFile('sesi.MIDI', '')).toBe(true);
    expect(isMidiFile('lagu.mp3', 'audio/mpeg')).toBe(false);
    expect(isMidiFile('blob', 'audio/midi')).toBe(true);
  });

  it('maps MIDI numbers to note names with octaves', () => {
    expect(midiNumberToNoteName(60)).toBe('C4');
    expect(midiNumberToNoteName(61)).toBe('C#4');
    expect(midiNumberToNoteName(61, true)).toBe('Db4');
  });
});
