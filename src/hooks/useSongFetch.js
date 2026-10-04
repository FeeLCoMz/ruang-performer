import { useEffect, useState } from 'react';
import { getAuthHeader } from '../utils/auth.js';
import { cacheSong, getSong as getSongOffline } from '../utils/offlineCache.js';

export function useSongFetch(id) {
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    setSong(null);
    setLoading(true);
    setError(null);
    fetch(`/api/songs/${id}`, {
      headers: getAuthHeader(),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Gagal memuat lagu');
        return res.json();
      })
      .then((data) => {
        setSong(data);
        setLoading(false);
        cacheSong(data).catch(() => {});
      })
      .catch(async (err) => {
        try {
          const offlineSong = await getSongOffline(id);
          if (offlineSong) {
            setSong(offlineSong);
            setError('[Offline] Data dari cache');
          } else {
            setError('Gagal memuat lagu: ' + err.message);
          }
        } catch (e) {
          setError('Gagal memuat lagu: ' + err.message);
        }
        setLoading(false);
      });
  }, [id]);

  return { song, loading, error, setSong };
}
