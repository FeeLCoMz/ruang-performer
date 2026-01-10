// Simple API client for Turso backend
const API_BASE = '/api';

export async function fetchSongs() {
  const res = await fetch(`${API_BASE}/songs`);
  if (!res.ok) throw new Error('Failed to fetch songs');
  return await res.json();
}

export async function addSong(song) {
  const res = await fetch(`${API_BASE}/songs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(song)
  });
  if (!res.ok) throw new Error('Failed to add song');
  return await res.json();
}

export async function fetchSetLists() {
  const res = await fetch(`${API_BASE}/setlists`);
  if (!res.ok) throw new Error('Failed to fetch setlists');
  return await res.json();
}

export async function addSetList(setList) {
  const res = await fetch(`${API_BASE}/setlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(setList)
  });
  if (!res.ok) throw new Error('Failed to add setlist');
  return await res.json();
}

export async function deleteSetList(id) {
  const res = await fetch(`${API_BASE}/setlists/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete setlist');
  return await res.json();
}

export async function updateSetList(setList) {
  const res = await fetch(`${API_BASE}/setlists/${setList.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(setList)
  });
  if (!res.ok) throw new Error('Failed to update setlist');
  return await res.json();
}

export async function askAI({ prompt, context, system, model } = {}) {
  const res = await fetch(`${API_BASE}/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, context, system, model })
  });
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch {}
    throw new Error(err?.error || 'Failed to call AI');
  }
  return await res.json();
}
