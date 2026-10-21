/**
 * ModulesPage.jsx
 *
 * Halaman khusus modul: menampilkan daftar semua modul yang terdeteksi
 * dari `src/modules/registry.js`, lengkap dengan toggle on/off per modul.
 *
 * Modul bertanda `adminOnly` (mis. Backup & Restore, Audit Log) tidak ikut
 * tampil — modul tersebut hanya dikelola dari halaman Administrator (/admin).
 *
 * User bisa mengaktifkan / menonaktifkan modul dari sini; perubahan langsung
 * berpengaruh ke fitur terkait (mis. modul MIDI menghentikan akses Web MIDI).
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useModulesEnabled } from '../hooks/useModulesEnabled.js';
import { getVisibleModules } from '../modules/registry.js';
import { useAIUsage } from '../modules/ai-autofill/useAIUsage.js';

export default function ModulesPage() {
  const { statuses, setEnabled } = useModulesEnabled();
  // Modul khusus Administrator (Backup & Restore, Audit Log) tidak ditampilkan
  // di sini — pengaturan modul tersebut ada di halaman /admin.
  const modules = getVisibleModules();
  // Kuota AI Autofill ditampilkan di kartunya supaya user tahu sisa pemakaian
  // sebelum kena 429, tanpa harus membuka editor lagu.
  const { usage: aiUsage, loading: aiUsageLoading, refresh: refreshAiUsage } = useAIUsage(!!statuses['ai-autofill']);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>🧩 Modul</h1>
          <p>Aktifkan atau nonaktifkan modul tambahan sesuai kebutuhan.</p>
        </div>
      </div>

      <div className="card modules-grid">
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
              <p>{mod.description}</p>
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
