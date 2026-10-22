/**
 * Stub `server/_turso.js` untuk check-setlist-write-batch.mjs.
 *
 * Client di sini merekam setiap query dan selalu menjawab "setlist berisi 5
 * lagu" sehingga alur diff di handler bisa diperiksa tanpa database.
 */

const initialState = () => ({
  songs: ['song-1', 'song-2', 'song-3', 'song-4', 'song-5'].map((songId, index) => ({
    song_id: songId,
    position: index,
    meta: JSON.stringify({ key: 'C' }),
  })),
});

// State database mini: isi setlist_songs saat ini.
let currentSongs = initialState().songs;

export function resetState() {
  currentSongs = initialState().songs;
}

export const recorded = { execute: [], batch: [] };

/** Terapkan statement batch ke state mini agar panggilan berikutnya realistis. */
function applyBatch(statements) {
  for (const statement of statements) {
    const sql = String(statement.sql).replace(/\s+/g, ' ').trim();
    const args = statement.args || [];
    if (sql.startsWith('INSERT INTO setlist_songs')) {
      currentSongs = currentSongs.filter((row) => row.song_id !== args[1]);
      currentSongs.push({ song_id: args[1], position: args[2], meta: args[3] });
    } else if (sql.startsWith('UPDATE setlist_songs')) {
      currentSongs = currentSongs.map((row) =>
        row.song_id === args[4] ? { ...row, position: args[0], meta: args[1] } : row
      );
    } else if (sql.startsWith('DELETE FROM setlist_songs')) {
      currentSongs = currentSongs.filter((row) => row.song_id !== args[1]);
    }
  }
}

export const stubClient = {
  execute: async (statement) => {
    const sql = typeof statement === 'string' ? statement : statement.sql;
    const args = typeof statement === 'string' ? [] : statement.args || [];
    const normalized = String(sql).replace(/\s+/g, ' ').trim();
    recorded.execute.push({ sql: normalized, args });

    if (normalized.startsWith('SELECT bandId, userId FROM setlists')) {
      return { rows: [{ bandId: 'band-1', userId: 'user-1' }] };
    }
    if (normalized.startsWith('SELECT role FROM band_members')) {
      return { rows: [{ role: 'owner' }] };
    }
    if (normalized.startsWith('SELECT song_id, position, meta FROM setlist_songs')) {
      return { rows: currentSongs.map((row) => ({ ...row })) };
    }
    return { rows: [], columns: [] };
  },
  batch: async (statements) => {
    for (const statement of statements) {
      recorded.batch.push({
        sql: String(statement.sql).replace(/\s+/g, ' ').trim(),
        args: statement.args || [],
      });
    }
    applyBatch(statements);
    return { results: [] };
  },
  close: () => {},
};

export function getTursoClient() {
  return stubClient;
}
