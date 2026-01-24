import React, { useEffect } from 'react';


/**
 * Toast - Individual notification component
 * 
 * @param {string} id - Unique toast ID
 * @param {string} message - Toast message text
 * @param {string} type - Type: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Auto-close duration in ms (0 = no auto-close)
 * @param {function} onClose - Callback when toast closes
 */
export default function Toast({ id, message, type = 'info', duration = 3000, onClose }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <div className={`toast toast-${type}`} role="alert">
      <div className="toast-icon">{getIcon()}</div>
      <div className="toast-message">{message}</div>
      <button
        className="toast-close"
        onClick={() => onClose(id)}
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  );
}
