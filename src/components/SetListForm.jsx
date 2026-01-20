import React, { useState, useEffect } from 'react';

const SetListForm = ({ setList, onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (setList) {
      setName(setList.name || '');
    } else {
      setName('');
    }
    setError('');
  }, [setList]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Nama setlist harus diisi');
      return;
    }
    if (trimmed.toLowerCase().includes('untitled')) {
      setError('Nama setlist tidak boleh mengandung "untitled"');
      return;
    }
    onSave(trimmed);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <button
          onClick={onCancel}
          className="btn-close"
          style={{ position: 'absolute', top: 18, right: 18, zIndex: 10 }}
          aria-label="Tutup"
        >
          ✕
        </button>
        <div className="modal-header">
          <h2 style={{ marginBottom: 0 }}>
            {setList ? '✏️ Edit Setlist' : '✨ Buat Setlist Baru'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div className="form-group">
            <label htmlFor="name">Nama Setlist *</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              className={error ? 'error' : ''}
              placeholder="Contoh: Lagu Romantis, Playlist Santai"
              autoFocus
            />
            {error && <span className="error-message">{error}</span>}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} title={setList ? 'Update Setlist' : 'Buat Setlist'}>
              💾
            </button>
            <button type="button" onClick={onCancel} className="btn" style={{ flex: 1 }} title="Batal">
              ✕
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SetListForm;
