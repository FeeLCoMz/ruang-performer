import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as apiClient from '../apiClient.js';

export default function GigDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [gig, setGig] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="page-container"><span className="loading-skeleton" style={{width:120,height:32}} /></div>;
  if (!gig) return <div className="page-container"><h2>Gig tidak ditemukan</h2></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🎤 Gig: {gig.bandName || 'Gig'}</h1>
        <button className="btn" onClick={() => navigate(-1)}>← Kembali</button>
      </div>
      <div className="card">
        <p><b>Tanggal:</b> {new Date(gig.date).toLocaleString('id-ID')}{gig.time ? `, Jam: ${gig.time.slice(0,5)}` : ''}</p>
        <p><b>Venue:</b> {gig.venue || '-'}</p>
        <p><b>Catatan:</b> {gig.notes || '-'}</p>
      </div>
    </div>
  );
}
