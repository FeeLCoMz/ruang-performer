import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  filterAuditLogs, 
  generateAuditReport, 
  formatAuditLog,
  formatActionName,
  getSeverityColor 
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
      setError('Failed to load audit logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = filterAuditLogs(logs, filters);

  if (loading) {
    return (
      <div className="page-container">
        <h1 style={{ color: 'var(--text-color)' }}>Loading...</h1>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Audit Log & Activity</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`btn ${view === 'timeline' ? 'active' : ''}`}
            onClick={() => setView('timeline')}
            style={{ 
              background: view === 'timeline' ? 'var(--primary-color)' : 'var(--border-color)',
              color: view === 'timeline' ? 'white' : 'var(--text-color)'
            }}
          >
            Timeline
          </button>
          <button 
            className={`btn ${view === 'stats' ? 'active' : ''}`}
            onClick={() => setView('stats')}
            style={{ 
              background: view === 'stats' ? 'var(--primary-color)' : 'var(--border-color)',
              color: view === 'stats' ? 'white' : 'var(--text-color)'
            }}
          >
            Statistics
          </button>
        </div>
      </div>

      {error && (
        <div className="card card-error">
          <p>{error}</p>
        </div>
      )}

      {view === 'timeline' ? (
        <>
          {/* Filters */}
          <div className="card">
            <h2>Filters</h2>
            <div className="filter-grid">
              <div>
                <label className="form-label">
                  Category
                </label>
                <select 
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="modal-input"
                >
                  <option value="">All Categories</option>
                  <option value="USER">User</option>
                  <option value="BAND">Band</option>
                  <option value="MEMBER">Member</option>
                  <option value="PERMISSION">Permission</option>
                  <option value="SONG">Song</option>
                  <option value="SETLIST">Setlist</option>
                  <option value="SECURITY">Security</option>
                </select>
              </div>

              <div>
                <label className="form-label">
                  Severity
                </label>
                <select 
                  value={filters.severity}
                  onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                  className="modal-input"
                >
                  <option value="">All Levels</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
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
                  <option value="">All Status</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button 
                onClick={() => setFilters({
                  category: '', severity: '', status: '', startDate: '', endDate: ''
                })}
                className="btn reset-filter-btn"
              >
                Clear Filters
              </button>
              <button 
                onClick={fetchAuditLogs}
                className="btn"
                style={{ background: 'var(--primary-color)', color: 'white' }}
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="card">
            <h2>Activity Timeline ({filteredLogs.length} events)</h2>
            <div className="activity-timeline">
              {filteredLogs.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                  No events found
                </p>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className="timeline-item">
                    <div 
                      className="timeline-marker"
                      style={{ background: getSeverityColor(log.severity) }}
                    />
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="action-name" style={{ fontWeight: '600' }}>
                          {formatActionName(log.action)}
                        </span>
                        <span className="timeline-time">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="timeline-meta">
                        <span className="badge" style={{ 
                          background: `${getSeverityColor(log.severity)}20`,
                          color: getSeverityColor(log.severity)
                        }}>
                          {log.severity}
                        </span>
                        <span className="badge" style={{ 
                          background: `var(--primary-color)20`,
                          color: 'var(--primary-color)'
                        }}>
                          {log.category}
                        </span>
                        {log.status === 'failed' && (
                          <span className="badge" style={{ 
                            background: '#ef444420',
                            color: '#ef4444'
                          }}>
                            Failed
                          </span>
                        )}
                      </div>
                      {log.user && (
                        <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: '0.9em' }}>
                          <strong>User:</strong> {log.user}
                        </p>
                      )}
                      {log.band && (
                        <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.9em' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {/* Summary Stats */}
          <div className="card">
            <h3>Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Events</span>
                <strong style={{ fontSize: '1.2em' }}>{report?.totalEvents || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Today</span>
                <strong>{report?.timeline?.today || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>This Week</span>
                <strong>{report?.timeline?.thisWeek || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>This Month</span>
                <strong>{report?.timeline?.thisMonth || 0}</strong>
              </div>
            </div>
          </div>

          {/* By Category */}
          <div className="card">
            <h3>By Category</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(report?.byCategory || {}).map(([category, count]) => (
                <div key={category} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{category}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* By Severity */}
          <div className="card">
            <h3>By Severity</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(report?.bySeverity || {}).map(([severity, count]) => (
                <div key={severity} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  padding: '8px',
                  background: `${getSeverityColor(severity)}10`,
                  borderRadius: '4px'
                }}>
                  <span style={{ 
                    textTransform: 'capitalize',
                    color: getSeverityColor(severity),
                    fontWeight: '500'
                  }}>
                    {severity}
                  </span>
                  <strong style={{ color: getSeverityColor(severity) }}>{count}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Suspicious Activity */}
          {(report?.suspiciousActivity || []).length > 0 && (
            <div className="card" style={{ gridColumn: '1 / -1', borderLeft: '4px solid #ef4444' }}>
              <h3 style={{ color: '#ef4444' }}>⚠️ Suspicious Activity ({report.suspiciousActivity.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {report.suspiciousActivity.slice(0, 5).map((item, idx) => (
                  <div key={idx} style={{ padding: '12px', background: '#fee2e2', borderRadius: '6px' }}>
                    <p style={{ margin: '0 0 4px', fontWeight: '600', color: '#991b1b' }}>
                      {formatActionName(item.log.action)}
                    </p>
                    <p style={{ margin: '0', fontSize: '0.9em', color: '#7f1d1d' }}>
                      {item.reason}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8em', color: '#9ca3af' }}>
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
