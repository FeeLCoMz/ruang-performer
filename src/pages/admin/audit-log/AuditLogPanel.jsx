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
  AUDIT_DATE_PRESETS,
  formatActionName,
} from '../../../utils/auditLogger.js';
import AuditLogDetail from './AuditLogDetail.jsx';
import './audit-log.css';

const CATEGORY_OPTIONS = ['', ...Object.values(ACTION_CATEGORIES)];
const SEVERITY_OPTIONS = ['', ...Object.values(SEVERITY_LEVELS)];
const STATUS_OPTIONS = ['', 'success', 'failed'];

function formatTimestamp(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function AuditFilters({
  filters,
  setFilter,
  onApplyRange,
  resetFilters,
  activeFilterCount,
  filteredCount,
  totalCount,
}) {
  return (
    <div className="audit-log-filters" style={{ '--btn-group': '36px' }}>
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
      {activeFilterCount > 0 && (
        <button type="button" className="btn btn-secondary" onClick={resetFilters}>
          Reset filter ({activeFilterCount})
        </button>
      )}
      <label>
        Dari tanggal
        <input
          type="date"
          value={filters.startDate || ''}
          max={filters.endDate || undefined}
          onChange={(event) => setFilter('startDate', event.target.value)}
        />
      </label>
      <label>
        Sampai tanggal
        <input
          type="date"
          value={filters.endDate || ''}
          min={filters.startDate || undefined}
          onChange={(event) => setFilter('endDate', event.target.value)}
        />
      </label>
      <div className="audit-log-presets" role="group" aria-label="Rentang tanggal cepat">
        {[
          { id: 'today', label: 'Hari ini' },
          { id: '7d', label: '7 hari' },
          { id: '30d', label: '30 hari' },
          { id: '90d', label: '90 hari' },
        ].map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="audit-log-preset"
            onClick={() => onApplyRange(AUDIT_DATE_PRESETS(preset.id))}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <span className="audit-log-count">{filteredCount} dari {totalCount} entri</span>
    </div>
  );
}

function AuditTable({ logs, loading, error, onSelect }) {
  return (
    <div className="audit-log-table-wrap">
      {loading && logs.length === 0 && (
        <div className="admin-skeleton" aria-label="Memuat audit log" aria-busy="true">
          <span className="admin-skeleton-row" />
          <span className="admin-skeleton-row" />
          <span className="admin-skeleton-row" />
        </div>
      )}
      {error && <div className="tools-feedback tools-feedback-error">{error}</div>}
      {!loading && !error && logs.length === 0 && (
        <div className="admin-empty-state">
          <span className="admin-empty-icon" aria-hidden="true">📭</span>
          <strong>Belum ada catatan</strong>
          <span>Aktivitas login dan perubahan data akan tercatat di sini.</span>
        </div>
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
              <tr
                key={log.id || `${log.action}-${log.createdAt}-${index}`}
                className="audit-log-row"
                tabIndex={0}
                aria-label={`Lihat detail ${formatActionName(log.action || '')}`}
                onClick={() => onSelect(log)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(log);
                  }
                }}
              >
                <td data-label="Waktu">{formatTimestamp(log.createdAt)}</td>
                <td data-label="User">{log.username || log.userId || '-'}</td>
                <td data-label="Aksi" title={log.description || ''}>
                  {formatActionName(log.action || '')}
                </td>
                <td data-label="Kategori">{log.category || '-'}</td>
                <td data-label="Severity">
                  {log.severity ? (
                    <span className={`audit-log-badge severity-${log.severity}`}>
                      {log.severity}
                    </span>
                  ) : '-'}
                </td>
                <td data-label="Status">
                  {log.status ? (
                    <span className={`audit-log-status is-${log.status}`}>{log.status}</span>
                  ) : '-'}
                </td>
                <td data-label="IP">{log.ipAddress || '-'}</td>
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
  const {
    logs,
    filteredLogs,
    report,
    loading,
    error,
    filters,
    setFilter,
    resetFilters,
    activeFilterCount,
    reload,
  } = auditLogs;
  const refresh = reloadLogs || reload;

  // Entri yang sedang dibuka di drawer detail (null = tertutup).
  const [selectedLog, setSelectedLog] = React.useState(null);
  const closeDetail = React.useCallback(() => setSelectedLog(null), []);
  const detailDrawer = selectedLog ? (
    <AuditLogDetail log={selectedLog} onClose={closeDetail} />
  ) : null;

  const applyDateRange = (range) => {
    setFilter('startDate', range.startDate);
    setFilter('endDate', range.endDate);
  };

  if (mode === 'compact') {
    return (
      <>
        <h2 className="admin-section-title" id="admin-audit">Audit Log</h2>
        <div className="card admin-panel">
          <div className="admin-panel-header">
            <span className="admin-muted admin-audit-summary">
              <span className="audit-log-stat-line">Hari ini {report.timeline.today}</span>
              <span className="audit-log-stat-line is-warn">
                Mencurigakan {report.suspiciousActivity.length}
              </span>
            </span>
            <button type="button" className="btn btn-secondary" onClick={refresh} disabled={loading}>
              {loading ? 'Memuat...' : 'Muat ulang'}
            </button>
          </div>
          <AuditFilters
            filters={filters}
            setFilter={setFilter}
            onApplyRange={applyDateRange}
            resetFilters={resetFilters}
            activeFilterCount={activeFilterCount}
            filteredCount={filteredLogs.length}
            totalCount={logs.length}
          />
          <AuditTable
            logs={filteredLogs}
            loading={loading}
            error={error}
            onSelect={setSelectedLog}
          />
        </div>

        <h2 className="admin-section-title">Aktivitas Terbaru</h2>
        <RecentActivity logs={logs} loading={loading} error={error} />
        {detailDrawer}
      </>
    );
  }

  return (
    <>
      <div className="audit-log-filter-bar">
        <AuditFilters
          filters={filters}
          setFilter={setFilter}
          onApplyRange={applyDateRange}
          resetFilters={resetFilters}
          activeFilterCount={activeFilterCount}
          filteredCount={filteredLogs.length}
          totalCount={logs.length}
        />
      </div>

      <AuditLogSummary report={report} />

      <div className="card audit-log-table-card">
        <AuditTable
          logs={filteredLogs}
          loading={loading}
          error={error}
          onSelect={setSelectedLog}
        />
      </div>
      {detailDrawer}
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
