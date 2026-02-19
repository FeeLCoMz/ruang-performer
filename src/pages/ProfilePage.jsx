import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { trackEvent, trackPageView } from '../utils/analyticsUtil.js';
import * as apiClient from '../apiClient.js';


export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [showEdit, setShowEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  React.useEffect(() => {
    trackPageView('/profile', 'Profil Akun');
  }, []);


  const [profile, setProfile] = useState(user);

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
    trackEvent('logout', { email: user.email });
    logout();
  };


  // Edit Profile Modal
  const EditProfileModal = () => {
    const [form, setForm] = useState({
      displayName: profile.displayName || '',
      bio: profile.bio || '',
      instrument: profile.instrument || '',
      experience: profile.experience || '',
      location: profile.location || '',
      genres: Array.isArray(profile.genres) ? profile.genres.join(', ') : (profile.genres || ''),
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = e => {
      setForm({ ...form, [e.target.name]: e.target.value });
      setError('');
      setSuccess('');
    };

    const handleSubmit = async e => {
      e.preventDefault();
      setLoading(true);
      setError('');
      setSuccess('');
      try {
        await apiClient.updateProfile(form);
        // Ambil ulang profil terbaru
        const res = await apiClient.getCurrentUser();
        setProfile(res.user || profile);
        setSuccess('Profil berhasil diperbarui');
        trackEvent('profile_update', { email: profile.email });
        setTimeout(() => setShowEdit(false), 1200);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="modal-overlay" onClick={() => setShowEdit(false)}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <h2>Edit Profil</h2>
          <form onSubmit={handleSubmit} className="modal-form">
            <label>Nama Tampilan
              <input className="modal-input" name="displayName" value={form.displayName} onChange={handleChange} />
            </label>
            <label>Bio
              <textarea className="modal-input" name="bio" value={form.bio} onChange={handleChange} />
            </label>
            <label>Instrumen
              <input className="modal-input" name="instrument" value={form.instrument} onChange={handleChange} />
            </label>
            <label>Pengalaman
              <input className="modal-input" name="experience" value={form.experience} onChange={handleChange} />
            </label>
            <label>Lokasi
              <input className="modal-input" name="location" value={form.location} onChange={handleChange} />
            </label>
              <label>Preferensi Genre
                <input className="modal-input" name="genres" value={form.genres} onChange={handleChange} placeholder="Contoh: pop, rock, jazz" />
              </label>
            {error && <div className="error-text">{error}</div>}
            {success && <div className="success-text">{success}</div>}
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</button>
              <button className="btn" type="button" onClick={() => setShowEdit(false)} disabled={loading}>Batal</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Change Password Modal
  const ChangePasswordModal = () => {
    const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = e => {
      setForm({ ...form, [e.target.name]: e.target.value });
      setError('');
      setSuccess('');
    };

    const handleSubmit = async e => {
      e.preventDefault();
      setError('');
      setSuccess('');
      if (form.newPassword.length < 8) {
        setError('Password minimal 8 karakter');
        return;
      }
      if (form.newPassword !== form.confirm) {
        setError('Konfirmasi password tidak cocok');
        return;
      }
      setLoading(true);
      try {
        await apiClient.changePassword(form.oldPassword, form.newPassword);
        setSuccess('Password berhasil diubah');
        trackEvent('password_change', { email: user.email });
        setTimeout(() => setShowPassword(false), 1200);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="modal-overlay" onClick={() => setShowPassword(false)}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <h2>Ubah Password</h2>
          <form onSubmit={handleSubmit} className="modal-form">
            <label>Password Lama
              <input className="modal-input" name="oldPassword" type="password" value={form.oldPassword} onChange={handleChange} autoComplete="current-password" />
            </label>
            <label>Password Baru
              <input className="modal-input" name="newPassword" type="password" value={form.newPassword} onChange={handleChange} autoComplete="new-password" />
            </label>
            <label>Konfirmasi Password Baru
              <input className="modal-input" name="confirm" type="password" value={form.confirm} onChange={handleChange} autoComplete="new-password" />
            </label>
            {error && <div className="error-text">{error}</div>}
            {success && <div className="success-text">{success}</div>}
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</button>
              <button className="btn" type="button" onClick={() => setShowPassword(false)} disabled={loading}>Batal</button>
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
        <div className="profile-avatar">
          {profile.profilePicture ? (
            <img
              src={profile.profilePicture}
              alt={profile.displayName || 'Avatar'}
              className="avatar-circle"
              style={{ objectFit: 'cover', width: 80, height: 80, borderRadius: '50%' }}
            />
          ) : (
            <div className="avatar-circle">{profile.displayName ? profile.displayName[0].toUpperCase() : '?'}</div>
          )}
        </div>
        <div className="profile-info">
          <div className="profile-row">
            <span className="text-secondary">Nama Tampilan:</span>
            <span className="text-primary">{profile.displayName || '-'}</span>
          </div>
          <div className="profile-row">
            <span className="text-secondary">Email:</span>
            <span className="text-primary">{profile.email || '-'}</span>
          </div>
          <div className="profile-row">
            <span className="text-secondary">Bio:</span>
            <span className="text-primary">{profile.bio || '-'}</span>
          </div>
          <div className="profile-row">
            <span className="text-secondary">Instrumen:</span>
            <span className="text-primary">{profile.instrument || '-'}</span>
          </div>
          <div className="profile-row">
            <span className="text-secondary">Pengalaman:</span>
            <span className="text-primary">{profile.experience || '-'}</span>
          </div>
          <div className="profile-row">
            <span className="text-secondary">Lokasi:</span>
            <span className="text-primary">{profile.location || '-'}</span>
          </div>
           <div className="profile-row">
             <span className="text-secondary">Preferensi Genre:</span>
             <span className="text-primary">{Array.isArray(profile.genres) ? profile.genres.join(', ') : (profile.genres || '-')}</span>
             <button className="btn btn-secondary" style={{ marginLeft: 8 }} type="button" onClick={() => setShowEdit(true)}>Edit Preferensi</button>
           </div>
        </div>
        <div className="profile-actions">
          <button className="btn btn-primary" type="button" onClick={() => setShowEdit(true)}>Edit Profil</button>
          <button className="btn btn-secondary" type="button" onClick={() => setShowPassword(true)}>Ubah Password</button>
          <button className="btn" type="button" onClick={handleLogout}>Logout</button>
        </div>
      </div>
      {showEdit && <EditProfileModal />}
      {showPassword && <ChangePasswordModal />}
    </div>
  );
}
