import React from 'react';

export default function ChordToken({ chord, highlight = false }) {
  return (
    <span className={highlight ? 'ct ct-highlight' : 'ct'}>
      {chord}
    </span>
  );
}