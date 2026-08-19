import React from 'react';

export default function ExpandButton({
  isExpanded,
  setIsExpanded,
  icon = '⏲️',
  label = 'Toggle',
  badge = null,
  rightContent = null,
  ariaLabel = null,
  className = ''
}) {
  return (
    <button
      type="button"
      onClick={() => setIsExpanded(!isExpanded)}
      className={`expand-button ${isExpanded ? 'expanded' : ''} ${className}`.trim()}
      aria-label={ariaLabel || `${isExpanded ? 'Tutup' : 'Buka'} ${label}`}
      aria-expanded={isExpanded}
    >
      <span className="expand-button-left">
        <span>{isExpanded ? '▼' : '▶'}</span>
        <span>{icon} {label}</span>
        {badge && (
          <span className="expand-button-badge">
            {badge}
          </span>
        )}
      </span>
      {rightContent && <span className="expand-button-right">{rightContent}</span>}
    </button>
  );
}
