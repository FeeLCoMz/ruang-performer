import React from 'react';

function TransposeBar({ transpose = 0, setTranspose }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px',
      background: 'var(--secondary-bg)',
      borderRadius: '8px',
      border: '1px solid var(--border-color)'
    }}>
      <span style={{ fontSize: '0.9em', color: 'var(--text-muted)', minWidth: '60px' }}>🎹 Transpose</span>
      <button
        className="btn-base"
        onClick={() => setTranspose(t => t - 1)}
        style={{ padding: '6px 12px', fontSize: '0.9em' }}
        title="Transpose down"
      >
        ↓ -
      </button>
      <span style={{
        minWidth: '40px',
        textAlign: 'center',
        fontSize: '1.1em',
        fontWeight: '600',
        color: transpose === 0 ? 'var(--text-primary)' : 'var(--primary-color)',
        background: 'var(--primary-bg)',
        padding: '6px 8px',
        borderRadius: '4px',
        border: '1px solid var(--border-color)'
      }}>
        {transpose >= 0 ? '+' : ''}{transpose}
      </span>
      <button
        className="btn-base"
        onClick={() => setTranspose(t => t + 1)}
        style={{ padding: '6px 12px', fontSize: '0.9em' }}
        title="Transpose up"
      >
        ↑ +
      </button>
      {transpose !== 0 && (
        <button
          className="btn-base"
          onClick={() => setTranspose(0)}
          style={{ padding: '6px 12px', fontSize: '0.85em', marginLeft: 'auto' }}
          title="Reset transpose"
        >
          Reset
        </button>
      )}
    </div>
  );
}

export default TransposeBar;
