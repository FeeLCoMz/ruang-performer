// Simple API client for Turso backend
import * as authUtils from './utils/auth.js';

const API_BASE = '/api';

function getHeaders(additionalHeaders = {}) {
  return {
    'Content-Type': 'application/json',
    ...authUtils.getAuthHeader(),
    ...additionalHeaders
  };
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

// Two-Factor Authentication endpoints
export async function setup2FA() {
  const res = await fetch(`${API_BASE}/auth/2fa/setup`, {
    method: 'GET',
    headers: getHeaders()
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to setup 2FA');
  }
  return await res.json();
}

export async function verify2FA(secret, token, backupCodes) {
  const res = await fetch(`${API_BASE}/auth/2fa/verify`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ secret, token, backupCodes })
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to verify 2FA');
  }
  return await res.json();
}

export async function fetchSongs() {
  const res = await fetch(`${API_BASE}/songs`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch songs');
  return await res.json();
}

export async function fetchSongById(id) {
  const res = await fetch(`${API_BASE}/songs/${id}`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch song');
  return await res.json();
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

export async function fetchSetLists() {
  const res = await fetch(`${API_BASE}/setlists`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch setlists');
  return await res.json();
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

// Practice Sessions API
export async function fetchPracticeSessions(bandId = null) {
  let url = `${API_BASE}/practice`;
  if (bandId) {
    url += `?bandId=${bandId}`;
  }
  const res = await fetch(url, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch practice sessions');
  return await res.json();
}

export async function fetchPracticeSessionById(id) {
  const res = await fetch(`${API_BASE}/practice/${id}`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch practice session');
  return await res.json();
}

export async function createPracticeSession(session) {
  const res = await fetch(`${API_BASE}/practice`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(session)
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to create practice session');
  }
  return await res.json();
}

export async function updatePracticeSession(id, session) {
  const res = await fetch(`${API_BASE}/practice/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(session)
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to update practice session');
  }
  return await res.json();
}

export async function deletePracticeSession(id) {
  const res = await fetch(`${API_BASE}/practice/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to delete practice session');
  }
  return await res.json();
}

// Gigs API
export async function fetchGigs(bandId = null) {
  let url = `${API_BASE}/gigs`;
  if (bandId) {
    url += `?bandId=${bandId}`;
  }
  const res = await fetch(url, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch gigs');
  return await res.json();
}

export async function fetchGigById(id) {
  const res = await fetch(`${API_BASE}/gigs/${id}`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch gig');
  return await res.json();
}

export async function createGig(gig) {
  const res = await fetch(`${API_BASE}/gigs`, {
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
  const res = await fetch(`${API_BASE}/gigs/${id}`, {
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
  const res = await fetch(`${API_BASE}/gigs/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to delete gig');
  }
  return await res.json();
}

// Band invitations
export async function sendBandInvitation(bandId, email, role = 'member') {
  const res = await fetch(`${API_BASE}/bands/${bandId}/invitations`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email, role })
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to send invitation');
  }
  return await res.json();
}

export async function fetchBandInvitations(bandId) {
  const res = await fetch(`${API_BASE}/bands/${bandId}/invitations`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch invitations');
  return await res.json();
}

export async function getInvitation(invitationId) {
  const res = await fetch(`${API_BASE}/bands/invitations/${invitationId}`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch invitation');
  return await res.json();
}

export async function acceptInvitation(invitationId) {
  const res = await fetch(`${API_BASE}/bands/invitations/${invitationId}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ action: 'accept' })
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to accept invitation');
  }
  return await res.json();
}

export async function rejectInvitation(invitationId) {
  const res = await fetch(`${API_BASE}/bands/invitations/${invitationId}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ action: 'reject' })
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to reject invitation');
  }
  return await res.json();
}

export async function getPendingInvitations() {
  const res = await fetch(`${API_BASE}/invitations/pending`, {
    method: 'GET',
    headers: getHeaders()
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to fetch pending invitations');
  }
  return await res.json();
}

export async function cancelInvitation(invitationId) {
  const res = await fetch(`${API_BASE}/bands/invitations/${invitationId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to cancel invitation');
  return await res.json();
}

// Band Members endpoints
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

