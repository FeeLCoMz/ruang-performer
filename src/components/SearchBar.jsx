import React from 'react';

export default function SearchBar({ value, onChange, onVoiceSearch, placeholder = "Cari judul atau artist..." }) {
  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      width: '100%'
    }}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{
          flex: 1,
          padding: '10px 14px',
          fontSize: '0.95em',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          background: 'var(--primary-bg)',
          color: 'var(--text-primary)'
        }}
      />
      {onVoiceSearch && (
        <button
          type="button"
          className="btn-base"
          title="Voice search"
          onClick={onVoiceSearch}
          style={{ padding: '10px 14px' }}
        >
          🎤
        </button>
      )}
    </div>
  );
}
