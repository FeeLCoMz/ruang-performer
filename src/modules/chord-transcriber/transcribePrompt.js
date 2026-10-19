/**
 * transcribePrompt.js
 *
 * Prompt untuk AI transkripsi kord & not. Dipakai dua sisi:
 *   - server (`api/ai.js`) saat memanggil Gemini, dan
 *   - test unit prompt (format output harus stabil).
 *
 * Output yang diminta selalu JSON supaya UI bisa memisahkan bagian:
 *   { key, tempo, timeSignature, capo, sections: [{ label, chords, lyrics }],
 *     melody, notes }
 */

export const TRANSCRIBE_OUTPUT_SHAPE = `Format JSON yang WAJIB dikembalikan (tanpa penjelasan lain, tanpa markdown):
{
  "key": "nada dasar, mis. C atau Am (null jika tidak yakin)",
  "tempo": 120,
  "timeSignature": "4/4",
  "capo": null,
  "sections": [
    { "label": "Intro", "chords": "| C | G | Am | F |", "lyrics": "" },
    { "label": "Verse 1", "chords": "| C  G | Am  F |", "lyrics": "lirik baris 1\\nlirik baris 2" }
  ],
  "melody": "not angka melodi utama relatif nada dasar, mis. 3 4 5 5 . 4 3 2 3",
  "notes": "catatan singkat tingkat keyakinan / bagian yang perlu dicek (string kosong jika tidak ada)"
}`;

/**
 * @param {{ sourceType?: string, sourceName?: string, keyHint?: string,
 *           transposeTarget?: string, lyricsHint?: string, midiSummary?: string }} opts
 */
export function buildTranscribePrompt({
  sourceType = 'audio',
  sourceName = '',
  keyHint = '',
  transposeTarget = '',
  lyricsHint = '',
  midiSummary = '',
} = {}) {
  const isMidi = sourceType === 'midi';
  const target = String(transposeTarget || '').trim();

  const lines = [
    'Kamu adalah arranger & transkripsi musik profesional untuk aplikasi band "Ruang Performer" (pemakaian Indonesia).',
    isMidi
      ? `Lampiran ini adalah pasangan not MIDI yang sudah diparsing dari ${sourceName || 'file MIDI'}.`
      : `Lampiran ini adalah rekaman audio (${sourceName || 'rekaman'}) — bisa berisi lagu utuh, permainan instrumen akustik, piano/gitar, atau latihan band.`,
    'Tugasmu: buat draf lirik + kord yang siap dipakai musisi mendikte lagu.',
    '',
    'Aturan:',
    '1. Tentukan nada dasar (key) paling wajar serta tempo (±BPM) dan birama.',
    '2. Tulis kord per bagian lagu (Intro, Verse, Pre-Chorus, Chorus, Bridge, Interlude, Outro) memakai simbol kord standar (C, Am, F#m7, Bb, Dsus4, G/B, N.C.).',
    '3. Kord ditulis sejajar dengan suku kata lirik bila lirik jelas terdengar; jika tidak jelas gunakan [?] untuk kata yang tidak terbaca dan tetap lengkapi progres kord.',
    '4. Jika audio instrumental/tanpa vokal, kosongkan lirik dan fokus ke progres kord + melodi.',
    '5. Melodi utama ditulis dalam not angka (1-7, titik = oktaf, \'-\' = perpanjangan, 0 = istirahat) relatif terhadap key.',
    isMidi
      ? '6. Gunakan data MIDI pada lampiran sebagai sumber utama nada; jangan mengarang bagian yang tidak ada di MIDI.'
      : '6. Jika ada bagian yang sulit didengar (distorsi, banyak instrumen), turunkan keyakinan dan sebutkan di field notes.',
    '7. Jangan menulis lirik penuh dari bait yang tidak terdengar, cukup bagian yang benar-benar terdengar.',
  ];

  if (keyHint) lines.push(`- Preferensi pengguna: tulis hasil pada nada dasar ${keyHint} (transpose dari nada asli bila perlu).`);
  if (target) lines.push(`- Setelah selesai, transpos hasilnya ke ${target} agar langsung cocok dengan aransemen band.`);
  if (lyricsHint) lines.push(`- Referensi lirik/bagian yang sudah diketahui pengguna (pakai untuk menyelaraskan baris, jangan menimpa bagian yang terdengar berbeda):\n"""${String(lyricsHint).slice(0, 4000)}"""`);
  if (midiSummary) lines.push(`\nRingkasan MIDI (kord & not per waktu):\n"""${midiSummary}"""`);

  lines.push('', TRANSCRIBE_OUTPUT_SHAPE);
  return lines.join('\n');
}

function stripCodeFence(text) {
  return String(text || '')
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
}

/**
 * Ambil JSON objek pertama dari jawaban model, lalu normalisasi field-nya.
 * Tidak pernah melempar error; hasil kosong dikembalikan sebagai fallback.
 *
 * @param {string} text
 * @returns {{key: string|null, tempo: number|null, timeSignature: string|null,
 *   capo: number|string|null, sections: Array, melody: string, notes: string, raw: string}}
 */
export function parseTranscriptionResponse(text) {
  const raw = stripCodeFence(text);
  const fallback = {
    key: null,
    tempo: null,
    timeSignature: null,
    capo: null,
    sections: [],
    melody: '',
    notes: '',
    raw,
  };
  if (!raw) return fallback;

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return fallback;

  let parsed;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return fallback;
  }

  const sections = Array.isArray(parsed.sections)
    ? parsed.sections
        .map((section) => ({
          label: String(section?.label || 'Section').trim(),
          chords: String(section?.chords || '').trim(),
          lyrics: String(section?.lyrics || '').replace(/\\n/g, '\n').trim(),
        }))
        .filter((section) => section.chords || section.lyrics)
    : [];

  return {
    key: parsed.key ? String(parsed.key).trim() : null,
    tempo: Number.isFinite(Number(parsed.tempo)) && Number(parsed.tempo) > 0
      ? Math.round(Number(parsed.tempo))
      : null,
    timeSignature: parsed.timeSignature ? String(parsed.timeSignature).trim() : null,
    capo: parsed.capo ?? null,
    sections,
    melody: typeof parsed.melody === 'string' ? parsed.melody.trim() : '',
    notes: typeof parsed.notes === 'string' ? parsed.notes.trim() : '',
    raw,
  };
}

/**
 * Ubah hasil transkripsi menjadi teks lirik yang bisa langsung ditampung
 * oleh editor lagu (format yang sama dengan SongAddEditPage):
 *
 *   [Intro]
 *   | C | G | Am | F |
 *
 *   [Verse 1]
 *   C        G
 *   lirik baris 1
 */
export function transcriptionToSongText(result) {
  if (!result) return '';
  const blocks = [];

  if (result.key || result.tempo || result.timeSignature) {
    const meta = [];
    if (result.key) meta.push(`Original Key: ${result.key}`);
    if (result.tempo) meta.push(`Tempo: ${result.tempo}`);
    if (result.timeSignature) meta.push(`Time Signature: ${result.timeSignature}`);
    if (result.capo) meta.push(`Capo: ${result.capo}`);
    blocks.push(meta.join('\n'));
  }

  (result.sections || []).forEach((section) => {
    const body = [section.chords, section.lyrics].filter(Boolean).join('\n');
    blocks.push(`[${section.label}]\n${body}`.trim());
  });

  return blocks.join('\n\n').trim();
}
