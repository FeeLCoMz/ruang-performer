import React from 'react';

export default function NumberToken({ number }) {
  return (
    <span style={{
      color: 'var(--accent-color, #10b981)',
      fontWeight: '600',
      background: 'var(--accent-light, rgba(16, 185, 129, 0.1))',
      padding: '2px 6px',
      borderRadius: '3px'
    }}>
      {number}
    </span>
  );
}