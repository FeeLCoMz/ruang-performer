import React, { useState } from 'react';

import { askAI } from '../apiClient';

// Simple AI chat UI for song context
export default function AiAssistant({ song, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'system', content: 'Tanya apa saja tentang lagu ini.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    setLoading(true);
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    try {
      const context = song ? `${song.title} - ${song.artist}` : '';
      const res = await askAI({ prompt: input, context });
      setMessages(prev => [...prev, { role: 'assistant', content: res?.response || 'AI tidak memberikan jawaban.' }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Gagal menghubungi AI: ' + err.message }]);
    }
    setLoading(false);
  };

  const openGemini = () => {
    let q = '';
    if (song && song.title) q += song.title;
    if (song && song.artist) q += (q ? ' ' : '') + song.artist;
    const url = q
      ? `https://gemini.google.com/?q=${encodeURIComponent(q)}`
      : 'https://gemini.google.com/';
    window.open(url, '_blank', 'noopener');
  };

  return (
    <div className="aia-container">
      <h3 className="aia-header">
        💬 Chat AI Lagu
        <button
          className="btn btn-sm btn-secondary aia-gemini-btn"
          onClick={openGemini}
          title="Buka Gemini di tab baru"
        >
          Buka Gemini
        </button>
      </h3>
      {song && (
        <div className="aia-song-meta">
          <b>{song.title}</b> <span className="aia-song-artist">by {song.artist}</span>
        </div>
      )}
      <div className="aia-messages">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={
              'aia-message ' +
              (msg.role === 'assistant'
                ? 'aia-message-assistant'
                : msg.role === 'user'
                ? 'aia-message-user'
                : 'aia-message-system')
            }
          >
            <b>{msg.role === 'user' ? 'Anda' : msg.role === 'assistant' ? 'AI' : 'Sistem'}:</b> {msg.content}
          </div>
        ))}
        {loading && <div className="aia-loading">AI sedang mengetik...</div>}
      </div>
      <div className="aia-input-row">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Tulis pertanyaan..."
          className="aia-input"
          disabled={loading}
        />
        <button className="btn btn-primary" onClick={handleSend} disabled={loading || !input.trim()}>
          Kirim
        </button>
      </div>
    </div>
  );
}
