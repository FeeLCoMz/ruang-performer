import React, { useState, useEffect } from 'react';

export default function SettingsModal({ onClose, onExport, onImport, onKeyboardModeChange }) {
  const [keyboardMode, setKeyboardMode] = useState(() => {
    return localStorage.getItem('keyboardMode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('keyboardMode', keyboardMode);
    if (onKeyboardModeChange) {
      onKeyboardModeChange(keyboardMode);
    }
  }, [keyboardMode, onKeyboardModeChange]);
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
          background: 'linear-gradient(135deg, var(--card) 0%, var(--bg-elevated) 100%)',
          color: 'var(--text)',
          border: '1px solid rgba(var(--primary-rgb, 99, 102, 241), 0.3)',
          boxShadow: 'var(--shadow-xl)',
          borderRadius: '16px',
          padding: '2rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)' }}>⚙️ Pengaturan</h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(var(--primary-rgb, 99, 102, 241), 0.1)',
              color: 'var(--text-secondary)',
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
          <div style={{ borderTop: '1px solid rgba(var(--primary-rgb, 99, 102, 241), 0.2)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>🎹 Musician Profile</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.75rem', background: 'rgba(var(--primary-rgb, 99, 102, 241), 0.05)', borderRadius: '8px', transition: 'all 0.2s' }}>
                <input
                  type="checkbox"
                  checked={keyboardMode}
                  onChange={(e) => setKeyboardMode(e.target.checked)}
                  style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                />
                <span style={{ fontWeight: 500 }}>🎹 Keyboardist Mode</span>
              </label>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', paddingLeft: '2.25rem' }}>
                Optimized interface for keyboard players: chord voicings, hand positions, pedal markings, and octave guidance
              </p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(var(--primary-rgb, 99, 102, 241), 0.2)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>💾 Backup & Restore</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button onClick={onExport} className="btn btn-sm btn-block">
                📥 Backup Database
              </button>
              <label className="btn btn-sm btn-block" style={{ cursor: 'pointer', margin: 0 }}>
                📂 Restore Database
                <input
                  type="file"
                  accept=".json"
                  onChange={onImport}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>
          
          <div style={{ borderTop: '1px solid rgba(var(--primary-rgb, 99, 102, 241), 0.2)', paddingTop: '1rem' }}>
            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>☁️ Sinkronisasi Cloud</h3>
            <div style={{ 
              padding: '1rem', 
              background: 'rgba(16, 185, 129, 0.08)', 
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.6'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.2rem' }}>✓</span>
                <strong style={{ color: 'var(--success)', fontSize: '0.95rem' }}>Sync Otomatis Aktif</strong>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Data Anda secara otomatis disinkronkan ke cloud saat ada perubahan. Jika Anda clear site data, data akan dipulihkan dari cloud saat aplikasi dibuka kembali.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
