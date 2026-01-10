import React, { useState } from 'react';
import { askAI } from '../apiClient';

export default function AiAssistant({ onClose, song }) {
  const [prompt, setPrompt] = useState('Sarankan progresi chord yang cocok dan perbaiki format ChordPro.');
  const [useContext, setUseContext] = useState(true);
  const [model, setModel] = useState('gemini-2.5-flash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  const context = song ? [
    song.title ? `Judul: ${song.title}` : '',
    song.artist ? `Artis: ${song.artist}` : '',
    song.key ? `Key: ${song.key}` : '',
    song.lyrics ? `Lirik:\n${song.lyrics}` : '',
  ].filter(Boolean).join('\n') : '';

  const system = 'Anda adalah asisten musik untuk aplikasi chord & lirik. Jawab ringkas, berikan output yang mudah di-copy. Jika diminta format ChordPro, gunakan tag {title}, {artist}, {key}, dan chord di dalam [].';

  const handleAsk = async () => {
    setLoading(true);
    setError('');
    setResult('');
    try {
      const resp = await askAI({ prompt, context: useContext ? context : '', system, model });
      setResult(resp.text || '(kosong)');
    } catch (e) {
      setError(e.message || 'Gagal memanggil AI');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(720px, 96vw)', maxHeight: '85vh', overflow: 'auto', background: 'linear-gradient(135deg, #161b26 0%, #1a1f2e 100%)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0 }}>🤖 AI Assistant</h2>
          <button onClick={onClose} className="btn btn-xs">✕</button>
        </div>

        {song && (
          <div style={{ marginBottom: '0.75rem', color: '#94a3b8', fontSize: '0.9rem' }}>
            Konteks lagu: <strong>{song.title}</strong>{song.artist ? ` • ${song.artist}` : ''}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
          <select value={model} onChange={e => setModel(e.target.value)} className="setlist-select" style={{ maxWidth: 220 }}>
            <option value="gemini-2.5-flash">Gemini 2.5 Flash (cepat)</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro (lebih cerdas)</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#cbd5e1' }}>
            <input type="checkbox" checked={useContext} onChange={e => setUseContext(e.target.checked)} />
            Sertakan konteks lagu
          </label>
        </div>

        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={3}
          placeholder="Tulis pertanyaan atau perintah untuk AI..."
          style={{ width: '100%', resize: 'vertical', background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem' }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button onClick={handleAsk} className={`btn btn-sm ${loading ? '' : 'btn-primary'}`} disabled={loading}>
            {loading ? '⏳ Memproses...' : 'Kirim ke AI'}
          </button>
        </div>

        {error && (
          <div style={{ marginTop: '0.75rem', color: '#f87171' }}>{error}</div>
        )}

        {result && (
          <pre style={{ marginTop: '0.75rem', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem', whiteSpace: 'pre-wrap' }}>{result}</pre>
        )}
      </div>
    </div>
  );
}
