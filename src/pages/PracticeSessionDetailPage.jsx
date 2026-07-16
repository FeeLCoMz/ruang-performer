import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as apiClient from '../apiClient.js';

export default function PracticeSessionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [sessionData, songsData] = await Promise.all([
          apiClient.fetchPracticeSessionById(id),
          apiClient.fetchSongs()
        ]);
        setSession(sessionData);
        setSongs(Array.isArray(songsData) ? songsData : []);
      } catch {
        setSession(null);
        setSongs([]);
      }
      setLoading(false);
    })();
  }, [id]);

  const getSongLabelById = (songId) => {
    const song = songs.find((item) => String(item.id) === String(songId));
    if (!song) return 'Lagu tidak ditemukan';
    return song.artist ? `${song.title} - ${song.artist}` : song.title;
  };

  const songExists = (songId) => songs.some((item) => String(item.id) === String(songId));

  const getSongMeta = (songId) => {
    const source = session?.songMeta && typeof session.songMeta === 'object' ? session.songMeta : {};
    const item = source[String(songId)] || {};
    const parsedRating = Number.parseInt(item.rating, 10);
    return {
      practiced: item.practiced === true,
      rating: Number.isInteger(parsedRating) ? parsedRating : null,
    };
  };

  if (loading) return <div className="page-container"><span className="loading-skeleton" style={{width:120,height:32}} /></div>;
  if (!session) return <div className="page-container"><h2>Practice session tidak ditemukan</h2></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>💪 Latihan Band: {session.bandName || 'Session'}</h1>
        <button className="btn" onClick={() => navigate(-1)}>← Kembali</button>
      </div>
      <div className="card">
        <p><b>Tanggal:</b> {new Date(session.date).toLocaleString('id-ID')}</p>
        <p><b>Lokasi:</b> {session.location || '-'}</p>
        <p><b>Catatan:</b> {session.notes || '-'}</p>

        <div style={{ marginTop: '16px' }}>
          <p><b>Lagu yang Dilatih:</b></p>
          {!Array.isArray(session.songs) || session.songs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Belum ada lagu dipilih</p>
          ) : (
            <ol style={{ margin: 0, paddingLeft: '20px' }}>
              {session.songs.map((songId) => (
                <li key={songId} style={{ marginBottom: '4px' }}>
                  {songExists(songId) ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/songs/view/${songId}`)}
                      className="btn"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--primary-accent)',
                        padding: 0,
                        textDecoration: 'underline',
                        cursor: 'pointer'
                      }}
                    >
                      {getSongLabelById(songId)}
                    </button>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>{getSongLabelById(songId)}</span>
                  )}
                  <span style={{ marginLeft: '8px', color: 'var(--text-muted)', fontSize: '0.85em' }}>
                    {getSongMeta(songId).practiced ? '✅' : '⏳'}
                    {Number.isInteger(getSongMeta(songId).rating) ? ` • ⭐ ${getSongMeta(songId).rating}` : ''}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
