/**
 * cueParser.js
 *
 * Modul MIDI: parsing cue/patch dari teks lirik menjadi data MIDI terstruktur.
 * Dipisahkan dari chordUtils.js agar logika MIDI jadi modul/plugin mandiri
 * yang bisa diuji, di-lazy-load, dan diganti tanpa menyentuh parser chord.
 *
 * Ekspor:
 *   - normalizeMidiByte(value, { max })
 *   - normalizeMidiChannel(value)
 *   - parseMidiFromFields(fields)
 *   - parseCueOptionFields(rawOptions)
 *   - getDefaultMidiChannelByContext(contextText)
 *   - inferCategoryHintFromContext(contextText)
 *   - inferProgramByCommonInstrumentName(contextText)
 *   - inferMidiFromPatchContext({ section, patch, instrument })
 *   - mergeMidiWithInference({ explicitMidi, section, patch, instrument })
 *   - hasMidiHintOptions(rawOptions)
 *   - isMidiCueActive()
 *
 * Modul `midi-cue` bisa dimatikan dari halaman Modul (lihat
 * midiCueSettings.js). Saat nonaktif, semua fungsi inferensi mengembalikan
 * null sehingga baris cue tampil sebagai teks biasa.
 */

import { findClosestGmPatch } from './gmSoundbank.js';
import { isMidiCueEnabled } from './midiCueSettings.js';

/**
 * Apakah fitur MIDI Cue aktif? Dipakai parser untuk memutuskan nilai `midi`.
 * @returns {boolean}
 */
export const isMidiCueActive = () => isMidiCueEnabled();

export const normalizeMidiByte = (value, { max = 127 } = {}) => {
  const numeric = Number.parseInt(String(value || '').trim(), 10);
  if (!Number.isFinite(numeric)) return null;
  if (numeric < 0 || numeric > max) return null;
  return numeric;
};

export const normalizeMidiChannel = (value) => {
  const numeric = Number.parseInt(String(value || '').trim(), 10);
  if (!Number.isFinite(numeric)) return null;
  if (numeric >= 1 && numeric <= 16) return numeric;
  if (numeric >= 0 && numeric <= 15) return numeric + 1;
  return null;
};

export const parseMidiFromFields = (fields = {}) => {
  const rawProgram = fields.program ?? fields.preset ?? fields.pc;
  const rawChannel = fields.channel ?? fields.ch;
  const rawBankMsb = fields.bankmsb ?? fields.msb ?? fields.bank;
  const rawBankLsb = fields.banklsb ?? fields.lsb;

  const midi = {};

  if (rawProgram !== undefined) {
    const program = normalizeMidiByte(rawProgram);
    if (program !== null) midi.program = program;
  }

  if (rawChannel !== undefined) {
    const channel = normalizeMidiChannel(rawChannel);
    if (channel !== null) midi.channel = channel;
  }

  if (rawBankMsb !== undefined) {
    const bankMsb = normalizeMidiByte(rawBankMsb);
    if (bankMsb !== null) midi.bankMsb = bankMsb;
  }

  if (rawBankLsb !== undefined) {
    const bankLsb = normalizeMidiByte(rawBankLsb);
    if (bankLsb !== null) midi.bankLsb = bankLsb;
  }

  if (!Object.keys(midi).length) return null;
  return midi;
};

export const parseCueOptionFields = (rawOptions = '') => {
  if (typeof rawOptions !== 'string' || !rawOptions.trim()) return {};

  const fields = {};
  rawOptions
    .split('|')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .forEach((segment) => {
      const idx = segment.indexOf(':');
      if (idx <= 0 || idx >= segment.length - 1) return;

      const rawKey = segment.slice(0, idx).trim().toLowerCase();
      const key = rawKey.replace(/\s+/g, '');
      const value = segment.slice(idx + 1).trim();
      if (!value) return;

      if (key === 'program' || key === 'pc') fields.program = value;
      if (key === 'preset') fields.preset = value;
      if (key === 'channel' || key === 'ch') fields.channel = value;
      if (key === 'bank' || key === 'bankmsb' || key === 'msb') fields.bankmsb = value;
      if (key === 'banklsb' || key === 'lsb') fields.banklsb = value;
    });

  return fields;
};

export const hasMidiHintOptions = (rawOptions = '') => (
  /(?:\bpc\b|\bprogram\b|\bch\b|\bchannel\b|\bbank\b|\bmsb\b|\blsb\b)/i.test(String(rawOptions || ''))
);

export const getDefaultMidiChannelByContext = (contextText = '') => {
  const normalized = String(contextText || '').toLowerCase();
  if (/\bguitar\b|\bgitar\b/.test(normalized)) return 2;
  return 1;
};

export const inferCategoryHintFromContext = (contextText = '') => {
  const normalized = String(contextText || '').toLowerCase();
  if (/\bguitar\b|\bgitar\b/.test(normalized)) return 'guitar';
  if (/\bkeys\b|\bkeyboard\b|\bpiano\b|\borgan\b|\bep\b/.test(normalized)) return 'piano-keys';
  if (/\bbass\b/.test(normalized)) return 'bass';
  if (/\bstring\b|\borchestra\b|\bchoir\b/.test(normalized)) return 'strings-orchestra';
  if (/\bbrass\b|\btrumpet\b|\bsax\b|\bflute\b|\bclarinet\b/.test(normalized)) return 'brass-reed-wind';
  if (/\blead\b|\bpad\b|\bsynth\b|\bfx\b/.test(normalized)) return 'synth-lead-pad-fx';
  return 'all';
};

export const inferProgramByCommonInstrumentName = (contextText = '') => {
  const normalized = String(contextText || '').toLowerCase();

  if (/\bpiano\b|\bacoustic\s+grand\b/.test(normalized)) return 0;
  if (/\bbright\s+piano\b/.test(normalized)) return 1;
  if (/\belectric\s+piano\b|\bep\b/.test(normalized)) return 4;
  if (/\borgan\b/.test(normalized)) return 16;
  if (/\bnylon\b/.test(normalized)) return 24;
  if (/\bsteel\b/.test(normalized)) return 25;
  if (/\bclean\b/.test(normalized)) return 27;
  if (/\bmuted\b/.test(normalized)) return 28;
  if (/\boverdriven\b/.test(normalized)) return 29;
  if (/\bdistortion\b|\bcrunch\b/.test(normalized)) return 30;
  if (/\bbass\b/.test(normalized)) return 33;
  if (/\bstrings?\b/.test(normalized)) return 48;
  if (/\bchoir\b/.test(normalized)) return 52;
  if (/\btrumpet\b/.test(normalized)) return 56;
  if (/\bsax\b/.test(normalized)) return 66;
  if (/\bflute\b/.test(normalized)) return 73;
  if (/\blead\b/.test(normalized)) return 81;
  if (/\bpad\b/.test(normalized)) return 89;

  return null;
};

export const inferMidiFromPatchContext = ({ section = '', patch = '', instrument = '' } = {}) => {
  if (!isMidiCueActive()) return null;

  const context = `${section} ${instrument} ${patch}`.trim();
  const commonProgram = inferProgramByCommonInstrumentName(context);
  if (Number.isFinite(commonProgram)) {
    return {
      program: commonProgram,
      channel: getDefaultMidiChannelByContext(context),
    };
  }

  const categoryHint = inferCategoryHintFromContext(context);
  const closestPatch = findClosestGmPatch(patch || context, categoryHint);
  if (!closestPatch || !Number.isFinite(Number(closestPatch.program))) return null;

  return {
    program: Number(closestPatch.program),
    channel: getDefaultMidiChannelByContext(context),
  };
};

export const mergeMidiWithInference = ({ explicitMidi, section = '', patch = '', instrument = '' } = {}) => {
  if (!isMidiCueActive()) return null;

  const inferred = inferMidiFromPatchContext({ section, patch, instrument });
  const merged = {
    ...(inferred || {}),
    ...(explicitMidi || {}),
  };

  if (!Number.isFinite(Number(merged.program))) return null;
  if (!Number.isFinite(Number(merged.channel))) {
    merged.channel = getDefaultMidiChannelByContext(`${section} ${instrument} ${patch}`);
  }

  return merged;
};
