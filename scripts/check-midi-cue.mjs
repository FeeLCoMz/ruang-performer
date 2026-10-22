/**
 * Uji gate modul MIDI Cue lewat API modul yang masih dipakai aplikasi.
 *
 * Yang diperiksa:
 *   - saat modul NONAKTIF, semua inferensi MIDI mengembalikan null
 *     (baris cue tetap tampil sebagai label, tanpa data sound)
 *   - saat modul AKTIF, cue/patch menghasilkan data MIDI yang benar
 *
 * Jalankan: node scripts/check-midi-cue.mjs
 *
 * Catatan: script ini dulu memanggil parsePresetCueLine/parseInstrumentPatchLine
 * dari chordUtils.js. Fungsi tersebut sudah lama dihapus (parser cue pindah ke
 * src/modules/midi-cue/cueParser.js), jadi pengecekan diarahkan ke modul itu.
 */
class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

globalThis.window = { localStorage: new MemoryStorage(), addEventListener() {}, removeEventListener() {} };

const { isMidiCueEnabled, setMidiCueEnabled } = await import('../src/modules/midi-cue/midiCueSettings.js');
const {
  parseCueOptionFields,
  parseMidiFromFields,
  hasMidiHintOptions,
  inferMidiFromPatchContext,
  mergeMidiWithInference,
} = await import('../src/modules/midi-cue/cueParser.js');

const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
};

const CUE_OPTIONS = 'PC: 81 | CH: 2 | BankMSB: 1 | BankLSB: 32';

// --- Aktif (default) ------------------------------------------------------
assert(isMidiCueEnabled() === true, 'default modul aktif');

const fields = parseCueOptionFields(CUE_OPTIONS);
assert(fields.program === '81', 'program (PC) terbaca');
assert(fields.channel === '2', 'channel (CH) terbaca');
assert(fields.bankmsb === '1' && fields.banklsb === '32', 'bank MSB/LSB terbaca');
assert(hasMidiHintOptions(CUE_OPTIONS) === true, 'opsi MIDI terdeteksi sebagai hint');

const explicitMidi = parseMidiFromFields(fields);
assert(explicitMidi?.program === 81, 'program dinormalisasi ke angka');
assert(explicitMidi?.channel === 2, 'channel dinormalisasi ke 1..16');
assert(explicitMidi?.bankMsb === 1 && explicitMidi?.bankLsb === 32, 'bank MSB/LSB masuk ke data MIDI');

const patchMidi = inferMidiFromPatchContext({ section: 'Keys', patch: 'Acoustic Grand Piano' });
assert(patchMidi?.program === 0, 'patch line tanpa PC tetap diinferensi (Acoustic Grand Piano -> 0)');

const merged = mergeMidiWithInference({
  explicitMidi,
  section: 'Keys',
  patch: 'Acoustic Grand Piano',
});
assert(merged?.program === 81 && merged?.channel === 2, 'nilai eksplisit menang atas inferensi');

// --- Nonaktif -------------------------------------------------------------
setMidiCueEnabled(false);
assert(isMidiCueEnabled() === false, 'modul bisa dimatikan');
assert(inferMidiFromPatchContext({ section: 'Keys', patch: 'Piano' }) === null, 'inferensi berhenti saat nonaktif');
assert(
  mergeMidiWithInference({ explicitMidi, section: 'Keys', patch: 'Piano' }) === null,
  'merge berhenti saat nonaktif',
);
// Opsi cue tetap terbaca: label cue harus tetap tampil tanpa data MIDI.
assert(parseCueOptionFields(CUE_OPTIONS).program === '81', 'opsi cue tetap terbaca saat nonaktif');

// --- Aktif kembali --------------------------------------------------------
setMidiCueEnabled(true);
const reEnabled = inferMidiFromPatchContext({ section: 'Keys', patch: 'Acoustic Grand Piano' });
assert(reEnabled?.program === 0, 'data MIDI kembali setelah diaktifkan');

if (!process.exitCode) console.log('\nMIDI CUE CHECK OK');
