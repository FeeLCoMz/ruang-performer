/**
 * Uji regresi: menyimpan setlist tidak boleh lagi menulis ulang seluruh isi
 * setlist_songs satu query per lagu (penyebab lambat saat menambah lagu).
 *
 * Handler dipanggil dengan client Turso palsu yang merekam setiap query, lalu
 * diperiksa bahwa:
 * - menambah 1 lagu ke setlist 5 lagu hanya menghasilkan 1 INSERT + 1 batch,
 * - lagu lama tidak dihapus lalu di-insert ulang,
 * - menyimpan ulang tanpa perubahan tidak menulis apa pun.
 *
 * Jalankan: node --import ./scripts/check-setlist-write-batch-stub.mjs scripts/check-setlist-write-batch.mjs
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
};

const { recorded, resetState } = await import('./check-setlist-write-batch-turso-stub.mjs');
const { default: handler } = await import('../server/handlers/setlists.js');

const makeRequest = (songs) => ({
  method: 'PUT',
  path: '/api/setlists/setlist-1',
  url: '/api/setlists/setlist-1',
  headers: {},
  user: { userId: 'user-1' },
  body: { bandId: 'band-1', songs, setlistSongMeta: {} },
});

const makeResponse = () => ({
  statusCode: null,
  payload: null,
  status(code) { this.statusCode = code; return this; },
  json(data) { this.payload = data; return this; },
  setHeader() { return this; },
  end() { return this; },
});

const resetRecorded = () => {
  resetState();
  recorded.execute.length = 0;
  recorded.batch.length = 0;
};

// --- 1. Menambah satu lagu -------------------------------------------------
resetRecorded();
const res = makeResponse();
await handler(makeRequest(['song-1', 'song-2', 'song-3', 'song-4', 'song-5', 'song-new']), res);

assert(res.statusCode === 200, 'PUT setlist sukses');

const songWrites = [...recorded.execute, ...recorded.batch].filter((entry) =>
  /^(INSERT INTO setlist_songs|UPDATE setlist_songs|DELETE FROM setlist_songs)/.test(entry.sql)
);
const inserts = songWrites.filter((entry) => entry.sql.startsWith('INSERT INTO setlist_songs'));
const deletes = songWrites.filter((entry) => entry.sql.startsWith('DELETE FROM setlist_songs'));
const writesOutsideBatch = recorded.execute.filter((entry) =>
  /^(INSERT|UPDATE|DELETE) INTO? ?setlist_songs/.test(entry.sql)
  || entry.sql.startsWith('INSERT INTO band_song_preferences')
);

assert(inserts.length === 1, `hanya 1 INSERT untuk lagu baru (dapat ${inserts.length})`);
assert(deletes.length === 0, 'lagu lama tidak dihapus lalu di-insert ulang');
assert(
  recorded.batch.length > 0 && writesOutsideBatch.length === 0,
  'semua tulis setlist_songs/band_song_preferences dikirim lewat batch'
);
assert(
  recorded.batch.some((entry) => entry.sql.startsWith('INSERT INTO setlist_songs')),
  'INSERT lagu baru ada di dalam batch'
);

// --- 2. Simpan ulang tanpa perubahan ---------------------------------------
// Catatan: state stub hanya direset antar-skenario, bukan di sini — lagu yang
// baru ditambahkan pada skenario 1 harus tetap ada di "database".
recorded.execute.length = 0;
recorded.batch.length = 0;
const resSame = makeResponse();
await handler(makeRequest(['song-1', 'song-2', 'song-3', 'song-4', 'song-5', 'song-new']), resSame);

assert(resSame.statusCode === 200, 'PUT setlist tanpa perubahan sukses');
assert(recorded.batch.length === 0, 'tidak ada tulis ke setlist_songs saat isi tidak berubah');
assert(
  recorded.execute.every((entry) => !entry.sql.includes('setlist_songs') || !/^(INSERT|UPDATE|DELETE)/.test(entry.sql)),
  'tidak ada DELETE/INSERT saat isi setlist tidak berubah'
);

// --- 3. Menghapus satu lagu ------------------------------------------------
resetRecorded();
await handler(makeRequest(['song-1', 'song-2', 'song-3', 'song-4']), makeResponse());

const deleteStatements = recorded.batch.filter((entry) => entry.sql.startsWith('DELETE FROM setlist_songs'));
assert(deleteStatements.length === 1, 'menghapus satu lagu = 1 DELETE');
assert(
  deleteStatements[0].args.join(',') === 'setlist-1,song-5',
  'yang dihapus hanya lagu yang benar-benar dibuang'
);
assert(
  !recorded.batch.some((entry) => entry.sql.startsWith('INSERT INTO setlist_songs')),
  'menghapus lagu tidak menulis ulang sisanya'
);

if (!process.exitCode) console.log('\nSETLIST WRITE BATCH CHECK OK');
