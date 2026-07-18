// src/utils/offlineCache.js
// IndexedDB helper for offline song/setlist cache

const DB_NAME = 'ruangperformer_offline';
const DB_VERSION = 1;
const STORE_SONGS = 'songs';
const STORE_SETLISTS = 'setlists';

function waitForTransaction(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }

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
  await waitForTransaction(tx);
}

export async function cacheSongs(songs = []) {
  if (!Array.isArray(songs) || songs.length === 0) {
    return;
  }

  const db = await openDB();
  const tx = db.transaction(STORE_SONGS, 'readwrite');
  const store = tx.objectStore(STORE_SONGS);

  songs.forEach((song) => {
    if (song && song.id) {
      store.put(song);
    }
  });

  await waitForTransaction(tx);
}

export async function getSong(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_SONGS).objectStore(STORE_SONGS).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllSongs() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_SONGS).objectStore(STORE_SONGS).getAll();
    req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheSetlist(setlist) {
  const db = await openDB();
  const tx = db.transaction(STORE_SETLISTS, 'readwrite');
  tx.objectStore(STORE_SETLISTS).put(setlist);
  await waitForTransaction(tx);
}

export async function cacheSetlists(setlists = []) {
  if (!Array.isArray(setlists) || setlists.length === 0) {
    return;
  }

  const db = await openDB();
  const tx = db.transaction(STORE_SETLISTS, 'readwrite');
  const store = tx.objectStore(STORE_SETLISTS);

  setlists.forEach((setlist) => {
    if (setlist && setlist.id) {
      store.put(setlist);
    }
  });

  await waitForTransaction(tx);
}

export async function getSetlist(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_SETLISTS).objectStore(STORE_SETLISTS).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllSetlists() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_SETLISTS).objectStore(STORE_SETLISTS).getAll();
    req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
    req.onerror = () => reject(req.error);
  });
}
