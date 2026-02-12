import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as apiClient from '../apiClient.js';

export default function PracticeSessionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await apiClient.fetchPracticeSessionById(id);
        setSession(data);
      } catch {
        setSession(null);
      }
      setLoading(false);
    })();
  }, [id]);

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
      </div>
    </div>
  );
}
