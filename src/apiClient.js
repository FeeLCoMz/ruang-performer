// Simple API client for Turso backend
import * as authUtils from './utils/auth.js';
import {
  cacheSong,
  cacheSongs,
  getAllSongs,
  getSong as getCachedSong,
  cacheSetlist,
  cacheSetlists,
  getAllSetlists,
  getSetlist as getCachedSetlist,
} from './utils/offlineCache.js';

export async function getUserAuditLogs() {
  const data = await request('/auth/user-audit-logs', {
    fallbackError: 'Gagal mengambil audit log',
  });
  return data.logs;
}
export async function deleteAccount() {
  return request('/auth/delete-account', {
    method: 'DELETE',
    fallbackError: 'Gagal menghapus akun',
  });
}
// Update user profile
export async function updateProfile(profileData) {
  return request('/auth/me', {
    method: 'PUT',
    body: profileData,
    fallbackError: 'Failed to update profile',
  });
}

// Change password
export async function changePassword(oldPassword, newPassword) {
  return request('/auth/change-password', {
    method: 'POST',
    body: { oldPassword, newPassword },
    fallbackError: 'Failed to change password',
  });
}
// Tools (Owner) API
export async function backupDatabase() {
  return request('/tools/backup', { expect: 'text', fallbackError: 'Failed to backup database' });
}
export async function exportAllData() {
  return request('/tools', { fallbackError: 'Failed to export data' });
}

export async function importAllData({ songs, setlists, bands, users }) {
  return request('/tools', {
    method: 'POST',
    body: { songs, setlists, bands, users },
    fallbackError: 'Failed to import data',
  });
}
const API_BASE = '/api';

function resolveUrl(path) {
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith('/api')) return path;
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Single entry point for all API calls: performs the fetch, parses the
 * response body and normalises error handling into a thrown Error carrying
 * the server-provided message.
 *
 * @param {string} path Endpoint path (e.g. '/songs') or absolute URL.
 * @param {Object} [options]
 * @param {string} [options.method='GET'] HTTP method.
 * @param {*} [options.body] Value to JSON-serialise as the request body.
 * @param {Object} [options.headers] Extra headers merged last.
 * @param {boolean} [options.authenticated=true] Attach the auth header.
 * @param {boolean} [options.sendContentType=true] Send a JSON content type.
 * @param {'json'|'text'} [options.expect='json'] Response body format.
 * @param {string} [options.fallbackError] Message used when the server gives none.
 */
async function request(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    authenticated = true,
    sendContentType = true,
    expect = 'json',
    fallbackError = 'Request failed',
  } = options;

  const baseHeaders = sendContentType
    ? { 'Content-Type': 'application/json' }
    : {};
  const requestHeaders = authenticated
    ? { ...baseHeaders, ...authUtils.getAuthHeader(), ...headers }
    : { ...baseHeaders, ...headers };

  const init = { method, headers: requestHeaders };
  if (body !== undefined && body !== null) {
    // Pass FormData/Blob/ReadableStream bodies through untouched.
    const isRawBody =
      (typeof FormData !== 'undefined' && body instanceof FormData) ||
      (typeof Blob !== 'undefined' && body instanceof Blob) ||
      (typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer) ||
      typeof body === 'string';
    init.body = isRawBody ? body : JSON.stringify(body);
  }

  const res = await fetch(resolveUrl(path), init);

  if (!res.ok) {
    let message = '';
    if (expect === 'text') {
      message = (await res.text().catch(() => '')) || '';
    } else {
      const errorData = await res.json().catch(() => ({}));
      message = typeof errorData?.error === 'string' ? errorData.error : '';
    }
    throw new Error(message || fallbackError);
  }

  if (expect === 'text') return res.text();
  if (res.status === 204) return null;
  return res.json();
}

// Auth endpoints
export async function register(email, username, password) {
  return request('/auth/register', {
    method: 'POST',
    authenticated: false,
    body: { email, username, password },
    fallbackError: 'Registration failed',
  });
}

export async function login(email, password) {
  return request('/auth/login', {
    method: 'POST',
    authenticated: false,
    body: { email, password },
    fallbackError: 'Login failed',
  });
}

export async function getCurrentUser() {
  return request('/auth/me', { fallbackError: 'Failed to get current user' });
}

// Password Reset endpoints
export async function requestPasswordReset(email) {
  return request('/auth/forgot-password', {
    method: 'POST',
    authenticated: false,
    body: { email },
    fallbackError: 'Failed to request password reset',
  });
}

export async function resetPassword(token, email, newPassword) {
  return request('/auth/reset-password', {
    method: 'POST',
    authenticated: false,
    body: { token, email, newPassword },
    fallbackError: 'Failed to reset password',
  });
}

export async function fetchSongs(options = {}) {
  const params = new URLSearchParams();
  if (options.bandId) {
    params.set('bandId', options.bandId);
  }
  if (options.includeTrending) {
    params.set('include', 'trending');
  }
  const query = params.toString();
  const path = query ? `/songs?${query}` : '/songs';

  try {
    const payload = await request(path, { fallbackError: 'Failed to fetch songs' });
    const songs = Array.isArray(payload) ? payload : Array.isArray(payload?.songs) ? payload.songs : [];
    const trending = Array.isArray(payload?.trending) ? payload.trending : [];

    if (Array.isArray(songs)) {
      await cacheSongs(songs).catch(() => {});
    }

    return options.includeTrending ? { songs, trending } : songs;
  } catch (error) {
    const cachedSongs = await getAllSongs().catch(() => []);
    if (Array.isArray(cachedSongs) && cachedSongs.length > 0) {
      const songs = options.bandId
        ? cachedSongs.filter((song) => String(song?.bandId || '') === String(options.bandId))
        : cachedSongs;
      return options.includeTrending ? { songs, trending: [] } : songs;
    }

    throw error;
  }
}

export async function fetchSongById(id) {
  try {
    const song = await request(`/songs/${id}`, { fallbackError: 'Failed to fetch song' });
    await cacheSong(song).catch(() => {});
    return song;
  } catch (error) {
    const cachedSong = await getCachedSong(id).catch(() => null);
    if (cachedSong) {
      return cachedSong;
    }

    throw error;
  }
}

export async function addSong(song) {
  return request('/songs', { method: 'POST', body: song, fallbackError: 'Failed to add song' });
}

export async function updateSong(id, song) {
  return request(`/songs/${id}`, { method: 'PUT', body: song, fallbackError: 'Failed to update song' });
}

export async function updateSongMastery(id, mastered = true) {
  return request(`/songs/${id}/mastery`, {
    method: 'PUT',
    body: { mastered },
    fallbackError: 'Failed to update song mastery',
  });
}

export async function deleteSong(id) {
  const data = await request(`/songs/${id}`, {
    method: 'DELETE',
    fallbackError: 'Failed to delete song',
  });
  return data ?? undefined;
}

export async function fetchSetLists(options = {}) {
  const params = new URLSearchParams();
  if (options.summary) params.set('summary', '1');
  const path = params.toString() ? `/setlists?${params.toString()}` : '/setlists';

  try {
    const setlists = await request(path, { fallbackError: 'Failed to fetch setlists' });
    if (Array.isArray(setlists) && !options.summary) {
      await cacheSetlists(setlists).catch(() => {});
    }

    return setlists;
  } catch (error) {
    if (options.summary) {
      throw error;
    }

    const cachedSetlists = await getAllSetlists().catch(() => []);
    if (Array.isArray(cachedSetlists) && cachedSetlists.length > 0) {
      return cachedSetlists;
    }

    throw error;
  }
}

export async function fetchSetListById(id) {
  try {
    const setlist = await request(`/setlists/${id}`, { fallbackError: 'Failed to fetch setlist' });
    await cacheSetlist(setlist).catch(() => {});
    return setlist;
  } catch (error) {
    const cachedSetlist = await getCachedSetlist(id).catch(() => null);
    if (cachedSetlist) {
      return cachedSetlist;
    }

    throw error;
  }
}

export async function prefetchPerformanceData() {
  const setlists = await fetchSetLists();

  // Fetch detail for each setlist so songs order, metadata, and completion state are cached.
  const uniqueSetlistIds = Array.from(
    new Set(
      (setlists || [])
        .map((setlist) => setlist?.id)
        .filter(Boolean)
    )
  );

  const detailedSetlists = await Promise.all(
    uniqueSetlistIds.map(async (setlistId) => {
      try {
        return await fetchSetListById(setlistId);
      } catch {
        return null;
      }
    })
  );

  const availableSetlists = detailedSetlists.filter(Boolean);
  if (availableSetlists.length > 0) {
    await cacheSetlists(availableSetlists).catch(() => {});
  }

  const songIds = new Set();
  availableSetlists.forEach((setlist) => {
    (setlist?.songs || []).forEach((songId) => {
      if (songId) {
        songIds.add(songId);
      }
    });
  });

  await Promise.all(
    Array.from(songIds).map(async (songId) => {
      try {
        await fetchSongById(songId);
      } catch {
        // Skip unavailable songs and continue prefetch for the rest.
      }
    })
  );

  return {
    setlists: availableSetlists.length,
    songs: songIds.size,
  };
}

export async function addSetList(setList) {
  return request('/setlists', { method: 'POST', body: setList, fallbackError: 'Failed to add setlist' });
}

export async function deleteSetList(id) {
  const data = await request(`/setlists/${id}`, {
    method: 'DELETE',
    fallbackError: 'Failed to delete setlist',
  });
  return data ?? { id };
}

export async function updateSetList(setList) {
  return request(`/setlists/${setList.id}`, {
    method: 'PUT',
    body: setList,
    fallbackError: 'Failed to update setlist',
  });
}

export async function askAI({ prompt, context, system, model } = {}) {
  return request('/ai', {
    method: 'POST',
    body: { prompt, context, system, model },
    fallbackError: 'Failed to call AI',
  });
}


export async function transcribeAudio(audioFile) {
  const formData = new FormData();
  formData.append('audio', audioFile);
  return request('/ai/transcribe', {
    method: 'POST',
    sendContentType: false,
    body: formData,
    fallbackError: 'Failed to transcribe audio',
  });
}

export async function aiSongSearch({ title, artist }) {
  return request('/ai/song-search', {
    method: 'POST',
    body: { title, artist },
    fallbackError: 'Failed to search song',
  });
}

// Bands API
export async function fetchBands() {
  return request('/bands', { fallbackError: 'Failed to fetch bands' });
}

export async function fetchBandById(id) {
  return request(`/bands/${id}`, { fallbackError: 'Failed to fetch band' });
}

export async function createBand(band) {
  return request('/bands', { method: 'POST', body: band, fallbackError: 'Failed to create band' });
}

export async function updateBand(id, band) {
  return request(`/bands/${id}`, { method: 'PUT', body: band, fallbackError: 'Failed to update band' });
}

export async function deleteBand(id) {
  return request(`/bands/${id}`, { method: 'DELETE', fallbackError: 'Failed to delete band' });
}

export async function fetchYoutubeTrending() {
  const data = await request('/songs?include=trending', {
    fallbackError: 'Failed to fetch YouTube trending',
  });
  return {
    trending: Array.isArray(data?.trending) ? data.trending : []
  };
}

// Gigs API
export async function fetchGigs(bandId = null) {
  const path = bandId
    ? `/events/gig?bandId=${encodeURIComponent(bandId)}`
    : '/events/gig';
  return request(path, { fallbackError: 'Failed to fetch gigs' });
}

export async function createGig(gig) {
  return request('/events/gig', { method: 'POST', body: gig, fallbackError: 'Failed to create gig' });
}

export async function updateGig(id, gig) {
  return request(`/events/gig/${id}`, { method: 'PUT', body: gig, fallbackError: 'Failed to update gig' });
}

export async function deleteGig(id) {
  const data = await request(`/events/gig/${id}`, {
    method: 'DELETE',
    fallbackError: 'Failed to delete gig',
  });
  // 204 No Content has no body
  return data ?? { success: true };
}

// List Gemini Models
export async function listGeminiModels() {
  return request('/ai/list-models', { fallbackError: 'Failed to list Gemini models' });
}

// Band Members endpoints
// Tambah anggota band
export async function addBandMember(bandId, email, role) {
  return request(`/bands/${bandId}/members`, {
    method: 'POST',
    body: { email, role },
    fallbackError: 'Failed to add band member',
  });
}
export async function getBandMembers(bandId) {
  return request(`/bands/${bandId}/members`, { fallbackError: 'Failed to fetch band members' });
}

export async function updateMemberRole(bandId, userId, role) {
  return request(`/bands/${bandId}/members/${userId}`, {
    method: 'PATCH',
    body: { role },
    fallbackError: 'Failed to update member role',
  });
}

export async function removeBandMember(bandId, userId) {
  return request(`/bands/${bandId}/members/${userId}`, {
    method: 'DELETE',
    fallbackError: 'Failed to remove member',
  });
}

// --- User Management (Owner Only) ---
export async function getAllUsers() {
  return request('/users', { fallbackError: 'Gagal mengambil daftar users' });
}

export async function getUserById(userId) {
  return request(`/users/${userId}`, { fallbackError: 'Gagal mengambil data user' });
}

export async function updateUser(userId, updates) {
  return request(`/users/${userId}`, { method: 'PUT', body: updates, fallbackError: 'Gagal mengupdate user' });
}

export async function deleteUser(userId) {
  return request(`/users/${userId}`, { method: 'DELETE', fallbackError: 'Gagal menghapus user' });
}

export async function resetUserPassword(userId, newPassword) {
  return request(`/users/${userId}/reset-password`, {
    method: 'POST',
    body: { newPassword },
    fallbackError: 'Gagal reset password',
  });
}

// Popular Songs API
export async function fetchPopularSongs() {
  const payload = await fetchSongs({ includeTrending: true });

  if (Array.isArray(payload)) {
    return { youtubeSongs: [] };
  }

  const trending = Array.isArray(payload?.trending) ? payload.trending : [];
  const youtubeSongs = trending.map((item) => ({
    id: item.videoId || item.id || item.youtubeId || item.title,
    youtubeId: item.videoId || item.youtubeId || item.id || null,
    title: item.title || item.snippet?.title || '',
    artist: item.channelTitle || item.artist || item.snippet?.channelTitle || '',
    thumbnail: item.thumbnailUrl || item.thumbnail || item.snippet?.thumbnails?.high?.url || null,
    viewCount: item.viewCount || null,
    publishedAt: item.publishedAt || null,
  }));

  return { youtubeSongs };
}

