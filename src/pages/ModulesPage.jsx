/**
 * ModulesPage.jsx
 *
 * Halaman khusus modul: menampilkan daftar semua modul yang terdeteksi
 * dari `src/modules/registry.js`, lengkap dengan toggle on/off per modul.
 *
 * Modul khusus Administrator (Backup & Restore, Audit Log) bukan modul —
 * fitur itu selalu aktif dan hanya ada di halaman Administrator (/admin).
 * User bisa mengaktifkan / menonaktifkan modul dari sini; perubahan langsung
 * berpengaruh ke fitur terkait (mis. modul MIDI menghentikan akses Web MIDI).
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useModulesEnabled } from '../hooks/useModulesEnabled.js';
import { getModulesWithStatus } from '../modules/registry.js';
import { useAIUsage } from '../modules/ai-autofill/useAIUsage.js';

export default function ModulesPage() {
  const { statuses, setEnabled } = useModulesEnabled();
  // Modul khusus Administrator (Backup & Restore, Audit Log) bukan modul —
  // fitur itu selalu tersedia di halaman /admin, jadi tidak didaftarkan di sini.
  const modules = getModulesWithStatus();
  // Kuota AI Autofill ditampilkan di kartunya supaya user tahu sisa pemakaian
  // sebelum kena 429, tanpa harus membuka editor lagu.
  const { usage: aiUsage, loading: aiUsageLoading, refresh: refreshAiUsage } = useAIUsage(!!statuses['ai-autofill']);

  const activeCount = modules.filter((mod) => statuses[mod.id]).length;
  const inactiveCount = modules.length - activeCount;

  return (
    <div className="page-container modules-page">
      <section className="mod-hero">
        <div className="mod-eyebrow">
          <span className="mod-eyebrow-dot" aria-hidden="true" />
          Modul
        </div>

        <div className="mod-hero-heading">
          <h1 className="mod-hero-title">Modul</h1>
          <p className="mod-hero-subtitle">
            Aktifkan atau nonaktifkan modul tambahan sesuai kebutuhan.
          </p>
        </div>

        <div className="mod-summary-grid">
          <div className="mod-summary-card">
            <span className="mod-summary-label">Tersedia</span>
            <span className="mod-summary-value">{modules.length}</span>
            <span className="mod-summary-hint">Modul terdaftar</span>
          </div>
          <div className="mod-summary-card">
            <span className="mod-summary-label">Aktif</span>
            <span className="mod-summary-value">{activeCount}</span>
            <span className="mod-summary-hint">Sedang dipakai</span>
          </div>
          <div className={`mod-summary-card${inactiveCount === 0 ? ' mod-summary-card--muted' : ''}`}>
            <span className="mod-summary-label">Nonaktif</span>
            <span className="mod-summary-value">{inactiveCount}</span>
            <span className="mod-summary-hint">Bisa dinyalakan kapan saja</span>
          </div>
        </div>
      </section>

      <div className="modules-grid">
        {modules.length === 0 && (
          <div className="modules-empty">Belum ada modul terdaftar.</div>
        )}
        {modules.map((mod) => {
          const enabled = statuses[mod.id];
          return (
            <div key={mod.id} className={`tool-card modules-card${enabled ? ' modules-card-active' : ''}`}>
              <div className="modules-card-header">
                <h2>
                  <span className="modules-icon" aria-hidden="true">{mod.icon}</span>
                  {mod.name}
                </h2>
                <label className="modules-toggle">
                  <input
                    type="checkbox"
                    checked={!!enabled}
                    onChange={(event) => setEnabled(mod.id, event.target.checked)}
                    aria-label={`Aktifkan atau nonaktifkan modul ${mod.name}`}
                  />
                  <span className="modules-toggle-track" aria-hidden="true">
                    <span className="modules-toggle-thumb" />
                  </span>
                  <span className="modules-toggle-state">{enabled ? 'Aktif' : 'Nonaktif'}</span>
                </label>
              </div>
              <p className="modules-card-desc">{mod.description}</p>
              {mod.id === 'ai-autofill' && enabled && (
                <div
                  className={`modules-quota${aiUsage && aiUsage.remaining === 0 ? ' modules-quota-empty' : ''}`}
                  role="status"
                >
                  {aiUsageLoading && !aiUsage && 'Memuat sisa kuota…'}
                  {aiUsage && aiUsage.remaining > 0 && (
                    <>Sisa kuota bulan {aiUsage.period}: <strong>{aiUsage.remaining}</strong> dari {aiUsage.limit}</>
                  )}
                  {aiUsage && aiUsage.remaining === 0 && (
                    <>Kuota bulan {aiUsage.period} habis (<strong>{aiUsage.used}/{aiUsage.limit}</strong>). Autofill akan ditolak sampai bulan depan.</>
                  )}
                  {!aiUsageLoading && !aiUsage && (
                    <>
                      Sisa kuota tidak tersedia.
                      <button type="button" className="btn btn-secondary modules-quota-retry" onClick={refreshAiUsage}>
                        Coba lagi
                      </button>
                    </>
                  )}
                </div>
              )}
              {mod.path && (
                <Link
                  to={mod.path}
                  className={`btn btn-secondary modules-open${enabled ? '' : ' is-disabled'}`}
                  aria-disabled={!enabled}
                  onClick={(event) => {
                    if (!enabled) event.preventDefault();
                  }}
                >
                  Buka modul →
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
