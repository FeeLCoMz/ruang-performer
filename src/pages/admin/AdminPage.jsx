/**
 * AdminPage.jsx
 *
 * Halaman khusus Administrator (/admin) — pusat kendali untuk role akun
 * `admin` dan `owner` aplikasi (lihat `src/utils/adminAccess.js`).
 *
 * Halaman ini berupa tab; tab aktif disimpan di URL hash (`#users`, `#backup`,
 * `#audit`) sehingga bisa di-bookmark dan tombol back berfungsi. Setiap tab
 * memuat panel dari folder fiturnya masing-masing:
 * - users/UserManagementPanel.jsx                 → kelola user
 * - backup-restore/BackupRestorePanel.jsx         → backup & restore database
 * - audit-log/AuditLogPanel.jsx + useAuditLogs.js → audit log & aktivitas
 * - tag-detection/TagDetectionPanel.jsx           → kelompok tag yang dideteksi
 *   ChordDisplay (section, metadata, cue mark, instrumen, …) + pratinjau
 *
 * Data user dimiliki satu hook (`useAdminUsers`) dan dibagikan ke ringkasan
 * statistik maupun tabel user, sehingga endpoint /users hanya dipanggil sekali.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { getAppRoleLabel, isAppAdmin, summarizeUsers } from '../../utils/adminAccess.js';
import { useAdminUsers } from './useAdminUsers.js';
import { useAuditLogs } from './audit-log/useAuditLogs.js';
import AuditLogPanel from './audit-log/AuditLogPanel.jsx';
import UserManagementPanel from './users/UserManagementPanel.jsx';
import { STAT_PERIODS, buildUserStatCards, getLastLoginMap, getUserGrowth } from './users/userStats.js';
import BackupRestorePanel from './backup-restore/BackupRestorePanel.jsx';
import TagDetectionPanel from './tag-detection/TagDetectionPanel.jsx';
import './admin.css';

// Sub-komponen halaman ini menerima objek dari context/props internal.
/* eslint-disable react/prop-types */

const ACCESS_DENIED_TEXT = 'Halaman ini hanya dapat diakses oleh Administrator aplikasi.';

const TAB_OVERVIEW = 'ringkasan';

const ADMIN_TABS = [
  { id: TAB_OVERVIEW, label: 'Ringkasan', icon: '📊' },
  { id: 'users', label: 'User', icon: '👥' },
  { id: 'tags', label: 'Tag & Deteksi', icon: '🏷' },
  { id: 'backup', label: 'Backup', icon: '💾' },
  { id: 'audit', label: 'Audit Log', icon: '🔍' },
];

function getTabFromHash() {
  const hash = window.location.hash.replace(/^#/, '');
  return ADMIN_TABS.some((tab) => tab.id === hash) ? hash : TAB_OVERVIEW;
}

/** Navigasi tab — tombol dengan peran tab agar mudah dioperasikan keyboard. */
function AdminTabs({ activeTab, onSelect }) {
  return (
    <div className="admin-tabs" role="tablist" aria-label="Bagian administrator">
      {ADMIN_TABS.map((tab) => {
        const selected = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`admin-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`admin-panel-${tab.id}`}
            className={`admin-tab${selected ? ' is-active' : ''}`}
            onClick={() => onSelect(tab.id)}
          >
            <span aria-hidden="true">{tab.icon}</span> {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/** Tab ringkasan: statistik akun + pintasan ke tab lain. */
function AdminOverview({ userSummary, cards, loading, error, onNavigate, period, setPeriod }) {
  const shortcuts = [
    {
      id: 'users',
      title: 'Manajemen User',
      icon: '👥',
      description: 'Ubah role, aktif/nonaktifkan, reset password, atau hapus akun user.',
      action: 'Kelola User',
    },
    {
      id: 'tags',
      title: 'Tag & Deteksi',
      icon: '🏷',
      description: 'Atur kelompok tag yang dideteksi ChordDisplay: section, metadata, cue mark, instrumen, dan lainnya.',
      action: 'Atur Tag',
    },
    {
      id: 'backup',
      title: 'Backup & Restore',
      icon: '💾',
      description: 'Backup seluruh database ke file SQL atau pulihkan dari backup sebelumnya.',
      action: 'Buka Backup',
    },
    {
      id: 'audit',
      title: 'Audit Log',
      icon: '🔍',
      description: 'Riwayat login, perubahan data, dan aksi kritis dengan filter kategori.',
      action: 'Lihat Audit Log',
    },
  ];

  return (
    <>
      <div className="admin-period-bar">
        <span className="admin-muted">Periode pertumbuhan user</span>
        <div className="admin-period-options" role="group" aria-label="Periode pertumbuhan user">
          {STAT_PERIODS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`admin-period${option.id === period ? ' is-active' : ''}`}
              aria-pressed={option.id === period}
              onClick={() => setPeriod(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <AdminUserSummary
        summary={userSummary}
        cards={cards}
        loading={loading}
        error={error}
        onNavigate={onNavigate}
      />
      <h2 className="admin-section-title">Kelola Sistem</h2>
      <div className="tools-grid admin-actions-grid">
        {shortcuts.map((item) => (
          <div key={item.id} className="tool-card admin-card admin-shortcut">
            <div className="admin-shortcut-head">
              <span className="admin-shortcut-icon" aria-hidden="true">{item.icon}</span>
              <h2>{item.title}</h2>
            </div>
            <p className="admin-shortcut-desc">{item.description}</p>
            <button
              type="button"
              className="btn admin-shortcut-action"
              onClick={() => onNavigate(item.id)}
            >
              {item.action}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * Ringkasan akun. Kartu yang punya `tab` bisa diklik untuk membuka tab
 * terkait, sehingga angka menjadi pintasan, bukan sekadar informasi.
 */
function AdminUserSummary({ cards, loading, error, onNavigate }) {
  return (
    <div className="card admin-summary-card">
      <div className="admin-stat-grid">
        {cards.map((stat) => {
          const content = (
            <>
              <span className="admin-stat-icon" aria-hidden="true">{stat.icon}</span>
              <strong>{loading ? '…' : stat.value}</strong>
              <span className="admin-stat-label">{stat.label}</span>
              {stat.hint && <span className="admin-stat-hint">{stat.hint}</span>}
              {stat.delta !== null && stat.delta !== undefined && (
                <span className={`admin-stat-delta${stat.delta > 0 ? ' is-up' : stat.delta < 0 ? ' is-down' : ''}`}>
                  {stat.delta > 0 ? '▲' : stat.delta < 0 ? '▼' : '–'} {Math.abs(stat.delta)}
                </span>
              )}
            </>
          );

          if (!stat.tab || loading) {
            return <div key={stat.id} className="admin-stat">{content}</div>;
          }

          return (
            <button
              key={stat.id}
              type="button"
              className="admin-stat is-clickable"
              onClick={() => onNavigate(stat.tab)}
            >
              {content}
            </button>
          );
        })}
      </div>
      {error && <div className="tools-feedback tools-feedback-error">{error}</div>}
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const isAdmin = isAppAdmin(user);

  // Tab aktif mengikuti URL hash supaya bisa di-bookmark / dibuka dari pintasan.
  const [activeTab, setActiveTab] = useState(getTabFromHash);
  // Periode pembanding untuk kartu pertumbuhan user (default 30 hari).
  const [statPeriod, setStatPeriod] = useState('30d');

  useEffect(() => {
    const onHashChange = () => setActiveTab(getTabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigateToTab = (tabId) => {
    if (window.location.hash.replace(/^#/, '') === tabId) {
      setActiveTab(tabId);
      return;
    }
    window.location.hash = tabId;
  };

  // Satu sumber data user untuk ringkasan statistik dan tab User.
  const adminUsers = useAdminUsers({ actor: user, enabled: isAdmin });
  const userSummary = useMemo(() => summarizeUsers(adminUsers.users), [adminUsers.users]);

  // Audit log dimuat untuk administrator: penuh saat tab Audit dibuka, dan
  // secukupnya di tab Ringkasan untuk menghitung "login terakhir".
  const auditLogs = useAuditLogs({
    limit: activeTab === 'audit' ? 50 : 100,
    enabled: isAdmin,
  });

  const lastLoginMap = useMemo(() => getLastLoginMap(auditLogs.logs), [auditLogs.logs]);
  const statDays = STAT_PERIODS.find((option) => option.id === statPeriod)?.days ?? null;
  const growth = useMemo(
    () => getUserGrowth(adminUsers.users, statDays),
    [adminUsers.users, statDays],
  );
  const statCards = useMemo(
    () => buildUserStatCards(userSummary, { lastLoginMap, growth, days: statDays }),
    [userSummary, lastLoginMap, growth, statDays],
  );

  if (!isAdmin) {
    return (
      <div className="page-container">
        <div className="page-header"><h1>Administrator</h1></div>
        <div className="empty-state">{ACCESS_DENIED_TEXT}</div>
      </div>
    );
  }

  return (
    <div className="page-container admin-page">
      <section className="adm-hero">
        <div className="adm-hero-top">
          <div className="adm-eyebrow">
            <span className="adm-eyebrow-dot" aria-hidden="true" />
            Administrator
          </div>
          <span className={`admin-role-badge admin-role-${user.role}`}>
            {getAppRoleLabel(user.role)}
          </span>
        </div>

        <div className="adm-hero-heading">
          <h1 className="adm-hero-title">Administrator</h1>
          <p className="adm-hero-subtitle">
            Kelola user, atur tag deteksi, backup database, dan telusuri audit log.
          </p>
        </div>
      </section>

      <AdminTabs activeTab={activeTab} onSelect={navigateToTab} />

      <div
        className="admin-tab-panel"
        role="tabpanel"
        id={`admin-panel-${activeTab}`}
        aria-labelledby={`admin-tab-${activeTab}`}
      >
        {activeTab === TAB_OVERVIEW && (
          <AdminOverview
            userSummary={userSummary}
            cards={statCards}
            loading={adminUsers.loading}
            error={adminUsers.error}
            onNavigate={navigateToTab}
            period={statPeriod}
            setPeriod={setStatPeriod}
          />
        )}

        {activeTab === 'users' && (
          <UserManagementPanel
            actor={user}
            adminUsers={adminUsers}
            lastLoginMap={lastLoginMap}
          />
        )}

        {activeTab === 'tags' && <TagDetectionPanel />}

        {activeTab === 'backup' && <BackupRestorePanel />}

        {activeTab === 'audit' && <AuditLogPanel auditLogs={auditLogs} mode="compact" />}
      </div>
    </div>
  );
}
