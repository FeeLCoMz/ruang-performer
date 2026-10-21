/**
 * AuditLogPanel.jsx
 *
 * Panel audit log: filter kategori/severity/status, tabel entri, dan daftar
 * aktivitas terbaru. Mode `compact` dipakai di halaman Administrator (50 entri
 * terakhir + aktivitas terbaru), mode penuh dipakai halaman /audit-logs
 * (200 entri + statistik ringkasan). Data & filter berasal dari `useAuditLogs`.
 */
import React from 'react';
import {
  ACTION_CATEGORIES,
  SEVERITY_LEVELS,
  formatActionName,
  getSeverityColor,
} from '../../../utils/auditLogger.js';

const CATEGORY_OPTIONS = ['', ...Object.values(ACTION_CATEGORIES)];
const SEVERITY_OPTIONS = ['', ...Object.values(SEVERITY_LEVELS)];
const STATUS_OPTIONS = ['', 'success', 'failed'];

function formatTimestamp(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function AuditFilters({ filters, setFilter, filteredCount, totalCount }) {
  return (
    <div className="audit-log-filters">
      <label>
        Kategori
        <select value={filters.category} onChange={(event) => setFilter('category', event.target.value)}>
          {CATEGORY_OPTIONS.map((value) => (
            <option key={value || 'all'} value={value}>{value || 'Semua'}</option>
          ))}
        </select>
      </label>
      <label>
        Severity
        <select value={filters.severity} onChange={(event) => setFilter('severity', event.target.value)}>
          {SEVERITY_OPTIONS.map((value) => (
            <option key={value || 'all'} value={value}>{value || 'Semua'}</option>
          ))}
        </select>
      </label>
      <label>
        Status
        <select value={filters.status} onChange={(event) => setFilter('status', event.target.value)}>
          {STATUS_OPTIONS.map((value) => (
            <option key={value || 'all'} value={value}>{value || 'Semua'}</option>
          ))}
        </select>
      </label>
      <span className="audit-log-count">{filteredCount} dari {totalCount} entri</span>
    </div>
  );
}

function AuditTable({ logs, loading, error }) {
  return (
    <div className="admin-user-table-wrap">
      {loading && logs.length === 0 && <div className="audit-log-empty">Memuat audit log...</div>}
      {error && <div className="tools-feedback tools-feedback-error">{error}</div>}
      {!loading && !error && logs.length === 0 && (
        <div className="audit-log-empty">Belum ada catatan yang cocok dengan filter ini.</div>
      )}
      {logs.length > 0 && (
        <table className="audit-log-table">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>User</th>
              <th>Aksi</th>
              <th>Kategori</th>
              <th>Severity</th>
              <th>Status</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => (
              <tr key={log.id || `${log.action}-${log.createdAt}-${index}`}>
                <td>{formatTimestamp(log.createdAt)}</td>
                <td>{log.username || log.userId || '-'}</td>
                <td title={log.description || ''}>{formatActionName(log.action || '')}</td>
                <td>{log.category || '-'}</td>
                <td>
                  <span
                    className="audit-log-badge"
                    style={{ backgroundColor: getSeverityColor(log.severity) }}
                  >
                    {log.severity || '-'}
                  </span>
                </td>
                <td>{log.status || '-'}</td>
                <td>{log.ipAddress || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function RecentActivity({ logs, loading, error }) {
  return (
    <div className="card admin-activity-card">
      {loading && logs.length === 0 && <div className="admin-muted">Memuat aktivitas...</div>}
      {!loading && !error && logs.length === 0 && (
        <div className="admin-muted">Belum ada catatan aktivitas.</div>
      )}
      {logs.length > 0 && (
        <ul className="admin-activity-list">
          {logs.slice(0, 5).map((log, index) => (
            <li key={log.id || `${log.action}-${log.createdAt}-${index}`} className="admin-activity-item">
              <span className="admin-activity-action">{formatActionName(log.action || '')}</span>
              <span className="admin-activity-meta">
                {log.username || log.userId || '-'} · {formatTimestamp(log.createdAt)}
              </span>
              {log.status && (
                <span className={`admin-activity-status is-${log.status}`}>{log.status}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
export default function AuditLogPanel({ auditLogs, mode = 'compact', reloadLogs }) {
  const { logs, filteredLogs, report, loading, error, filters, setFilter, reload } = auditLogs;
  const refresh = reloadLogs || reload;

  if (mode === 'compact') {
    return (
      <>
        <h2 className="admin-section-title" id="admin-audit">Audit Log</h2>
        <div className="card admin-panel">
          <div className="admin-panel-header">
            <span className="admin-muted">
              {filteredLogs.length} dari {logs.length} entri · hari ini {report.timeline.today} ·
              mencurigakan {report.suspiciousActivity.length}
            </span>
            <button type="button" className="btn btn-secondary" onClick={refresh} disabled={loading}>
              {loading ? 'Memuat...' : 'Muat ulang'}
            </button>
          </div>
          <AuditFilters
            filters={filters}
            setFilter={setFilter}
            filteredCount={filteredLogs.length}
            totalCount={logs.length}
          />
          <AuditTable logs={filteredLogs} loading={loading} error={error} />
        </div>

        <h2 className="admin-section-title">Aktivitas Terbaru</h2>
        <RecentActivity logs={logs} loading={loading} error={error} />
      </>
    );
  }

  return (
    <>
      <div className="card audit-log-filters">
        <AuditFilters
          filters={filters}
          setFilter={setFilter}
          filteredCount={filteredLogs.length}
          totalCount={logs.length}
        />
      </div>

      <AuditLogSummary report={report} />

      <div className="card audit-log-table-wrap">
        <AuditTable logs={filteredLogs} loading={loading} error={error} />
      </div>
    </>
  );
}

/** Statistik ringkasan audit log (mode penuh). */
export function AuditLogSummary({ report }) {
  return (
    <div className="audit-log-summary">
      <div className="card audit-log-stat">
        <strong>{report.totalEvents}</strong>
        <span>Total entri</span>
      </div>
      <div className="card audit-log-stat">
        <strong>{report.timeline.today}</strong>
        <span>Hari ini</span>
      </div>
      <div className="card audit-log-stat">
        <strong>{report.timeline.thisWeek}</strong>
        <span>7 hari terakhir</span>
      </div>
      <div className="card audit-log-stat audit-log-stat-warn">
        <strong>{report.suspiciousActivity.length}</strong>
        <span>Aktivitas mencurigakan</span>
      </div>
    </div>
  );
}
