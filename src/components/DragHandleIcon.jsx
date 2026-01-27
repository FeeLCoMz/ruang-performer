// Drag and drop icon for UI
import React from 'react';
export default function DragHandleIcon({ size = 20, style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style} xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
      <circle cx="7" cy="13" r="1.5" fill="currentColor"/>
      <circle cx="13" cy="7" r="1.5" fill="currentColor"/>
      <circle cx="13" cy="13" r="1.5" fill="currentColor"/>
    </svg>
  );
}
