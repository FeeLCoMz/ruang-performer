import React, { useState, useEffect } from 'react';

export default function SetlistForm({
  mode = 'create',
  initialData = {},
  onSubmit,
  onCancel,
  loading = false,
  error = '',
  title = '',
  bands = [],
}) {
  const [name, setName] = useState(initialData.name || '');
  const [desc, setDesc] = useState(initialData.desc || '');
  const [bandId, setBandId] = useState(initialData.bandId || '');

  useEffect(() => {
    setName(initialData.name || '');
    setDesc(initialData.desc || '');
    setBandId(initialData.bandId || '');
  }, [initialData]);

  const handleSubmit = e => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), desc: desc.trim(), bandId: bandId || null });
  };

  return (
    <div className="modal-card" onClick={e => e.stopPropagation()}>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '1.3em' }}>{title}</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.95em', fontWeight: '600', color: 'var(--text-primary)' }}>
            📋 Setlist Name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="modal-input"
            placeholder="Enter setlist name..."
            required
            autoFocus
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.95em', fontWeight: '600', color: 'var(--text-primary)' }}>
            📝 Description (Optional)
          </label>
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            className="modal-input"
            placeholder="Add description..."
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.95em', fontWeight: '600', color: 'var(--text-primary)' }}>
            🎸 Band (Optional)
          </label>
          <select
            value={bandId}
            onChange={e => setBandId(e.target.value)}
            className="modal-input"
          >
            <option value="">-- Select Band (Optional) --</option>
            {bands.map(band => (
              <option key={band.id} value={band.id}>{band.name}</option>
            ))}
          </select>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            background: 'rgba(220, 38, 38, 0.1)',
            color: '#dc2626',
            borderRadius: '6px',
            fontSize: '0.9em',
            borderLeft: '3px solid #dc2626'
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn-base"
            onClick={onCancel}
            style={{ background: 'var(--card-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-base"
            disabled={loading || !name.trim()}
            style={{ minWidth: '140px' }}
          >
            {loading ? (mode === 'edit' ? 'Saving...' : 'Creating...') : (mode === 'edit' ? 'Save Changes' : 'Create Setlist')}
          </button>
        </div>
      </form>
    </div>
  );
}
