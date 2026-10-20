import React from 'react';
import { useNavigate } from 'react-router-dom';
import * as apiClient from '../apiClient.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getToken } from '../utils/auth.js';
// No permission check needed, just check user.role === 'owner'

// --- Hooks dipisah dari komponen supaya urutan hook selalu konsisten ---
// (rules of hooks: tidak boleh ada hook setelah early return owner guard).
function useOwnerAuth() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  React.useEffect(() => {
    async function syncUser() {
      if (!user || user.role !== 'owner') {
        try {
          const res = await apiClient.getCurrentUser();
          if (res && res.user && res.user.role === 'owner') {
            login(getToken(), res.user);
          }
        } catch { /* ignore */ }
      }
    }
    syncUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { user, navigate };
}

export default function ToolsPage() {
  const { user, navigate } = useOwnerAuth();

  if (!user || user.role !== 'owner') {
    return (
      <div className="page-container">
        <div className="page-header"><h1>Tools</h1></div>
        <div className="card">Hanya Owner aplikasi yang dapat mengakses halaman ini.</div>
      </div>
    );
  }

  // --- Backup & restore kini berupa modul mandiri: /backup-restore ---

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>🛠️ Tools Owner</h1>
          <p>Utilitas backup, restore, dan pemeliharaan data aplikasi</p>
        </div>
      </div>

      <div className="card tools-grid">
        <div className="tool-card">
          <h2>💾 Backup &amp; Restore Database</h2>
          <p>Backup seluruh database ke file SQL, atau pulihkan dari backup sebelumnya.</p>
          <button className="btn btn-primary" onClick={() => navigate('/backup-restore')}>Buka Modul</button>
        </div>

        <div className="tool-card">
          <h2>👥 User Management</h2>
          <p>Kelola user: reset password, nonaktifkan user, atau ubah role user secara manual.</p>
          <button className="btn btn-secondary" onClick={() => navigate('/user-management')}>Kelola User</button>
        </div>
      </div>
    </div>
  );
}
