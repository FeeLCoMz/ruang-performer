/**
 * ModuleToggleList.jsx
 *
 * Daftar modul aplikasi tambahan beserta toggle on/off — dipakai di halaman
 * Administrator. Fitur administrator default (user, backup, audit) tidak
 * termasuk di sini karena bukan modul.
 */
import React from 'react';
import { getModuleAccessLabel } from '../../../utils/adminAccess.js';

function formatModuleToggleLabel(moduleName, enabled) {
  return `${enabled ? 'Nonaktifkan' : 'Aktifkan'} modul ${moduleName}`;
}

export default function ModuleToggleList({ modules, statuses, setEnabled }) {
  if (modules.length === 0) {
    return <div className="admin-muted">Belum ada modul terdaftar.</div>;
  }

  return (
    <div className="card admin-modules-list">
      {modules.map((mod) => {
        const enabled = !!statuses[mod.id];
        return (
          <div key={mod.id} className={`admin-module-row${enabled ? ' is-active' : ''}`}>
            <div className="admin-module-info">
              <strong>
                <span aria-hidden="true">{mod.icon}</span> {mod.name}
              </strong>
              <span className="admin-muted">{mod.description}</span>
            </div>
            <span className="admin-access-tag">
              {getModuleAccessLabel(mod.id)}
            </span>
            <label className="modules-toggle">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(mod.id, event.target.checked)}
                aria-label={formatModuleToggleLabel(mod.name, enabled)}
              />
              <span className="modules-toggle-track" aria-hidden="true">
                <span className="modules-toggle-thumb" />
              </span>
              <span className="modules-toggle-state">{enabled ? 'Aktif' : 'Nonaktif'}</span>
            </label>
          </div>
        );
      })}
    </div>
  );
}
