import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as apiClient from '../apiClient.js';
import GigPoster from '../components/GigPoster.jsx';
import { toPng } from 'html-to-image';
import { usePermission } from '../hooks/usePermission.js';

export default function GigDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [gig, setGig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [posterError, setPosterError] = useState('');
  const posterRef = useRef(null);
  // Permission logic
  const bandId = gig?.bandId || null;
  const userBandInfo = gig?.userBandInfo || null; // Pastikan gig API mengembalikan userBandInfo
  const { can } = usePermission(bandId, userBandInfo);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await apiClient.fetchGigById(id);
        setGig(data);
      } catch {
        setGig(null);
      }
      setLoading(false);
    })();
  }, [id]);

  const handleDownloadPoster = () => {
    if (!posterRef.current || !gig) return;
    setIsGeneratingPoster(true);
    setPosterError('');
    const safeName = (gig.bandName || 'gig').replace(/[\\/:*?"<>|]+/g, '').trim();
    toPng(posterRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#0f172a'
    })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `${safeName || 'gig'}-poster.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch(() => {
        setPosterError('Gagal membuat poster. Coba lagi.');
      })
      .finally(() => {
        setIsGeneratingPoster(false);
      });
  };

  if (loading) return <div className="page-container"><span className="loading-skeleton" style={{width:120,height:32}} /></div>;
  if (!gig) return <div className="page-container"><h2>Gig tidak ditemukan</h2></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🎤 Gig: {gig.bandName || 'Gig'}</h1>
        <button className="btn" onClick={() => navigate(-1)}>← Kembali</button>
        {/* Permission check: hanya tampil jika user boleh edit gig */}
        {can && can('gig:edit') && (
          <button
            className="btn btn-primary"
            style={{ marginLeft: 8 }}
            onClick={() => navigate(`/gigs/edit/${gig.id}`)}
          >
            ✏️ Edit Gig
          </button>
        )}
        {/* Jika logic userBandInfo tidak jelas, pastikan gig API mengembalikan userBandInfo sesuai bandId */}
        {/* Referensi permission: gig:edit, lihat permissionUtils.js */}
      </div>
      <div className="card">
        <p><b>Tanggal:</b> {new Date(gig.date).toLocaleString('id-ID')}</p>
        <p><b>Venue:</b> {gig.venue || '-'}</p>
        <p><b>Catatan:</b> {gig.notes || '-'}</p>
      </div>
      <div style={{ margin: '32px 0 0 0' }}>
        <h3 style={{ marginBottom: 12 }}>🎫 Poster Gig</h3>
        <GigPoster gig={gig} ref={posterRef} />
        {posterError && <div className="error-text setlist-poster-error">{posterError}</div>}
        <button
          className="btn-base tab-btn poster-download-btn"
          style={{ marginTop: 16 }}
          onClick={handleDownloadPoster}
          disabled={isGeneratingPoster}
        >
          {isGeneratingPoster ? 'Membuat Poster...' : 'Unduh Poster'}
        </button>
      </div>
    </div>
  );
}
