import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as apiClient from '../apiClient.js';
import EditIcon from '../components/EditIcon.jsx';
import DeleteIcon from '../components/DeleteIcon.jsx';
import { usePermission } from '../hooks/usePermission.js';
import { PERMISSIONS } from '../utils/permissionUtils.js';
import {
  createGigScheduleText,
  createGigCalendar,
  downloadTextFile,
  downloadCalendarFile
} from '../utils/scheduleShareUtils.js';

export default function BandDetailPage() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteError, setInviteError] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const [band, setBand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  // State for editing member
  const [editMember, setEditMember] = useState(null);
  const [editRole, setEditRole] = useState('member');
  const [editError, setEditError] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', genre: '' });
  const [setlists, setSetlists] = useState([]);
  const [gigs, setGigs] = useState([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [showAllSetlists, setShowAllSetlists] = useState(false);
  const [showAllGigs, setShowAllGigs] = useState(false);
  const [isCollapsingMembers, setIsCollapsingMembers] = useState(false);
  const [isCollapsingSetlists, setIsCollapsingSetlists] = useState(false);
  const [isCollapsingGigs, setIsCollapsingGigs] = useState(false);
  const collapseTimersRef = useRef([]);

  const userBandInfo = band ? { role: band.userRole || (band.isOwner ? 'owner' : 'member') } : { role: 'member' };
  const { can } = usePermission(id, userBandInfo);
  const canManageMembers = can('manage_members') || band?.isOwner || band?.userRole === 'admin';

  useEffect(() => {
    loadBand();
  }, [id]);

  useEffect(() => {
    return () => {
      collapseTimersRef.current.forEach((timerId) => clearTimeout(timerId));
    };
  }, []);

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
      const [setlistsData, gigsData] = await Promise.all([
        apiClient.fetchSetLists().catch(() => []),
        apiClient.fetchGigs(id).catch(() => [])
      ]);
      
      setSetlists((setlistsData || []).filter((s) => String(s.bandId) === String(id)));
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
    if (!window.confirm('Yakin ingin menghapus band ini? Semua data terkait akan hilang.')) return;
    try {
      await apiClient.deleteBand(id);
      navigate('/bands');
    } catch (err) {
      setError(err.message);
    }
  };

  const scheduleText = createGigScheduleText(
    band?.name || 'Band Anda',
    gigs,
    typeof window !== 'undefined' ? window.location.href : ''
  );

  const handleCopyScheduleText = async () => {
    if (!scheduleText) return;
    try {
      await navigator.clipboard.writeText(scheduleText);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1500);
    } catch (err) {
      console.error('Gagal menyalin teks jadwal:', err);
    }
  };

  const handleDownloadScheduleText = () => {
    downloadTextFile(`${band?.name || 'jadwal-konser'}.txt`, scheduleText);
  };

  const handleDownloadScheduleCalendar = () => {
    const calendarContent = createGigCalendar(band?.name || 'Jadwal Konser', gigs);
    downloadCalendarFile(`${band?.name || 'jadwal-konser'}.ics`, calendarContent);
  };

  const allMembers = band?.members || [];
  const previewCount = 3;
  const isMembersExpanded = showAllMembers || isCollapsingMembers;
  const isSetlistsExpanded = showAllSetlists || isCollapsingSetlists;
  const isGigsExpanded = showAllGigs || isCollapsingGigs;
  const visibleMembers = isMembersExpanded ? allMembers : allMembers.slice(0, previewCount);
  const visibleSetlists = isSetlistsExpanded ? setlists : setlists.slice(0, previewCount);
  const visibleGigs = isGigsExpanded ? gigs : gigs.slice(0, previewCount);

  const toggleSection = (expanded, setExpanded, setCollapsing) => {
    if (!expanded) {
      setCollapsing(false);
      setExpanded(true);
      return;
    }

    setCollapsing(true);
    const timerId = setTimeout(() => {
      setExpanded(false);
      setCollapsing(false);
    }, 240);
    collapseTimersRef.current.push(timerId);
  };

  const getExpandableClass = (index, expanded, collapsing) => {
    if (index < previewCount) return '';
    if (expanded) return 'band-expand-enter';
    if (collapsing) return 'band-expand-exit';
    return '';
  };

  if (loading) return <BandDetailSkeleton />;
  if (error) return <div className="page-container"><div className="error-text">{error}</div></div>;
  if (!band) return <div className="page-container"><div className="error-text">Band tidak ditemukan</div></div>;

  return (
    <div className="page-container band-detail-page">
      <div className="band-hero dashboard-card band-reveal band-reveal-1">
        <div className="band-hero-top">
          <button className="btn btn-secondary band-back-btn" onClick={() => navigate('/bands')}>
            ← Kembali
          </button>
          <div className="band-actions">
            {can(PERMISSIONS.BAND_EDIT) && (
              <button className="btn btn-primary" onClick={() => setShowEditModal(true)} title="Edit Band">
                <EditIcon size={18} /> Edit Band
              </button>
            )}
            {gigs.length > 0 && (
              <button className="btn btn-secondary" onClick={() => setShowShareModal(true)}>
                📤 Bagikan Jadwal
              </button>
            )}
            {can(PERMISSIONS.BAND_DELETE) && (
              <button className="btn danger" onClick={handleDelete} title="Hapus Band">
                <DeleteIcon size={18} /> Hapus
              </button>
            )}
          </div>
        </div>

        <h1 className="band-title">🎸 {band.name}</h1>
        {band.description && <p className="band-description">{band.description}</p>}

        <div className="band-info-bar">
          {band.genre && <div className="band-badge">🎵 {band.genre}</div>}
          <div className="band-badge">
            {band.isOwner ? '👑 Owner' : `🎸 ${band.userRole || 'Member'}`}
          </div>
          <div className="band-badge">👥 {allMembers.length} anggota</div>
          <div className="band-badge">📋 {setlists.length} setlist</div>
          <div className="band-badge">🎤 {gigs.length} jadwal</div>
        </div>
      </div>

      <div className="dashboard-card band-section-card band-reveal band-reveal-2">
        <div className="card-header">
          <h2 className="card-title">👥 Anggota Band ({allMembers.length})</h2>
          <div className="band-section-actions">
            {allMembers.length > previewCount && (
              <button
                className="btn btn-secondary"
                onClick={() => toggleSection(showAllMembers, setShowAllMembers, setIsCollapsingMembers)}
                type="button"
              >
                {showAllMembers ? 'Ringkas Anggota' : 'Lihat Semua Anggota'}
              </button>
            )}
          {canManageMembers && (
            <button className="btn" onClick={() => setShowInviteModal(true)}>
              + Tambah Anggota
            </button>
          )}
          </div>
        </div>
        {allMembers.length === 0 ? (
          <div className="empty-state">Belum ada anggota band</div>
        ) : (
          <div className="grid-gap">
            {visibleMembers.map((member, index) => (
              <div
                key={member.id || member.userId}
                className={`member-item ${getExpandableClass(index, showAllMembers, isCollapsingMembers)}`}
              >
                <div>
                  <div className="member-name">{member.username}</div>
                  <div className="member-role">
                    {member.isOwner ? '👑 Owner' : member.role === 'admin' ? '🛡️ Admin' : '🎸 Member'}
                    {member.joinedAt && (
                      <> • Bergabung {new Date(member.joinedAt).toLocaleDateString('id-ID')}</>
                    )}
                  </div>
                </div>
                {canManageMembers && !member.isOwner && (
                  <div className="band-row-actions">
                    <button
                      className="btn"
                      title="Edit Member Role"
                      onClick={() => {
                        setEditMember(member);
                        setEditRole(member.role || 'member');
                        setEditError(null);
                      }}
                    >
                      <EditIcon size={16} />
                    </button>
                    <button
                      className="btn danger"
                      title="Hapus Member"
                      onClick={async () => {
                        if (window.confirm(`Yakin ingin menghapus ${member.username} dari band?`)) {
                          try {
                            await apiClient.removeBandMember(id, member.userId || member.id);
                            await loadBand();
                          } catch (err) {
                            alert(err.message || 'Gagal menghapus member');
                          }
                        }
                      }}
                    >
                      <DeleteIcon size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-card band-section-card band-reveal band-reveal-3">
        <h2 className="card-title">📋 Setlist Band ({setlists.length})</h2>
        {setlists.length === 0 ? (
          <div className="empty-state">Belum ada setlist untuk band ini</div>
        ) : (
          <div className="grid-gap">
            {visibleSetlists.map((setlist, index) => (
              <div
                key={setlist.id}
                className={`band-linked-item hover-lift ${getExpandableClass(index, showAllSetlists, isCollapsingSetlists)}`}
                onClick={() => navigate(`/setlists/${setlist.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/setlists/${setlist.id}`);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Buka setlist ${setlist.name}`}
              >
                <div className="band-linked-item-title">{setlist.name}</div>
                {setlist.description && (
                  <div className="band-linked-item-subtitle">
                    {setlist.description}
                  </div>
                )}
                <div className="band-linked-item-subtitle">
                  🎵 {setlist.songs?.length || 0} lagu
                </div>
              </div>
            ))}
            {setlists.length > previewCount && (
              <button
                className="btn btn-secondary"
                onClick={() => toggleSection(showAllSetlists, setShowAllSetlists, setIsCollapsingSetlists)}
              >
                {showAllSetlists ? 'Ringkas Setlist' : 'Lihat Semua Setlist Band'}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="dashboard-card band-section-card band-reveal band-reveal-4">
        <h2 className="card-title">🎤 Jadwal Konser ({gigs.length})</h2>
        {gigs.length === 0 ? (
          <div className="empty-state">Belum ada jadwal konser</div>
        ) : (
          <div className="grid-gap">
            {visibleGigs.map((gig, index) => (
              <div
                key={gig.id}
                className={`band-linked-item ${getExpandableClass(index, showAllGigs, isCollapsingGigs)}`}
              >
                <div className="band-linked-item-title">
                  🎤 {new Date(gig.date).toLocaleDateString('id-ID')}
                </div>
                {(gig.venue || gig.city) && (
                  <div className="band-linked-item-subtitle">
                    📍 {gig.venue}{gig.venue && gig.city ? ', ' : ''}{gig.city}
                  </div>
                )}
                {gig.fee && (
                  <div className="band-linked-item-subtitle">
                    💰 {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(gig.fee)}
                  </div>
                )}
                {gig.setlistName && (
                  <div className="band-linked-item-subtitle">
                    🎵 Setlist: {gig.setlistName}
                  </div>
                )}
              </div>
            ))}
            {gigs.length > previewCount && (
              <button
                className="btn btn-secondary"
                onClick={() => toggleSection(showAllGigs, setShowAllGigs, setIsCollapsingGigs)}
              >
                {showAllGigs ? 'Ringkas Jadwal' : 'Lihat Semua Jadwal Konser'}
              </button>
            )}
          </div>
        )}
      </div>

      {editMember && (
        <div className="modal-overlay" onClick={() => setEditMember(null)}>
          <div className="modal-card band-modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Peran Anggota</h2>
            <div className="band-modal-caption">
              <b>{editMember.username}</b> ({editMember.email})
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setEditLoading(true);
                setEditError(null);
                try {
                  await apiClient.updateMemberRole(id, editMember.userId || editMember.id, editRole);
                  setEditMember(null);
                  await loadBand();
                } catch (err) {
                  setEditError(err.message);
                } finally {
                  setEditLoading(false);
                }
              }}
            >
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="modal-input"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              {editError && <div className="error-message form-error">{editError}</div>}
              <div className="band-modal-actions">
                <button type="submit" className="btn" disabled={editLoading}>
                  {editLoading ? 'Menyimpan...' : 'Simpan'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditMember(null)}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-card band-modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Tambah Anggota Band</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setInviteLoading(true);
                setInviteError(null);
                try {
                  await apiClient.addBandMember(id, inviteEmail, inviteRole);
                  setInviteEmail('');
                  setInviteRole('member');
                  setShowInviteModal(false);
                  await loadBand();
                } catch (err) {
                  setInviteError(err.message);
                } finally {
                  setInviteLoading(false);
                }
              }}
            >
              <input
                type="email"
                placeholder="Email anggota"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="modal-input"
                autoFocus
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="modal-input"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              {inviteError && <div className="error-message form-error">{inviteError}</div>}
              <div className="band-modal-actions">
                <button type="submit" className="btn" disabled={inviteLoading}>
                  {inviteLoading ? 'Menambah...' : 'Tambah'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowInviteModal(false)}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn btn-secondary"
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Bagikan Jadwal Konser</h2>
            <p className="band-share-caption">
              Salin teks jadwal atau unduh file kalender untuk dibagikan ke anggota band dan penggemar.
            </p>
            <textarea
              readOnly
              value={scheduleText}
              className="band-share-textarea"
            />
            <div className="band-modal-actions band-modal-actions-wrap">
              <button className="btn" onClick={handleCopyScheduleText}>
                {shareCopied ? '✅ Tersalin!' : 'Salin Teks'}
              </button>
              <button className="btn" onClick={handleDownloadScheduleText}>
                Unduh Teks
              </button>
              <button className="btn btn-primary" onClick={handleDownloadScheduleCalendar}>
                Unduh Kalender (.ics)
              </button>
              <button className="btn btn-secondary" onClick={() => setShowShareModal(false)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BandDetailSkeleton() {
  return (
    <div className="page-container band-detail-page">
      <div className="dashboard-card band-hero band-skeleton-card">
        <div className="loading-skeleton loading-skeleton-medium" />
        <div className="loading-skeleton loading-skeleton-full" />
        <div className="band-skeleton-badges">
          <span className="loading-skeleton loading-skeleton-pill" />
          <span className="loading-skeleton loading-skeleton-pill" />
          <span className="loading-skeleton loading-skeleton-pill" />
        </div>
      </div>

      <div className="dashboard-card band-skeleton-card">
        <div className="loading-skeleton loading-skeleton-medium" />
        <div className="band-skeleton-list">
          <div className="loading-skeleton loading-skeleton-block" />
          <div className="loading-skeleton loading-skeleton-block" />
          <div className="loading-skeleton loading-skeleton-block" />
        </div>
      </div>

      <div className="dashboard-card band-skeleton-card">
        <div className="loading-skeleton loading-skeleton-medium" />
        <div className="band-skeleton-list">
          <div className="loading-skeleton loading-skeleton-block" />
          <div className="loading-skeleton loading-skeleton-block" />
          <div className="loading-skeleton loading-skeleton-block" />
        </div>
      </div>

      <div className="dashboard-card band-skeleton-card">
        <div className="loading-skeleton loading-skeleton-medium" />
        <div className="band-skeleton-list">
          <div className="loading-skeleton loading-skeleton-block" />
          <div className="loading-skeleton loading-skeleton-block" />
          <div className="loading-skeleton loading-skeleton-block" />
        </div>
      </div>
    </div>
  );
}
