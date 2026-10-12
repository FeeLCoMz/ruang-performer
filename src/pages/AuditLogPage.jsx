import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  filterAuditLogs, 
  generateAuditReport, 
  formatActionName 
} from '../utils/auditLogger';
import '../styles/AuditLog.css';

export default function AuditLogPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    severity: '',
    status: '',
    startDate: '',
    endDate: ''
  });
  const [report, setReport] = useState(null);
  const [view, setView] = useState('timeline'); // timeline or stats

  const getSeverityClass = (severity) => `audit-severity-${String(severity || 'low').toLowerCase()}`;

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError('');
      
      // For now, use mock data - in production would fetch from API
      const mockLogs = [
        {
          id: 1,
          action: 'USER_LOGIN',
          category: 'USER',
          severity: 'low',
          username: user?.username,
          userId: user?.userId,
          bandName: null,
          status: 'success',
          createdAt: new Date().toISOString(),
          changes: {}
        }
      ];
      
      setLogs(mockLogs);
      setReport(generateAuditReport(mockLogs));
    } catch (err) {
      setError('Gagal memuat audit log');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = filterAuditLogs(logs, filters);

  if (loading) {
    return (
      <div className="page-container">
        <h1 className="audit-loading-title">Memuat...</h1>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Audit Log & Aktivitas</h1>
        <div className="audit-view-actions">
          <button
            className={`btn audit-view-button ${view === 'timeline' ? 'is-active' : ''}`}
            onClick={() => setView('timeline')}
          >
            Linimasa
          </button>
          <button
            className={`btn audit-view-button ${view === 'stats' ? 'is-active' : ''}`}
            onClick={() => setView('stats')}
          >
            Statistik
          </button>
        </div>
      </div>

      {error && (
        <div className="error-text">
          <p>{error}</p>
        </div>
      )}

      {view === 'timeline' ? (
        <>
          {/* Filters */}
          <div className="card">
            <h2>Filter</h2>
            <div className="filter-grid">
              <div>
                <label className="form-label">
                  Kategori
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="modal-input"
                >
                  <option value="">Semua Kategori</option>
                  <option value="USER">User</option>
                  <option value="BAND">Band</option>
                  <option value="MEMBER">Member</option>
                  <option value="PERMISSION">Izin</option>
                  <option value="SONG">Lagu</option>
                  <option value="SETLIST">Setlist</option>
                  <option value="SECURITY">Keamanan</option>
                </select>
              </div>

              <div>
                <label className="form-label">
                  Tingkat
                </label>
                <select
                  value={filters.severity}
                  onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                  className="modal-input"
                >
                  <option value="">Semua Tingkat</option>
                  <option value="low">Rendah</option>
                  <option value="medium">Sedang</option>
                  <option value="high">Tinggi</option>
                  <option value="critical">Kritis</option>
                </select>
              </div>

              <div>
                <label className="form-label">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="modal-input"
                >
                  <option value="">Semua Status</option>
                  <option value="success">Berhasil</option>
                  <option value="failed">Gagal</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button
                onClick={() => setFilters({
                  category: '', severity: '', status: '', startDate: '', endDate: ''
                })}
                className="btn btn-secondary"
              >
                Reset Filter
              </button>
              <button
                onClick={fetchAuditLogs}
                className="btn btn-primary"
              >
                Muat Ulang
              </button>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="card">
            <h2>Linimasa Aktivitas ({filteredLogs.length} kejadian)</h2>
            <div className="activity-timeline">
              {filteredLogs.length === 0 ? (
                <p className="audit-empty-state">
                  Tidak ada kejadian
                </p>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className="timeline-item">
                    <div className={`timeline-marker ${getSeverityClass(log.severity)}`} />
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="action-name audit-action-name">
                          {formatActionName(log.action)}
                        </span>
                        <span className="timeline-time">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="timeline-meta">
                        <span className={`badge audit-severity-badge ${getSeverityClass(log.severity)}`}>
                          {log.severity}
                        </span>
                        <span className="badge audit-category-badge">
                          {log.category}
                        </span>
                        {log.status === 'failed' && (
                          <span className="badge audit-failed-badge">
                            Gagal
                          </span>
                        )}
                      </div>
                      {log.user && (
                        <p className="audit-meta-line audit-meta-line-user">
                          <strong>User:</strong> {log.user}
                        </p>
                      )}
                      {log.band && (
                        <p className="audit-meta-line audit-meta-line-band">
                          <strong>Band:</strong> {log.band}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : (
        /* Statistics View */
        <div className="audit-stats-grid">
          {/* Summary Stats */}
          <div className="card">
            <h3>Ringkasan</h3>
            <div className="audit-stats-list">
              <div className="audit-stats-row">
                <span>Total Kejadian</span>
                <strong className="audit-stats-total">{report?.totalEvents || 0}</strong>
              </div>
              <div className="audit-stats-row">
                <span>Hari Ini</span>
                <strong>{report?.timeline?.today || 0}</strong>
              </div>
              <div className="audit-stats-row">
                <span>Minggu Ini</span>
                <strong>{report?.timeline?.thisWeek || 0}</strong>
              </div>
              <div className="audit-stats-row">
                <span>Bulan Ini</span>
                <strong>{report?.timeline?.thisMonth || 0}</strong>
              </div>
            </div>
          </div>

          {/* By Category */}
          <div className="card">
            <h3>Berdasarkan Kategori</h3>
            <div className="audit-category-list">
              {Object.entries(report?.byCategory || {}).map(([category, count]) => (
                <div key={category} className="audit-stats-row">
                  <span>{category}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* By Severity */}
          <div className="card">
            <h3>Berdasarkan Tingkat</h3>
            <div className="audit-severity-list">
              {Object.entries(report?.bySeverity || {}).map(([severity, count]) => (
                <div key={severity} className={`audit-severity-row ${getSeverityClass(severity)}`}>
                  <span className="audit-severity-name">
                    {severity}
                  </span>
                  <strong className="audit-severity-value">{count}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Suspicious Activity */}
          {(report?.suspiciousActivity || []).length > 0 && (
            <div className="card audit-suspicious-card">
              <h3 className="audit-suspicious-title">⚠️ Aktivitas Mencurigakan ({report.suspiciousActivity.length})</h3>
              <div className="audit-suspicious-list">
                {report.suspiciousActivity.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="audit-suspicious-item">
                    <p className="audit-suspicious-action">
                      {formatActionName(item.log.action)}
                    </p>
                    <p className="audit-suspicious-reason">
                      {item.reason}
                    </p>
                    <p className="audit-suspicious-time">
                      {new Date(item.log.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
