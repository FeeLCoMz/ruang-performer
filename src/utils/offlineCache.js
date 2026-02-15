// src/utils/offlineCache.js
// IndexedDB helper for offline song/setlist cache

const DB_NAME = 'ruangperformer_offline';
const DB_VERSION = 1;
const STORE_SONGS = 'songs';
const STORE_SETLISTS = 'setlists';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SONGS)) {
        db.createObjectStore(STORE_SONGS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETLISTS)) {
        db.createObjectStore(STORE_SETLISTS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheSong(song) {
  const db = await openDB();
  const tx = db.transaction(STORE_SONGS, 'readwrite');
  tx.objectStore(STORE_SONGS).put(song);
  return tx.complete || tx.done || new Promise((res) => tx.oncomplete = res);
}

export async function getSong(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_SONGS).objectStore(STORE_SONGS).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheSetlist(setlist) {
  const db = await openDB();
  const tx = db.transaction(STORE_SETLISTS, 'readwrite');
  tx.objectStore(STORE_SETLISTS).put(setlist);
  return tx.complete || tx.done || new Promise((res) => tx.oncomplete = res);
}

export async function getSetlist(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_SETLISTS).objectStore(STORE_SETLISTS).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
