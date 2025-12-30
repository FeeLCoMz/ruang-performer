import React, { useState, useEffect } from 'react';

const DatabaseStatus = ({ dbStatus, onRefresh }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!dbStatus.enabled) {
    return (
      <div className="db-status disabled">
        <span className="status-dot">⚪</span>
        <span className="status-text">Database Disabled</span>
      </div>
    );
  }

  const statusConfig = {
    loading: { icon: '🔄', text: 'Checking...', color: '#ffa500' },
    ok: { icon: '✅', text: 'Connected', color: '#4caf50' },
    error: { icon: '❌', text: 'Offline', color: '#f44336' }
  };

  let status = 'error';
  if (dbStatus.loading) status = 'loading';
  else if (dbStatus.ok === true) status = 'ok';

  const config = statusConfig[status];

  return (
    <div className="db-status" style={{ borderLeftColor: config.color }}>
      <div 
        className="status-header"
        onClick={() => setShowDetails(!showDetails)}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <span className="status-icon">{config.icon}</span>
        <div className="status-info">
          <span className="status-text">{config.text}</span>
          {dbStatus.error && (
            <span className="status-error" style={{ fontSize: '0.85em', color: '#f44336', display: 'block' }}>
              {dbStatus.error}
            </span>
          )}
          {dbStatus.missingEnv && Object.keys(dbStatus.missingEnv).length > 0 && (
            <span className="status-error" style={{ fontSize: '0.85em', color: '#ff9800', display: 'block' }}>
              Missing: {Object.keys(dbStatus.missingEnv).filter(k => dbStatus.missingEnv[k]).join(', ')}
            </span>
          )}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: '0.8em', opacity: 0.6 }}>
          {showDetails ? '▼' : '▶'}
        </span>
      </div>

      {showDetails && (
        <div className="status-details" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #eee' }}>
          <button 
            onClick={onRefresh} 
            className="btn btn-sm" 
            style={{ width: '100%', marginBottom: 4 }}
            disabled={dbStatus.loading}
          >
            {dbStatus.loading ? '⏳ Refreshing...' : '↻ Refresh Status'}
          </button>
          {status === 'ok' && (
            <p style={{ fontSize: '0.85em', color: '#666', margin: '4px 0' }}>
              Database is online and ready to sync songs.
            </p>
          )}
          {status === 'error' && (
            <p style={{ fontSize: '0.85em', color: '#f44336', margin: '4px 0' }}>
              Unable to connect to database. Check your connection or environment variables.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default DatabaseStatus;
