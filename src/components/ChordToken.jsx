import React from 'react';

export default function ChordToken({ chord, highlight = false }) {
  return (
    <span className={highlight ? 'chord-highlight' : ''}>{chord}</span>
  );
}