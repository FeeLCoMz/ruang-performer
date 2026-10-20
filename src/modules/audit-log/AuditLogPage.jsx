/**
 * AuditLogPage.jsx
 *
 * Halaman modul Audit Log — khusus Owner.
 *
 * Menampilkan riwayat aktivitas (login, perubahan data, aksi kritis) dari
 * endpoint /api/audit-logs, dengan ringkasan laporan dan filter
 * kategori / severity / status. Logika format & filter memakai
 * `src/utils/auditLogger.js` supaya tidak ada duplikasi.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuditLogs } from '../../apiClient.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import {
  ACTION_CATEGORIES,
  SEVERITY_LEVELS,
  filterAuditLogs,
  formatActionName,
  generateAuditReport,
  getSeverityColor,
} from '../../utils/auditLogger.js';
import { useAuditLogEnabled } from './useAuditLogEnabled.js';
import './audit-log.css';

const CATEGORY_OPTIONS = ['', ...Object.values(ACTION_CATEGORIES)];
const SEVERITY_OPTIONS = ['', ...Object.values(SEVERITY_LEVELS)];
const STATUS_OPTIONS = ['', 'success', 'failed'];

const formatTimestamp = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

export default function AuditLogPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [enabled] = useAuditLogEnabled();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [filters, setFilters] = useState({ category: '', severity: '', status: '' });

  const isOwner = !!user && user.role === 'owner';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setWarning(null);
    try {
      const data = await getAuditLogs({ limit: 200 });
      setLogs(Array.isArray(data?.logs) ? data.logs : []);
      if (data?.warning) setWarning(data.warning);
    } catch (err) {
      setError(err.message || 'Gagal mengambil audit log');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOwner) load();
  }, [isOwner, load]);

  const filtered = useMemo(() => filterAuditLogs(logs, filters), [logs, filters]);
  const report = useMemo(() => generateAuditReport(filtered), [filtered]);

  if (!isOwner) {
    return (
      <div className="page-container">
        <div className="page-header"><h1>Audit Log</h1></div>
        <div className="card">Hanya Owner aplikasi yang dapat mengakses halaman ini.</div>
      </div>
    );
  }

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="page-container audit-log-page">
      <div className="page-header">
        <div>
          <h1>🔍 Audit Log</h1>
          <p>Riwayat aktivitas pengguna: login, perubahan data, dan aksi kritis.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>
          {loading ? 'Memuat...' : 'Muat ulang'}
        </button>
      </div>

      {!enabled && (
        <div className="ct-banner ct-banner-warn" role="status">
          Modul ini sedang dinonaktifkan.{' '}
          <button type="button" className="btn btn-secondary ct-link-btn" onClick={() => navigate('/modules')}>
            Aktifkan di halaman Modul
          </button>
        </div>
      )}

      {error && <div className="tools-feedback tools-feedback-error">{error}</div>}
      {warning && <div className="tools-feedback">Peringatan server: {warning}</div>}

      <div className="card audit-log-filters">
        <label>
          Kategori
          <select value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
            {CATEGORY_OPTIONS.map((value) => (
              <option key={value || 'all'} value={value}>{value || 'Semua'}</option>
            ))}
          </select>
        </label>
        <label>
          Severity
          <select value={filters.severity} onChange={(e) => setFilter('severity', e.target.value)}>
            {SEVERITY_OPTIONS.map((value) => (
              <option key={value || 'all'} value={value}>{value || 'Semua'}</option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            {STATUS_OPTIONS.map((value) => (
              <option key={value || 'all'} value={value}>{value || 'Semua'}</option>
            ))}
          </select>
        </label>
        <span className="audit-log-count">{filtered.length} dari {logs.length} entri</span>
      </div>

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

      <div className="card audit-log-table-wrap">
        {loading && logs.length === 0 && <div className="audit-log-empty">Memuat audit log...</div>}
        {!loading && filtered.length === 0 && (
          <div className="audit-log-empty">
            Belum ada catatan audit yang cocok dengan filter ini.
          </div>
        )}
        {filtered.length > 0 && (
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
              {filtered.map((log, index) => (
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
    </div>
  );
}
