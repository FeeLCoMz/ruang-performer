/**
 * aiAutofillApi.js
 *
 * Panggilan API modul AI Autofill.
 *
 * Dipisah dari halaman supaya:
 *   - modul punya satu pintu masuk (API + gate on/off), dan
 *   - pemanggil tidak perlu tahu bentuk request/response mentah.
 */
import * as apiClient from '../../apiClient.js';
import { isAIAutofillEnabled } from './aiAutofillSettings.js';

/**
 * Cari metadata lagu (artist, key, tempo, genre, youtubeId, chord links) via AI.
 *
 * Bila YouTube ID kosong tetapi server menyertakan alasan di `debug`
 * (kunci belum diset / kuota habis / timeout), lempar error yang jelas supaya
 * pengguna tahu field mana yang gagal — bukan dibiarkan kosong tanpa sebab.
 *
 * @param {{ title: string, artist?: string }} params
 * @returns {Promise<object>} Hasil dari endpoint (bentuk mengikuti server).
 * @throws {Error} Bila modul nonaktif atau request gagal.
 */
export async function autofillSongMetadata({ title, artist = '' } = {}) {
  if (!isAIAutofillEnabled()) {
    throw new Error('Modul AI Autofill sedang dinonaktifkan. Aktifkan di halaman Modul.');
  }

  const trimmedTitle = String(title || '').trim();
  if (!trimmedTitle) {
    throw new Error('Isi judul lagu terlebih dahulu untuk AI autofill');
  }

  const result = await apiClient.aiSongSearch({ title: trimmedTitle, artist: String(artist || '').trim() });
  return result;
}

/**
 * Alasan kegagalan pengisian YouTube ID, atau null bila tidak ada masalah.
 * Dipakai UI untuk memberi keterangan tanpa menggagalkan seluruh autofill.
 *
 * @param {object} result - Respons aiSongSearch.
 * @returns {string|null}
 */
export function describeYouTubeFailure(result) {
  if (!result || result.youtubeId) return null;
  const debug = result.debug || {};
  if (debug.youtubeKeyMissing) {
    return 'YouTube ID tidak terisi: kunci YouTube API belum diset di server (VITE_YOUTUBE_API_KEY / YOUTUBE_API_KEY).';
  }
  if (debug.youtubeStatus === 403) {
    return 'YouTube ID tidak terisi: kuota YouTube API habis atau kunci tidak diizinkan (403).';
  }
  if (debug.youtubeError) {
    return `YouTube ID tidak terisi: ${debug.youtubeError}`;
  }
  if (debug.youtubeResults === 0) {
    const tried = Array.isArray(debug.youtubeQueriesTried) && debug.youtubeQueriesTried.length > 0
      ? ` (dicoba: ${debug.youtubeQueriesTried.map((q) => `"${q}"`).join(', ')})`
      : '';
    return `YouTube ID tidak terisi: tidak ada video yang cocok ditemukan${tried}.`;
  }
  return 'YouTube ID tidak terisi: hasil pencarian kosong.';
}

/**
 * Ubah hasil AI menjadi peta checkbox default untuk modal konfirmasi.
 * Hanya field yang benar-benar terisi yang dicentang.
 *
 * @param {object} result
 * @returns {Record<string, boolean>}
 */
export function buildDefaultAiConfirmFields(result) {
  const data = result || {};
  return {
    artist: !!data.artist,
    key: !!data.key,
    tempo: !!data.tempo,
    genre: !!data.genre,
    youtubeId: !!data.youtubeId,
    keyboardPatch: !!data.keyboardPatch,
  };
}

export default autofillSongMetadata;
