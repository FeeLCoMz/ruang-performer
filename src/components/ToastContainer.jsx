import React from 'react';
import Toast from './Toast';


/**
 * ToastContainer - Renders all active toast notifications
 * 
 * @param {Array} toasts - Array of toast objects
 * @param {function} onClose - Callback when a toast closes
 */
export default function ToastContainer({ toasts = [], onClose }) {
  return (
    <div className="toast-container" role="region" aria-label="Notifications">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={onClose}
        />
      ))}
    </div>
  );
}
