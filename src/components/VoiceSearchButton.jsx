import React, { useRef } from 'react';

export default function VoiceSearchButton({ onResult, onError, disabled }) {
  const recognitionRef = useRef(null);
  const reportError = (message) => {
    if (typeof onError === 'function') onError(message);
  };

  const handleStart = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      reportError('Browser tidak mendukung fitur pencarian suara.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (onResult) onResult(transcript);
    };
    recognition.onerror = (event) => {
      reportError('Gagal mengenali suara: ' + event.error);
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={handleStart}
      disabled={disabled}
      title="Cari dengan suara"
    >
      <span role="img" aria-label="mic">🎤</span>
    </button>
  );
}
