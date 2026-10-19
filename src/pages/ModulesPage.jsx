/**
 * ModulesPage.jsx
 *
 * Halaman khusus modul: menampilkan daftar semua modul yang terdeteksi
 * dari `src/modules/registry.js`, lengkap dengan toggle on/off per modul.
 *
 * User bisa mengaktifkan / menonaktifkan modul dari sini; perubahan langsung
 * berpengaruh ke fitur terkait (mis. modul MIDI menghentikan akses Web MIDI).
 */
import React from 'react';
import { useModulesEnabled } from '../hooks/useModulesEnabled.js';
import { getModulesWithStatus } from '../modules/registry.js';

export default function ModulesPage() {
  const { statuses, setEnabled } = useModulesEnabled();
  const modules = getModulesWithStatus();

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
            </div>
          );
        })}
      </div>
    </div>
  );
}
