import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as apiClient from '../apiClient.js';
import EditIcon from '../components/EditIcon.jsx';
import DeleteIcon from '../components/DeleteIcon.jsx';
import { usePermission } from '../hooks/usePermission.js';
import { PERMISSIONS, canPerformAction } from '../utils/permissionUtils.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function BandDetailPage() {
  const { user } = useAuth();
  const currentUserId = user?.userId || user?.id;
  const { id } = useParams();
  const navigate = useNavigate();
  const [band, setBand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', genre: '' });
  const [setlists, setSetlists] = useState([]);
  const [practiceSessions, setPracticeSessions] = useState([]);
  const [gigs, setGigs] = useState([]);

  // --- Permission hooks (top-level, not inside JSX) ---
  // Default userBandInfo, will be updated after band loaded
  const userBandInfo = band ? { role: band.userRole || (band.isOwner ? 'owner' : 'member') } : { role: 'member' };
  const { can } = usePermission(id, userBandInfo);

  useEffect(() => {
    loadBand();
  }, [id]);

  const loadBand = async () => {
    try {
      setLoading(true);
      const data = await apiClient.fetchBandById(id);
      setBand(data);
      setFormData({
        name: data.name,
        description: data.description || '',
        genre: data.genre || ''
      });
      
      // Load related data
      const [setlistsData, sessionsData, gigsData] = await Promise.all([
        apiClient.fetchSetLists().catch(() => []),
        apiClient.fetchPracticeSessions(id).catch(() => []),
        apiClient.fetchGigs(id).catch(() => [])
      ]);
      
      setSetlists((setlistsData || []).filter(s => s.bandId === id));
      setPracticeSessions(sessionsData || []);
      setGigs(gigsData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.updateBand(id, formData);
      await loadBand();
      setShowEditModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Yakin ingin menghapus band ini? Semua data terkait akan hilang.')) return;
    try {
      await apiClient.deleteBand(id);
      navigate('/bands');
    } catch (err) {
      setError(err.message);
      setInviting(false);
    }
  };

  if (loading) return <div className="page-container"><div className="loading-container">Memuat data band...</div></div>;
  if (error) return <div className="page-container"><div className="error-text">{error}</div></div>;
  if (!band) return <div className="page-container"><div className="error-text">Band tidak ditemukan</div></div>;

  return (
    <div className="page-container">
      <div className="band-header">
        <button className="btn-base" onClick={() => navigate('/bands')} style={{ padding: '8px 16px', fontSize: '0.9em' }}>
          ← Kembali
        </button>
        <div className="band-header-info">
          <h1 className="band-title">🎸 {band.name}</h1>
          {band.description && (
            <p className="band-description">{band.description}</p>
          )}
        </div>
        {/* --- Permission logic: allow edit/delete/manage roles --- */}
        <div className="band-actions">
          {can(PERMISSIONS.BAND_EDIT) && (
            <button className="btn btn-primary" onClick={() => setShowEditModal(true)} title="Edit Band">
              <EditIcon size={18} /> Edit Band
            </button>
          )}
          {can(PERMISSIONS.BAND_DELETE) && (
            <button className="btn-base danger" onClick={handleDelete} title="Hapus Band" style={{marginLeft: '12px'}}>
              <DeleteIcon size={18} /> Hapus Band
            </button>
          )}
        </div>
      </div>

      {/* Info Bar */}
      <div className="band-info-bar">
        {band.genre && <div className="band-badge">🎵 {band.genre}</div>}
        <div className="band-badge">
          {band.isOwner ? '👑 Owner' : `🎸 ${band.userRole || 'Member'}`}
        </div>
      </div>

      {/* Members Section */}
      <div className="dashboard-card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h2 className="card-title">👥 Anggota Band ({band.members?.length || 0})</h2>
          {can(PERMISSIONS.MEMBER_INVITE) && (
            <button 
              className="btn-base"
              onClick={() => setShowInviteModal(true)}
              style={{ fontSize: '0.9em', padding: '8px 14px' }}
            >
              + Undang Member
            </button>
          )}
        </div>
        {!band.members || band.members.length === 0 ? (
          <div className="empty-state">
            Belum ada anggota band
          </div>
        ) : (
          <div className="grid-gap">
            {band.members.map(member => (
              <div
                key={member.id}
                className="member-item"
              >
                <div>
                  <div className="member-name">{member.username}</div>
                  <div className="member-role">
                    {member.isOwner ? '👑 Owner' : member.role === 'admin' ? '🛡️ Admin' : '🎸 Member'} • Bergabung {new Date(member.joinedAt).toLocaleDateString('id-ID')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h2>Undang Member</h2>
            <form onSubmit={handleSendInvite}>
              <input
                type="email"
                placeholder="Email user"
                value={inviteData.email}
                onChange={e => setInviteData({ ...inviteData, email: e.target.value })}
                required
                className="modal-input"
              />
              <select
                value={inviteData.role}
                onChange={e => setInviteData({ ...inviteData, role: e.target.value })}
                className="modal-input"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <div className="form-actions">
                <button type="submit" disabled={inviting} className="btn-base">
                  {inviting ? 'Mengirim...' : 'Kirim Undangan'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowInviteModal(false)}
                  className="btn-cancel"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Band</h2>
            <form onSubmit={handleUpdate} className="form-section">
              <input
                type="text"
                placeholder="Nama Band *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="modal-input"
              />
              <textarea
                placeholder="Deskripsi (opsional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="modal-input"
                rows="3"
              />
              <input
                type="text"
                placeholder="Genre (opsional)"
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                className="modal-input"
              />
              <div className="form-actions" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-cancel"
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Setlist Band */}
      <div className="dashboard-card" style={{ marginBottom: '24px' }}>
        <h2 className="card-title">📋 Setlist Band ({setlists.length})</h2>
        {setlists.length === 0 ? (
          <div className="empty-state">
            Belum ada setlist untuk band ini
          </div>
        ) : (
          <div className="grid-gap">
            {setlists.map(setlist => (
              <div
                key={setlist.id}
                style={{
                  backgroundColor: 'var(--primary-bg)',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: '1px solid var(--border)',
                  transition: 'all 0.2s'
                }}
                className="hover-lift"
                onClick={() => navigate(`/setlists/${setlist.id}`)}
              >
                <div style={{ fontWeight: '500' }}>{setlist.name}</div>
                {setlist.description && (
                  <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {setlist.description}
                  </div>
                )}
                <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '4px' }}>
                  🎵 {setlist.songs?.length || 0} lagu
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Practice Sessions */}
      <div className="dashboard-card" style={{ marginBottom: '24px' }}>
        <h2 className="card-title">🎯 Sesi Latihan ({practiceSessions.length})</h2>
        {practiceSessions.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Belum ada sesi latihan
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {practiceSessions.slice(0, 5).map(session => (
              <div
                key={session.id}
                style={{
                  backgroundColor: 'var(--primary-bg)',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)'
                }}
              >
                <div style={{ fontWeight: '500' }}>
                  📅 {new Date(session.date).toLocaleDateString('id-ID')}
                </div>
                {session.duration && (
                  <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '4px' }}>
                    ⏱️ {Math.floor(session.duration / 60)}h {session.duration % 60}m
                  </div>
                )}
                {session.songs?.length > 0 && (
                  <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '4px' }}>
                    🎵 {session.songs.length} lagu dilatih
                  </div>
                )}
              </div>
            ))}
            {practiceSessions.length > 5 && (
              <div style={{ marginTop: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9em' }}>
                +{practiceSessions.length - 5} sesi lainnya
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upcoming Gigs */}
      <div className="dashboard-card" style={{ marginBottom: '24px' }}>
        <h2 className="card-title">🎤 Jadwal Konser ({gigs.length})</h2>
        {gigs.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Belum ada jadwal konser
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {gigs.map(gig => (
              <div
                key={gig.id}
                style={{
                  backgroundColor: 'var(--primary-bg)',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)'
                }}
              >
                <div style={{ fontWeight: '500' }}>
                  🎤 {new Date(gig.date).toLocaleDateString('id-ID')}
                </div>
                {(gig.venue || gig.city) && (
                  <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '4px' }}>
                    📍 {gig.venue}{gig.venue && gig.city ? ', ' : ''}{gig.city}
                  </div>
                )}
                {gig.fee && (
                  <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '4px' }}>
                    💰 {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(gig.fee)}
                  </div>
                )}
                {gig.setlistName && (
                  <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '4px' }}>
                    🎵 Setlist: {gig.setlistName}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Band</h3>
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                placeholder="Nama Band *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="search-input"
              />
              <textarea
                placeholder="Deskripsi (opsional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="search-input"
                rows="3"
              />
              <input
                type="text"
                placeholder="Genre (opsional)"
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                className="search-input"
              />
              <div className="form-actions" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-cancel"
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
