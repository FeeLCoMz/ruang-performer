import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { trackEvent, trackPageView } from "../utils/analyticsUtil.js";
import * as apiClient from "../apiClient.js";
import { generateAuditReport } from "../utils/auditLogger.js";
import * as authUtils from '../utils/auth.js';

export default function ProfilePage() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const { user, logout, login, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [activityStats, setActivityStats] = useState(null);
  const [activityLoading, setActivityLoading] = useState(true);
    const [showEdit, setShowEdit] = useState(false);
    const [editModalKey, setEditModalKey] = useState(0); // for force remount
  const [showPassword, setShowPassword] = useState(false);

  React.useEffect(() => {
    trackPageView("/profile", "Profil Akun");
  }, []);

  // Selalu ambil profil user terbaru dari API jika user berubah
  React.useEffect(() => {
    async function fetchProfile() {
      if (!user) {
        setProfile(null);
        return;
      }
      try {
        const res = await apiClient.getCurrentUser();
        // Pastikan role tidak hilang jika API tidak mengembalikan role
        const merged = res.user ? { ...res.user, role: res.user.role || user.role } : user;
        setProfile(merged);
      } catch {
        setProfile(user); // fallback ke context jika gagal
      }
    }
    fetchProfile();
  }, [user]);

  React.useEffect(() => {
    async function fetchAuditLogs() {
      setAuditLoading(true);
      setAuditError("");
      try {
        const logs = await apiClient.getUserAuditLogs();
        setAuditLogs(logs);
      } catch (e) {
        setAuditError(e.message || "Gagal mengambil audit log");
      } finally {
        setAuditLoading(false);
      }
    }
    if (profile && profile.id) fetchAuditLogs();
  }, [profile]);

  React.useEffect(() => {
    async function fetchActivity() {
      setActivityLoading(true);
      try {
        // Ambil audit log user dari API (mock: gunakan AuditLogPage logic)
        const logs = [];
        // TODO: Ganti dengan API call ke audit log user jika tersedia
        // Sementara, gunakan event login, profile update, password change
        if (profile) {
          logs.push({
            id: 1,
            action: "USER_LOGIN",
            category: "USER",
            severity: "low",
            userId: profile.id,
            status: "success",
            createdAt: profile.createdAt || new Date().toISOString(),
          });
          logs.push({
            id: 2,
            action: "PROFILE_UPDATE",
            category: "USER",
            severity: "medium",
            userId: profile.id,
            status: "success",
            createdAt: profile.updatedAt || new Date().toISOString(),
          });
        }
        setActivityStats(generateAuditReport(logs));
      } catch (e) {
        setActivityStats(null);
      } finally {
        setActivityLoading(false);
      }
    }
    fetchActivity();
  }, [profile]);

  if (authLoading || profile === null) {
    return (
      <div className="page-container">
        <div className="card profile-loading-card">
          <div className="spinner" aria-label="Memuat profil..." />
        </div>
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="page-container">
        <div className="card">
          <h2>Profil</h2>
          <p>Anda belum login.</p>
        </div>
      </div>
    );
  }

  // Handler for logout
  const handleLogout = () => {
    trackEvent("logout", { email: user.email });
    logout();
  };

  // Handler for delete account
  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError("");
    try {
      await apiClient.deleteAccount();
      trackEvent("account_delete", { email: profile.email });
      logout();
    } catch (err) {
      setDeleteError(err.message || "Gagal menghapus akun");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Modal konfirmasi hapus akun
  const DeleteAccountModal = () => (
    <div className="modal-overlay" onClick={() => setShowDelete(false)}>
      <div className="modal danger-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Konfirmasi Hapus Akun</h2>
        <p className="profile-delete-warning">
          Apakah Anda yakin ingin menghapus akun? Semua data Anda akan hilang dan tidak bisa
          dikembalikan.
        </p>
        {deleteError && <div className="error-text">{deleteError}</div>}
        <div className="profile-modal-actions">
          <button
            className="btn btn-danger"
            type="button"
            onClick={handleDeleteAccount}
            disabled={deleteLoading}
          >
            {deleteLoading ? "Menghapus..." : "Hapus Akun"}
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => setShowDelete(false)}
            disabled={deleteLoading}
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );

  // Edit Profile Modal
  const EditProfileModal = () => {
    const [form, setForm] = useState({
      displayName: profile.displayName || "",
      bio: profile.bio || "",
      instrument: profile.instrument || "",
      experience: profile.experience || "",
      location: profile.location || "",
      genres: Array.isArray(profile.genres) ? profile.genres.join(", ") : profile.genres || "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleChange = (e) => {
      setForm({ ...form, [e.target.name]: e.target.value });
      setError("");
      setSuccess("");
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      setError("");
      setSuccess("");
        try {
          // Kirim genres sebagai array jika diisi string
          const submitData = {
            ...form,
            genres: typeof form.genres === 'string' ? form.genres.split(',').map(g => g.trim()).filter(Boolean) : form.genres
          };
          await apiClient.updateProfile(submitData);
          // Ambil ulang profil terbaru
          const res = await apiClient.getCurrentUser();
          const merged = res.user ? { ...res.user, role: res.user.role || profile.role } : profile;
          setProfile(merged);
          if (res.user) login(authUtils.getToken(), merged);
          trackEvent("profile_update", { email: profile.email });
          setShowEdit(false); // close modal immediately
          setEditModalKey(k => k+1); // force remount for clean state
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="modal-overlay" onClick={() => { setShowEdit(false); setEditModalKey(k => k+1); }}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h2>Edit Profil</h2>
          <form onSubmit={handleSubmit} className="modal-form">
            <label>
              Nama Tampilan
              <input
                className="modal-input"
                name="displayName"
                value={form.displayName}
                onChange={handleChange}
              />
            </label>
            <label>
              Bio
              <textarea
                className="modal-input"
                name="bio"
                value={form.bio}
                onChange={handleChange}
              />
            </label>
            <label>
              Instrumen
              <input
                className="modal-input"
                name="instrument"
                value={form.instrument}
                onChange={handleChange}
              />
            </label>
            <label>
              Pengalaman
              <input
                className="modal-input"
                name="experience"
                value={form.experience}
                onChange={handleChange}
              />
            </label>
            <label>
              Lokasi
              <input
                className="modal-input"
                name="location"
                value={form.location}
                onChange={handleChange}
              />
            </label>
            <label>
              Preferensi Genre
              <input
                className="modal-input"
                name="genres"
                value={form.genres}
                onChange={handleChange}
                placeholder="Contoh: pop, rock, jazz"
              />
            </label>
            {error && <div className="error-text">{error}</div>}
            {success && <div className="success-text">{success}</div>}
            <div className="profile-modal-actions">
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan"}
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => setShowEdit(false)}
                disabled={loading}
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Change Password Modal
  const ChangePasswordModal = () => {
    const [form, setForm] = useState({ oldPassword: "", newPassword: "", confirm: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleChange = (e) => {
      setForm({ ...form, [e.target.name]: e.target.value });
      setError("");
      setSuccess("");
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      setError("");
      setSuccess("");
      if (form.newPassword.length < 8) {
        setError("Password minimal 8 karakter");
        return;
      }
      if (form.newPassword !== form.confirm) {
        setError("Konfirmasi password tidak cocok");
        return;
      }
      setLoading(true);
      try {
        await apiClient.changePassword(form.oldPassword, form.newPassword);
        setSuccess("Password berhasil diubah");
        trackEvent("password_change", { email: user.email });
        setTimeout(() => setShowPassword(false), 1200);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="modal-overlay" onClick={() => setShowPassword(false)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h2>Ubah Password</h2>
          <form onSubmit={handleSubmit} className="modal-form">
            <label>
              Password Lama
              <input
                className="modal-input"
                name="oldPassword"
                type="password"
                value={form.oldPassword}
                onChange={handleChange}
                autoComplete="current-password"
              />
            </label>
            <label>
              Password Baru
              <input
                className="modal-input"
                name="newPassword"
                type="password"
                value={form.newPassword}
                onChange={handleChange}
                autoComplete="new-password"
              />
            </label>
            <label>
              Konfirmasi Password Baru
              <input
                className="modal-input"
                name="confirm"
                type="password"
                value={form.confirm}
                onChange={handleChange}
                autoComplete="new-password"
              />
            </label>
            {error && <div className="error-text">{error}</div>}
            {success && <div className="success-text">{success}</div>}
            <div className="profile-modal-actions">
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan"}
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => setShowPassword(false)}
                disabled={loading}
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Profil Akun</h1>
      </div>
      <div className="card profile-card">
        <div className="profile-main-row">
          <div className="profile-avatar">
            {profile.profilePicture ? (
              <img
                src={profile.profilePicture}
                alt={profile.displayName || "Avatar"}
                className="avatar-circle profile-avatar-image"
              />
            ) : (
              <div className="avatar-circle profile-avatar-fallback">
                {profile.displayName ? profile.displayName[0].toUpperCase() : "?"}
              </div>
            )}
          </div>
          <div className="profile-info">
            <div className="profile-row">
              <span className="text-secondary">Nama Tampilan:</span>
              <span className="text-primary profile-value">{profile.displayName || "-"}</span>
            </div>
            <div className="profile-row">
              <span className="text-secondary">Email:</span>
              <span className="text-primary profile-value">{profile.email || "-"}</span>
            </div>
            <div className="profile-row">
              <span className="text-secondary">Bio:</span>
              <span className="text-primary profile-value">{profile.bio || "-"}</span>
            </div>
            <div className="profile-row">
              <span className="text-secondary">Instrumen:</span>
              <span className="text-primary profile-value">{profile.instrument || "-"}</span>
            </div>
            <div className="profile-row">
              <span className="text-secondary">Pengalaman:</span>
              <span className="text-primary profile-value">{profile.experience || "-"}</span>
            </div>
            <div className="profile-row">
              <span className="text-secondary">Lokasi:</span>
              <span className="text-primary profile-value">{profile.location || "-"}</span>
            </div>
            <div className="profile-row">
              <span className="text-secondary">Preferensi Genre:</span>
              <span className="text-primary profile-value">
                {Array.isArray(profile.genres) ? profile.genres.join(", ") : profile.genres || "-"}
              </span>
            </div>
            {Array.isArray(profile.bands) && profile.bands.length > 0 && (
              <div className="profile-row profile-bands-row">
                <span className="text-secondary">Daftar Band:</span>
                <ul className="profile-bands-list">
                  {profile.bands.map((band) => (
                    <li key={band.id}>
                      <span className="profile-band-name">{band.name}</span>
                      {band.genre && (
                        <span className="profile-band-genre">({band.genre})</span>
                      )}
                      {band.role && (
                        <span className="profile-band-role">- {band.role}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        {/* Tombol aksi diatur grid 2 kolom di desktop, 1 kolom di mobile */}
        <div className="profile-actions">
          <button className="btn btn-primary" type="button" onClick={() => { setEditModalKey(k => k+1); setShowEdit(true); }}>
            <span role="img" aria-label="Edit" className="profile-action-icon">✏️</span> Edit Profil
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => setShowPassword(true)}>
            <span role="img" aria-label="Password" className="profile-action-icon">🔒</span> Ubah Password
          </button>
          <button className="btn" type="button" onClick={handleLogout}>
            <span role="img" aria-label="Logout" className="profile-action-icon">🚪</span> Logout
          </button>
          <button
            className="btn btn-danger"
            type="button"
            onClick={() => setShowDelete(true)}
          >
            <span role="img" aria-label="Delete" className="profile-action-icon">🗑️</span> Hapus Akun
          </button>
        </div>
      </div>
      {/* Statistik Aktivitas User */}
      <div className="card profile-section-card">
        <h2>Statistik Aktivitas</h2>
        {activityLoading ? (
          <div>Loading...</div>
        ) : activityStats ? (
          <div className="statistik-grid">
            <div className="statistik-item">
              <span className="statistik-icon" role="img" aria-label="Event">📊</span>
              <div>
                <div className="statistik-label">Total Event</div>
                <div className="statistik-value">{activityStats.totalEvents}</div>
              </div>
            </div>
            <div className="statistik-item">
              <span className="statistik-icon" role="img" aria-label="Today">📅</span>
              <div>
                <div className="statistik-label">Hari ini</div>
                <div className="statistik-value">{activityStats.timeline.today}</div>
              </div>
            </div>
            <div className="statistik-item">
              <span className="statistik-icon" role="img" aria-label="Week">🗓️</span>
              <div>
                <div className="statistik-label">Minggu ini</div>
                <div className="statistik-value">{activityStats.timeline.thisWeek}</div>
              </div>
            </div>
            <div className="statistik-item">
              <span className="statistik-icon" role="img" aria-label="Month">📆</span>
              <div>
                <div className="statistik-label">Bulan ini</div>
                <div className="statistik-value">{activityStats.timeline.thisMonth}</div>
              </div>
            </div>
            <div className="statistik-item">
              <span className="statistik-icon" role="img" aria-label="Kategori">🏷️</span>
              <div>
                <div className="statistik-label">Kategori</div>
                <div className="statistik-value">
                  {Object.entries(activityStats.byCategory || {}).map(([cat, count]) => (
                    <span key={cat} className="statistik-badge">{cat}: {count}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="statistik-item">
              <span className="statistik-icon" role="img" aria-label="Severity">⚠️</span>
              <div>
                <div className="statistik-label">Severity</div>
                <div className="statistik-value">
                  {Object.entries(activityStats.bySeverity || {}).map(([sev, count]) => (
                    <span key={sev} className="statistik-badge">{sev}: {count}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>Tidak ada data aktivitas.</div>
        )}
      </div>
      {/* Audit Log User */}
      <div className="card profile-section-card">
        <h2>Riwayat Aktivitas (Audit Log)</h2>
        {auditLoading ? (
          <div>Loading...</div>
        ) : auditError ? (
          <div className="error-text">{auditError}</div>
        ) : auditLogs.length === 0 ? (
          <div>Tidak ada aktivitas.</div>
        ) : (
          <div className="auditlog-table">
            <div className="auditlog-header">
              <span>Aksi</span>
              <span>Kategori</span>
              <span>Severity</span>
              <span>Waktu</span>
              <span>Status</span>
            </div>
            {auditLogs.map((log) => (
              <div className="auditlog-row" key={log.id}>
                <span className="auditlog-action">{log.action}</span>
                <span className="auditlog-category">{log.category}</span>
                <span className={`auditlog-severity badge-severity-${log.severity}`}>{log.severity}</span>
                <span className="auditlog-time">{new Date(log.createdAt).toLocaleString()}</span>
                <span className={`auditlog-status badge-status-${log.status}`}>{log.status === "failed" ? "Gagal" : "Berhasil"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {showEdit && <EditProfileModal key={editModalKey} />}
      {showPassword && <ChangePasswordModal />}
      {showDelete && <DeleteAccountModal />}
    </div>
  );
}
