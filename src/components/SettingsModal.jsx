import React from 'react';

export default function SettingsModal({ onClose, onExport, onImport, onSync, syncingToDb }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(420px, 94vw)',
          maxHeight: '85vh',
          overflow: 'auto',
          background: 'linear-gradient(135deg, #161b26 0%, #1a1f2e 100%)',
          color: '#f8fafc',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          borderRadius: '16px',
          padding: '2rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>⚙️ Pengaturan</h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(99, 102, 241, 0.1)',
              color: '#cbd5e1',
              border: 'none',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            title="Tutup"
          >✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <button onClick={onExport} className="btn btn-sm btn-block">
            📥 Export Database
          </button>
          <label className="btn btn-sm btn-block">
            📤 Import Database
            <input
              type="file"
              accept=".json"
              onChange={onImport}
              style={{ display: 'none' }}
            />
          </label>
          <button 
            onClick={onSync}
            className="btn btn-sm btn-block btn-primary"
            disabled={syncingToDb}
          >
            {syncingToDb ? '⏳ Syncing...' : '☁️ Sync ke DB'}
          </button>
        </div>
      </div>
    </div>
  );
}
