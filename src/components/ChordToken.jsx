import React from 'react';

export default function ChordToken({ chord, highlight = false }) {
  return (
    <span style={{
      color: 'var(--primary-color)',
      fontWeight: '700',
      background: highlight ? 'var(--primary-light, rgba(99, 102, 241, 0.1))' : 'transparent',
      padding: highlight ? '2px 6px' : '0',
      borderRadius: highlight ? '3px' : '0',
      transition: 'all 0.2s ease'
    }}>
      {chord}
    </span>
  );
}