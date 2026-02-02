import React from 'react';

export default function AIAutofillModal({
  aiResult,
  aiConfirmFields,
  setAiConfirmFields,
  onApply,
  onClose
}) {
  if (!aiResult) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onApply();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--card-bg)',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
          border: '1px solid var(--border-color)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{
          fontSize: '1.3em',
          fontWeight: '700',
          color: 'var(--text-primary)',
          marginTop: 0,
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🤖 Konfirmasi AI Autofill
        </h3>
        
        <p style={{
          fontSize: '0.95em',
          color: 'var(--text-muted)',
          marginBottom: '20px'
        }}>
          Pilih field yang ingin diisi otomatis dari hasil AI:
        </p>
        
        {/* Chord Links */}
        {Array.isArray(aiResult.chordLinks) && aiResult.chordLinks.length > 0 && (
          <div style={{
            marginBottom: '20px',
            padding: '12px',
            background: 'var(--secondary-bg)',
            borderRadius: '6px'
          }}>
            <div style={{
              fontWeight: '600',
              marginBottom: '8px',
              color: 'var(--text-primary)',
              fontSize: '0.95em'
            }}>
              📚 Sumber Chord:
            </div>
            <ul style={{
              paddingLeft: '20px',
              margin: 0
            }}>
              {aiResult.chordLinks.map((cl, idx) => (
                <li key={idx} style={{
                  marginBottom: '4px',
                  fontSize: '0.9em'
                }}>
                  <a
                    href={cl.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: 'var(--primary-color)',
                      textDecoration: 'underline'
                    }}
                  >
                    {cl.title || cl.site}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginBottom: '20px'
          }}>
            {aiResult.artist && (
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px',
                background: 'var(--secondary-bg)',
                borderRadius: '6px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={aiConfirmFields.artist || false}
                  onChange={e => setAiConfirmFields(f => ({...f, artist: e.target.checked}))}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{
                  flex: 1,
                  color: 'var(--text-primary)',
                  fontSize: '0.95em'
                }}>
                  👤 Artist: <span style={{ fontWeight: '600' }}>{aiResult.artist}</span>
                </span>
              </label>
            )}
            
            {aiResult.key && (
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px',
                background: 'var(--secondary-bg)',
                borderRadius: '6px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={aiConfirmFields.key || false}
                  onChange={e => setAiConfirmFields(f => ({...f, key: e.target.checked}))}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{
                  flex: 1,
                  color: 'var(--text-primary)',
                  fontSize: '0.95em'
                }}>
                  🎹 Key: <span style={{ fontWeight: '600' }}>{aiResult.key}</span>
                </span>
              </label>
            )}
            
            {aiResult.tempo && (
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px',
                background: 'var(--secondary-bg)',
                borderRadius: '6px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={aiConfirmFields.tempo || false}
                  onChange={e => setAiConfirmFields(f => ({...f, tempo: e.target.checked}))}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{
                  flex: 1,
                  color: 'var(--text-primary)',
                  fontSize: '0.95em'
                }}>
                  ⏱️ Tempo: <span style={{ fontWeight: '600' }}>{aiResult.tempo} BPM</span>
                </span>
              </label>
            )}
            
            {aiResult.genre && (
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px',
                background: 'var(--secondary-bg)',
                borderRadius: '6px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={aiConfirmFields.genre || false}
                  onChange={e => setAiConfirmFields(f => ({...f, genre: e.target.checked}))}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{
                  flex: 1,
                  color: 'var(--text-primary)',
                  fontSize: '0.95em'
                }}>
                  🎸 Genre: <span style={{ fontWeight: '600' }}>{aiResult.genre}</span>
                </span>
              </label>
            )}
            
            {aiResult.capo !== undefined && aiResult.capo !== null && (
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px',
                background: 'var(--secondary-bg)',
                borderRadius: '6px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={aiConfirmFields.capo || false}
                  onChange={e => setAiConfirmFields(f => ({...f, capo: e.target.checked}))}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{
                  flex: 1,
                  color: 'var(--text-primary)',
                  fontSize: '0.95em'
                }}>
                  📌 Capo: <span style={{ fontWeight: '600' }}>Fret {aiResult.capo}</span>
                </span>
              </label>
            )}
            
            {aiResult.youtubeId && (
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px',
                background: 'var(--secondary-bg)',
                borderRadius: '6px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={aiConfirmFields.youtubeId || false}
                  onChange={e => setAiConfirmFields(f => ({...f, youtubeId: e.target.checked}))}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{
                  flex: 1,
                  color: 'var(--text-primary)',
                  fontSize: '0.95em'
                }}>
                  🎬 YouTube ID: <span style={{ fontWeight: '600', fontSize: '0.85em' }}>{aiResult.youtubeId}</span>
                </span>
              </label>
            )}
            
            {aiResult.lyrics && (
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px',
                background: 'var(--secondary-bg)',
                borderRadius: '6px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={aiConfirmFields.lyrics || false}
                  onChange={e => setAiConfirmFields(f => ({...f, lyrics: e.target.checked}))}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    marginTop: '2px'
                  }}
                />
                <span style={{
                  flex: 1,
                  color: 'var(--text-primary)',
                  fontSize: '0.95em'
                }}>
                  🎤 Lirik: <span style={{ fontWeight: '600', fontStyle: 'italic' }}>
                    {aiResult.lyrics.slice(0, 80)}{aiResult.lyrics.length > 80 ? '...' : ''}
                  </span>
                </span>
              </label>
            )}
            
            {Array.isArray(aiResult.instruments) && aiResult.instruments.length > 0 && (
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px',
                background: 'var(--secondary-bg)',
                borderRadius: '6px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={aiConfirmFields.instruments || false}
                  onChange={e => setAiConfirmFields(f => ({...f, instruments: e.target.checked}))}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{
                  flex: 1,
                  color: 'var(--text-primary)',
                  fontSize: '0.95em'
                }}>
                  🎺 Instrumen: <span style={{ fontWeight: '600' }}>{aiResult.instruments.join(', ')}</span>
                </span>
              </label>
            )}
          </div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '24px'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: 'var(--secondary-bg)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                fontSize: '0.95em',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 20px',
                background: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.95em',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              ✓ Terapkan Pilihan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
