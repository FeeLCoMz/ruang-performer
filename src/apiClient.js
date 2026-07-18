export async function getUserAuditLogs() {
  const res = await fetch('/api/auth/user-audit-logs', {
    method: 'GET',
    headers: {
      ...authUtils.getAuthHeader(),
      'Content-Type': 'application/json',
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mengambil audit log');
  return data.logs;
}
export async function deleteAccount() {
  const res = await fetch('/api/auth/delete-account', {
    method: 'DELETE',
    headers: {
      ...authUtils.getAuthHeader(),
      'Content-Type': 'application/json',
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal menghapus akun');
  return data;
}
// Update user profile
export async function updateProfile(profileData) {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(profileData)
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to update profile');
  }
  return await res.json();
}

// Change password
export async function changePassword(oldPassword, newPassword) {
  const res = await fetch(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ oldPassword, newPassword })
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to change password');
  }
  return await res.json();
}
// Tools (Owner) API
export async function backupDatabase() {
  const res = await fetch(`${API_BASE}/tools/backup`, {
    method: 'GET',
    headers: getHeaders()
  });
  if (!res.ok) {
    let err;
    try { err = await res.text(); } catch {}
    throw new Error('Failed to backup database');
  }
  return await res.text();
}
export async function exportAllData() {
  const res = await fetch(`${API_BASE}/tools`, {
    method: 'GET',
    headers: getHeaders()
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to export data');
  }
  return await res.json();
}

export async function importAllData({ songs, setlists, bands, users }) {
  const res = await fetch(`${API_BASE}/tools`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ songs, setlists, bands, users })
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to import data');
  }
  return await res.json();
}
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

const API_BASE = '/api';

function getHeaders(additionalHeaders = {}) {
  return {
    'Content-Type': 'application/json',
    ...authUtils.getAuthHeader(),
    ...additionalHeaders
  };
}

async function cacheFullSongDetailsInBackground(songs = []) {
  const uniqueIds = Array.from(
    new Set(
      (songs || [])
        .map((song) => song?.id)
        .filter(Boolean)
    )
  );

  if (uniqueIds.length === 0 || typeof navigator === 'undefined' || navigator.onLine === false) {
    return;
  }

  const CONCURRENCY = 4;
  let currentIndex = 0;

  const workers = Array.from({ length: Math.min(CONCURRENCY, uniqueIds.length) }, async () => {
    while (currentIndex < uniqueIds.length) {
      const id = uniqueIds[currentIndex];
      currentIndex += 1;

      try {
        const detailRes = await fetch(`${API_BASE}/songs/${id}`, {
          headers: getHeaders(),
        });
        if (!detailRes.ok) {
          continue;
        }

        const detailSong = await detailRes.json();
        await cacheSong(detailSong);
      } catch {
        // Ignore background cache sync errors to keep UI responsive.
      }
    }
  });

  Promise.allSettled(workers).catch(() => {});
}

// Auth endpoints
export async function register(email, username, password) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password })
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Registration failed');
  }
  return await res.json();
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Login failed');
  }
  return await res.json();
}

export async function getCurrentUser() {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: 'GET',
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to get current user');
  return await res.json();
}

// Password Reset endpoints
export async function requestPasswordReset(email) {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to request password reset');
  }
  return await res.json();
}

export async function resetPassword(token, email, newPassword) {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, email, newPassword })
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to reset password');
  }
  return await res.json();
}

export async function fetchSongs(options = {}) {
  const params = new URLSearchParams();
  if (options.bandId) {
    params.set('bandId', options.bandId);
  }
  const query = params.toString();
  const url = query ? `${API_BASE}/songs?${query}` : `${API_BASE}/songs`;

  try {
    const res = await fetch(url, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch songs');

    const songs = await res.json();
    if (Array.isArray(songs)) {
      await cacheSongs(songs).catch(() => {});
      cacheFullSongDetailsInBackground(songs);
    }

    return songs;
  } catch (error) {
    const cachedSongs = await getAllSongs().catch(() => []);
    if (Array.isArray(cachedSongs) && cachedSongs.length > 0) {
      if (options.bandId) {
        return cachedSongs.filter((song) => String(song?.bandId || '') === String(options.bandId));
      }
      return cachedSongs;
    }

    throw error;
  }
}

export async function fetchSongById(id) {
  try {
    const res = await fetch(`${API_BASE}/songs/${id}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch song');

    const song = await res.json();
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
  const res = await fetch(`${API_BASE}/songs`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(song)
  });
  if (!res.ok) throw new Error('Failed to add song');
  return await res.json();
}

export async function updateSong(id, song) {
  const res = await fetch(`${API_BASE}/songs/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(song)
  });
  if (!res.ok) throw new Error('Failed to update song');
  return await res.json();
}

export async function updateSongMastery(id, mastered = true) {
  const res = await fetch(`${API_BASE}/songs/${id}/mastery`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ mastered })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update song mastery');
  }
  return await res.json();
}

export async function deleteSong(id) {
  const res = await fetch(`${API_BASE}/songs/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) {
    if (res.status === 204) return; // No content is success
    throw new Error('Failed to delete song');
  }
  if (res.status === 204) return; // No content response
  return await res.json();
}

export async function fetchSetLists(options = {}) {
  const params = new URLSearchParams();
  if (options.summary) params.set('summary', '1');
  const url = params.toString() ? `${API_BASE}/setlists?${params.toString()}` : `${API_BASE}/setlists`;

  try {
    const res = await fetch(url, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch setlists');

    const setlists = await res.json();
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
    const res = await fetch(`${API_BASE}/setlists/${id}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch setlist');

    const setlist = await res.json();
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
  const res = await fetch(`${API_BASE}/setlists`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(setList)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to add setlist');
  }
  return await res.json();
}

export async function deleteSetList(id) {
  const res = await fetch(`${API_BASE}/setlists/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete setlist');
  }
  // Status 204 has no content
  return res.status === 204 ? { id } : await res.json();
}

export async function updateSetList(setList) {
  const res = await fetch(`${API_BASE}/setlists/${setList.id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(setList)
  });
  if (!res.ok) throw new Error('Failed to update setlist');
  return await res.json();
}

export async function askAI({ prompt, context, system, model } = {}) {
  const res = await fetch(`${API_BASE}/ai`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ prompt, context, system, model })
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to call AI');
  }
  return await res.json();
}


export async function transcribeAudio(audioFile) {
  const formData = new FormData();
  formData.append('audio', audioFile);
  const res = await fetch(`${API_BASE}/ai/transcribe`, {
    method: 'POST',
    headers: { ...authUtils.getAuthHeader() },
    body: formData
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to transcribe audio');
  }
  return await res.json();
}

export async function aiSongSearch({ title, artist }) {
  const res = await fetch(`${API_BASE}/ai/song-search`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ title, artist })
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to search song');
  }
  return await res.json();
}

// Bands API
export async function fetchBands() {
  const res = await fetch(`${API_BASE}/bands`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch bands');
  return await res.json();
}

export async function fetchBandById(id) {
  const res = await fetch(`${API_BASE}/bands/${id}`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch band');
  return await res.json();
}

export async function createBand(band) {
  const res = await fetch(`${API_BASE}/bands`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(band)
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to create band');
  }
  return await res.json();
}

export async function updateBand(id, band) {
  const res = await fetch(`${API_BASE}/bands/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(band)
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to update band');
  }
  return await res.json();
}

export async function deleteBand(id) {
  const res = await fetch(`${API_BASE}/bands/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to delete band');
  }
  return await res.json();
}

export async function fetchYoutubeTrending() {
  const res = await fetch(`${API_BASE}/youtube/trending`, {
    headers: getHeaders()
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to fetch YouTube trending');
  }
  return await res.json();
}

// Gigs API
export async function fetchGigs(bandId = null) {
  let url = `${API_BASE}/events/gig`;
  if (bandId) {
    url += `?bandId=${encodeURIComponent(bandId)}`;
  }
  const res = await fetch(url, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch gigs');
  return await res.json();
}

export async function fetchGigById(id) {
  const res = await fetch(`${API_BASE}/events/gig/${id}`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch gig');
  return await res.json();
}

export async function createGig(gig) {
  const res = await fetch(`${API_BASE}/events/gig`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(gig)
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to create gig');
  }
  return await res.json();
}

export async function updateGig(id, gig) {
  const res = await fetch(`${API_BASE}/events/gig/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(gig)
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to update gig');
  }
  return await res.json();
}

export async function deleteGig(id) {
  const res = await fetch(`${API_BASE}/events/gig/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to delete gig');
  }
  // 204 No Content has no body
  if (res.status === 204) {
    return { success: true };
  }
  return await res.json();
}

// List Gemini Models
export async function listGeminiModels() {
  const res = await fetch(`/api/ai/list-models`, {
    method: 'GET',
    headers: getHeaders(),
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to list Gemini models');
  }
  return await res.json();
}

// Band Members endpoints
// Tambah anggota band
export async function addBandMember(bandId, email, role) {
  const res = await fetch(`${API_BASE}/bands/${bandId}/members`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email, role })
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to add band member');
  }
  return await res.json();
}
export async function getBandMembers(bandId) {
  const res = await fetch(`${API_BASE}/bands/${bandId}/members`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch band members');
  return await res.json();
}

export async function updateMemberRole(bandId, userId, role) {
  const res = await fetch(`${API_BASE}/bands/${bandId}/members/${userId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ role })
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to update member role');
  }
  return await res.json();
}

export async function removeBandMember(bandId, userId) {
  const res = await fetch(`${API_BASE}/bands/${bandId}/members/${userId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to remove member');
  }
  return await res.json();
}

// --- User Management (Owner Only) ---
export async function getAllUsers() {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'GET',
    headers: getHeaders()
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Gagal mengambil daftar users');
  }
  return await res.json();
}

export async function getUserById(userId) {
  const res = await fetch(`${API_BASE}/users/${userId}`, {
    method: 'GET',
    headers: getHeaders()
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Gagal mengambil data user');
  }
  return await res.json();
}

export async function updateUser(userId, updates) {
  const res = await fetch(`${API_BASE}/users/${userId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates)
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Gagal mengupdate user');
  }
  return await res.json();
}

export async function deleteUser(userId) {
  const res = await fetch(`${API_BASE}/users/${userId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Gagal menghapus user');
  }
  return await res.json();
}

export async function resetUserPassword(userId, newPassword) {
  const res = await fetch(`${API_BASE}/users/${userId}/reset-password`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ newPassword })
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Gagal reset password');
  }
  return await res.json();
}

// Popular Songs API
export async function fetchPopularSongs() {
  const res = await fetch(`${API_BASE}/ai/popular-songs`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch popular songs');
  return await res.json();
}

