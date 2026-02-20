import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as apiClient from '../apiClient.js';
import { Link } from 'react-router-dom';
import EflyerPoster from '../components/EflyerPoster.jsx';
import { toPng } from 'html-to-image';
import { usePermission } from '../hooks/usePermission.js';

export default function GigDetailPage() {
  const [setlist, setSetlist] = useState(null);
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
        if (data?.setlistId) {
          // Fetch setlist detail jika ada
          const setlists = await apiClient.fetchSetLists();
          const found = Array.isArray(setlists) ? setlists.find(s => s.id === data.setlistId) : null;
          setSetlist(found || null);
        } else {
          setSetlist(null);
        }
      } catch {
        setGig(null);
        setSetlist(null);
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
        {can && can('gig:edit') && (
          <button
            className="btn btn-primary"
            style={{ marginLeft: 8 }}
            onClick={() => navigate(`/gigs/edit/${gig.id}`)}
          >
            ✏️ Edit Gig
          </button>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0 8px 0' }}>
        <button
          className="btn btn-primary"
          onClick={handleDownloadPoster}
          disabled={isGeneratingPoster}
        >
          {isGeneratingPoster ? 'Mengunduh...' : 'Download E-Flyer'}
        </button>
        {posterError && (
          <span style={{ color: 'var(--danger, #ef4444)', marginLeft: 8, fontWeight: 500 }}>{posterError}</span>
        )}
      </div>
      <EflyerPoster gig={gig} setlist={setlist} posterRef={posterRef} />
    </div>
  );
}
