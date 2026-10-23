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
 * Cari metadata lagu (artist, key, tempo, genre, keyboard patch) via AI.
 *
 * Catatan: YouTube ID TIDAK diisi di sini. User memilih video sendiri lewat
 * tombol "Cari video" (YoutubeVideoPickerModal) agar hasilnya tidak menebak.
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
    keyboardPatch: !!data.keyboardPatch,
  };
}

export default autofillSongMetadata;
