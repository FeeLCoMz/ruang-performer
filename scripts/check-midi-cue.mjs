/**
 * Uji gate modul MIDI Cue: saat nonaktif, parsePresetCueLine tetap mengenali
 * baris cue (label tampil), tetapi `midi` harus null sehingga tidak ada
 * badge/data sound. Saat aktif, data MIDI kembali terbentuk.
 *
 * Jalankan: node scripts/check-midi-cue.mjs
 */
class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

globalThis.window = { localStorage: new MemoryStorage(), addEventListener() {}, removeEventListener() {} };

const { isMidiCueEnabled, setMidiCueEnabled } = await import('../src/modules/midi-cue/midiCueSettings.js');
const { parsePresetCueLine, parseInstrumentPatchLine } = await import('../src/utils/chordUtils.js');
const { inferMidiFromPatchContext } = await import('../src/modules/midi-cue/cueParser.js');

const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
};

const CUE = '[Chorus: Lead Synth + Strings | PC: 81 | CH: 2 | BankMSB: 1 | BankLSB: 32]';

// --- Aktif (default) ------------------------------------------------------
assert(isMidiCueEnabled() === true, 'default modul aktif');
const activeCue = parsePresetCueLine(CUE);
assert(activeCue?.type === 'preset_cue', 'baris cue dikenali saat aktif');
assert(activeCue.midi?.program === 81, 'program terbaca');
assert(activeCue.midi?.channel === 2, 'channel terbaca');
assert(activeCue.midi?.bankMsb === 1 && activeCue.midi?.bankLsb === 32, 'bank MSB/LSB terbaca');
assert(parseInstrumentPatchLine('[Patch: Acoustic Grand Piano | CH: 2]')?.midi?.program === 0, 'patch line tanpa PC tetap diinferensi');

// --- Nonaktif -------------------------------------------------------------
setMidiCueEnabled(false);
assert(isMidiCueEnabled() === false, 'modul bisa dimatikan');

const disabledCue = parsePresetCueLine(CUE);
assert(disabledCue?.type === 'preset_cue', 'baris cue masih dikenali sebagai label');
assert(disabledCue?.label === 'Chorus: Lead Synth + Strings', 'label cue tetap tampil');
assert(disabledCue?.midi === null, 'midi null saat modul nonaktif');
assert(inferMidiFromPatchContext({ section: 'Keys', patch: 'Piano' }) === null, 'inferensi berhenti saat nonaktif');

// Baris tanpa key patch (hanya routing) memang bukan cue — perilaku lama.
assert(parseInstrumentPatchLine('[Keys: Piano | CH: 2]') === null, 'routing tanpa key patch bukan cue');

const disabledPatch = parseInstrumentPatchLine('[Patch: Acoustic Grand Piano | CH: 2]');
assert(disabledPatch === null || disabledPatch.midi === null, 'patch line tidak menghasilkan midi');

// --- Aktif kembali --------------------------------------------------------
setMidiCueEnabled(true);
const reEnabled = parsePresetCueLine(CUE);
assert(reEnabled?.midi?.program === 81, 'data MIDI kembali setelah diaktifkan');

if (!process.exitCode) console.log('\nMIDI CUE CHECK OK');
