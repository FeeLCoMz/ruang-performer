import React, { useEffect } from 'react';

export default function Toast({ message, onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className="toast-notification" role="status" aria-live="polite">
      {message}
    </div>
  );
}
