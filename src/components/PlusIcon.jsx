import React from 'react';
export default function PlusIcon({ size = 20, style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style} xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" fill="none"/>
      <rect x="9" y="4" width="2" height="12" rx="1" fill="currentColor"/>
      <rect x="4" y="9" width="12" height="2" rx="1" fill="currentColor"/>
    </svg>
  );
}
