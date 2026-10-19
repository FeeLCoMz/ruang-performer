/**
 * midiFileParser.js
 *
 * Pembaca file MIDI (.mid / .midi) di browser: menjumlahkan seluruh track
 * menjadi deretan not + event tempo, lalu meringkasnya menjadi bahan yang
 * siap dipakai AI untuk mendeteksi kunci, kord, dan melodi.
 *
 * Format MIDI mentah sengaja dibuat di frontend agar file MIDI tidak perlu
 * di-upload utuh ke server (payload ke Gemini jadi jauh lebih kecil dan
 * bebas masalah mime type).
 *
 * API:
 *   - parseMidiFile(buffer): { notes, tempos, ticksPerQuarter, durationSeconds }
 *   - isMidiFile(fileName, mimeType): boolean
 *   - summarizeMidi(parsed, options): string  (ringkasan siap-kirim ke AI)
 */

const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const DEFAULT_TEMPO = 500000; // 120 BPM dalam microseconds per quarter note.

export function isMidiFile(fileName = '', mimeType = '') {
  const lower = String(fileName || '').toLowerCase();
  return (
    String(mimeType || '').toLowerCase().includes('midi') ||
    lower.endsWith('.mid') ||
    lower.endsWith('.midi')
  );
}

export function midiNumberToNoteName(midiNumber, useFlats = false) {
  if (!Number.isFinite(Number(midiNumber))) return '';
  const index = ((Math.round(Number(midiNumber)) % 12) + 12) % 12;
  const names = useFlats ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP;
  const octave = Math.floor(Math.round(Number(midiNumber)) / 12) - 1;
  return `${names[index]}${octave}`;
}

function readVarLength(buffer, offset) {
  let value = 0;
  let cursor = offset;
  for (let i = 0; i < 4; i += 1) {
    if (cursor >= buffer.length) throw new Error('File MIDI terpotong (variable-length field).');
    const byte = buffer[cursor];
    cursor += 1;
    value = (value << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) break;
  }
  return { value, next: cursor };
}

function readString(buffer, offset, length) {
  let text = '';
  for (let i = 0; i < length; i += 1) text += String.fromCharCode(buffer[offset + i]);
  return text;
}

/**
 * Parse sebuah file MIDI (SMF format 0/1/2) menjadi struktur sederhana.
 * Tidak memakai dependensi eksternal — hanya DataView/Buffer-like ArrayBuffer.
 *
 * @param {ArrayBuffer} arrayBuffer
 * @returns {{notes: Array, tempos: Array, ticksPerQuarter: number, durationSeconds: number, trackCount: number}}
 */
export function parseMidiFile(arrayBuffer) {
  const buffer = new Uint8Array(arrayBuffer);
  if (buffer.length < 14 || readString(buffer, 0, 4) !== 'MThd') {
    throw new Error('Bukan file MIDI yang valid (header MThd tidak ditemukan).');
  }
  const view = new DataView(arrayBuffer);
  const headerLength = view.getUint32(4);
  const trackCount = view.getUint16(10);
  let ticksPerQuarter = view.getUint16(12) || 480;
  // Format SMPTE memakai frame-based ticks; pakai fallback wajar agar tetap terbaca.
  if (ticksPerQuarter > 0x7fff) ticksPerQuarter = 480;

  const notes = [];
  const tempos = [];
  let offset = 8 + headerLength;
  let trackIndex = 0;

  while (offset + 8 <= buffer.length && trackIndex < trackCount) {
    const chunkType = readString(buffer, offset, 4);
    const chunkLength = view.getUint32(offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = Math.min(chunkStart + chunkLength, buffer.length);
    offset = chunkStart + chunkLength;

    if (chunkType !== 'MTrk') {
      trackIndex += 1;
      continue;
    }

    let cursor = chunkStart;
    let tick = 0;
    let runningStatus = null;
    // midiNumber -> daftar tick start yang belum ditutup note-off-nya.
    const openNotes = new Map();

    while (cursor < chunkEnd) {
      const delta = readVarLength(buffer, cursor);
      tick += delta.value;
      cursor = delta.next;
      if (cursor >= chunkEnd) break;

      let status = buffer[cursor];
      if (status < 0x80) {
        if (runningStatus === null) throw new Error('Data MIDI rusak (status byte hilang).');
        status = runningStatus;
      } else {
        cursor += 1;
        if (status < 0xf0) runningStatus = status;
      }

      const eventType = status & 0xf0;
      if (status === 0xff) {
        // Meta event: length + data.
        if (cursor >= chunkEnd) break;
        const metaType = buffer[cursor];
        cursor += 1;
        const len = readVarLength(buffer, cursor);
        cursor = len.next;
        if (metaType === 0x51 && len.value === 3) {
          const microseconds = (buffer[cursor] << 16) | (buffer[cursor + 1] << 8) | buffer[cursor + 2];
          tempos.push({ tick, microsecondsPerQuarter: microseconds });
        }
        cursor += len.value;
      } else if (status === 0xf0 || status === 0xf7) {
        const len = readVarLength(buffer, cursor);
        cursor = len.next + len.value;
      } else if (eventType === 0x80 || eventType === 0x90) {
        const midiNumber = buffer[cursor];
        const velocity = buffer[cursor + 1];
        cursor += 2;
        const key = midiNumber;
        if (eventType === 0x90 && velocity > 0) {
          if (!openNotes.has(key)) openNotes.set(key, []);
          openNotes.get(key).push(tick);
        } else if (openNotes.has(key)) {
          const starts = openNotes.get(key);
          const startTick = starts.shift();
          if (starts.length === 0) openNotes.delete(key);
          notes.push({ midi: midiNumber, startTick, endTick: tick });
        }
      } else if (eventType === 0xa0 || eventType === 0xb0 || eventType === 0xe0) {
        cursor += 2;
      } else if (eventType === 0xc0 || eventType === 0xd0) {
        cursor += 1;
      } else {
        // Event tidak dikenal: berhenti membaca track ini agar tidak loop/salah baca.
        break;
      }
    }

    trackIndex += 1;
  }

  if (tempos.length === 0) tempos.push({ tick: 0, microsecondsPerQuarter: DEFAULT_TEMPO });
  tempos.sort((a, b) => a.tick - b.tick);

  /** Konversi tick ke detik dengan menghormati semua perubahan tempo. */
  const tickToSeconds = (targetTick) => {
    let seconds = 0;
    let lastTick = 0;
    let currentUs = DEFAULT_TEMPO;
    for (const tempo of tempos) {
      if (tempo.tick >= targetTick) break;
      seconds += ((tempo.tick - lastTick) / ticksPerQuarter) * (currentUs / 1e6);
      lastTick = tempo.tick;
      currentUs = tempo.microsecondsPerQuarter;
    }
    seconds += ((targetTick - lastTick) / ticksPerQuarter) * (currentUs / 1e6);
    return seconds;
  };

  const lastTick = notes.reduce((max, note) => Math.max(max, note.endTick), 0);
  return {
    notes,
    tempos,
    ticksPerQuarter,
    trackCount,
    durationSeconds: tickToSeconds(lastTick),
  };
}

function detectKeyFromPitchClasses(pitchClassWeights) {
  // Profil Krumhansl–Kessler: korelasi sederhana untuk menebak tonik.
  const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  let best = { score: -Infinity, key: 'C' };

  for (let root = 0; root < 12; root += 1) {
    for (const profile of [majorProfile, minorProfile]) {
      let score = 0;
      for (let i = 0; i < 12; i += 1) {
        score += pitchClassWeights[(root + i) % 12] * profile[i];
      }
      if (score > best.score) {
        const isMinor = profile === minorProfile;
        best = {
          score,
          key: `${NOTE_NAMES_SHARP[root]}${isMinor ? 'm' : ''}`,
        };
      }
    }
  }
  return best.key;
}

const CHORD_QUALITIES = [
  { suffix: '', intervals: [0, 4, 7] },
  { suffix: 'm', intervals: [0, 3, 7] },
  { suffix: '7', intervals: [0, 4, 7, 10] },
  { suffix: 'maj7', intervals: [0, 4, 7, 11] },
  { suffix: 'm7', intervals: [0, 3, 7, 10] },
  { suffix: 'sus4', intervals: [0, 5, 7] },
  { suffix: 'dim', intervals: [0, 3, 6] },
  { suffix: 'aug', intervals: [0, 4, 8] },
];

function matchChordFromPitchClasses(activePitchClasses) {
  if (!activePitchClasses || activePitchClasses.length < 3) return '';
  for (let root = 0; root < 12; root += 1) {
    if (!activePitchClasses.includes(root)) continue;
    for (const quality of CHORD_QUALITIES) {
      const chordNotes = quality.intervals.map((interval) => (root + interval) % 12);
      const complete = chordNotes.every((pc) => activePitchClasses.includes(pc));
      if (!complete) continue;
      // Utamakan kord yang seluruh nadanya benar-benar terdengar dan bass = root.
      const extra = activePitchClasses.filter((pc) => !chordNotes.includes(pc)).length;
      if (extra === 0) return `${NOTE_NAMES_SHARP[root]}${quality.suffix}`;
    }
  }
  return '';
}

/**
 * Ringkas hasil parse MIDI menjadi teks compact untuk dikirim ke AI.
 *
 * @param {{notes: Array, tempos: Array, durationSeconds: number}} parsed
 * @param {{maxEvents?: number, windowSeconds?: number, bpmHint?: number}} [options]
 */
export function summarizeMidi(parsed, options = {}) {
  const { maxEvents = 320, windowSeconds = 2, bpmHint = 0 } = options;
  const notes = Array.isArray(parsed?.notes) ? parsed.notes : [];
  if (notes.length === 0) {
    return 'File MIDI tidak berisi not yang bisa dibaca.';
  }

  let secondsPerTick = 1;
  if (parsed.ticksPerQuarter && parsed.durationSeconds) {
    // Estimasi sederhana rata-rata; tempo AI cukup sebagai acuan ±.
    const lastTick = notes.reduce((max, note) => Math.max(max, note.endTick), 0) || 1;
    secondsPerTick = parsed.durationSeconds / lastTick;
  }

  const bpm = bpmHint || (parsed.tempos?.length
    ? Math.round(60e6 / parsed.tempos[0].microsecondsPerQuarter)
    : 120);

  // Aktifkan not per jendela waktu -> kord dan melodi per bar.
  const buckets = new Map();
  const pitchWeights = new Array(12).fill(0);
  const sorted = [...notes].sort((a, b) => a.startTick - b.startTick);

  sorted.forEach((note) => {
    const startSec = note.startTick * secondsPerTick;
    const endSec = note.endTick * secondsPerTick;
    pitchWeights[note.midi % 12] += Math.max(0.05, endSec - startSec);
    const firstBucket = Math.floor(startSec / windowSeconds);
    const lastBucket = Math.floor(Math.max(endSec - 0.001, startSec) / windowSeconds);
    for (let bucket = firstBucket; bucket <= lastBucket; bucket += 1) {
      if (!buckets.has(bucket)) buckets.set(bucket, new Set());
      buckets.get(bucket).add(note.midi);
    }
  });

  const bucketKeys = [...buckets.keys()].sort((a, b) => a - b);
  const chordTimeline = bucketKeys.map((bucket) => {
    const midis = [...buckets.get(bucket)].sort((a, b) => a - b);
    const pitchClasses = [...new Set(midis.map((midi) => midi % 12))];
    const chord = matchChordFromPitchClasses(pitchClasses) || midis.map((m) => midiNumberToNoteName(m)).join('-');
    return `${(bucket * windowSeconds).toFixed(1)}s:${chord}`;
  });

  const melodyEvents = sorted.slice(0, maxEvents).map((note) => {
    const duration = Math.max(0.05, (note.endTick - note.startTick) * secondsPerTick);
    return `${note.startTick}@${midiNumberToNoteName(note.midi)}:${duration.toFixed(1)}`;
  });

  const suggestedKey = detectKeyFromPitchClasses(pitchWeights);

  return [
    `Durasi: ${Number(parsed.durationSeconds || 0).toFixed(1)} detik`,
    `Tempo awal: ±${bpm} BPM`,
    `Nada dasar terdeteksi (algoritmik): ${suggestedKey}`,
    `Kord per jendela ${windowSeconds}s: ${chordTimeline.join(' | ')}`,
    `Not (tick@nada:durasi detik, maks ${maxEvents} event): ${melodyEvents.join(' ')}`,
  ].join('\n');
}
