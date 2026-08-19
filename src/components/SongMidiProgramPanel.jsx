import React, { useState } from 'react';
import ExpandButton from './ExpandButton.jsx';

export default function SongMidiProgramPanel({
  isSupported,
  isAccessGranted,
  outputs,
  selectedOutputId,
  setSelectedOutputId,
  isEnabled,
  setIsEnabled,
  requestAccess,
  cueCount = 0,
  autoCueLabel = '',
  lastMessage = '',
  performanceMode = false,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="song-midi-panel" role="region" aria-label="Preset Cue MIDI">
      <div className="song-midi-panel-header">
        <ExpandButton
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
          icon="🎹"
          label="Preset Cue MIDI"
          badge={cueCount > 0 ? cueCount : null}
          ariaLabel={isExpanded ? 'Sembunyikan Preset Cue MIDI' : 'Tampilkan Preset Cue MIDI'}
        />
        {!performanceMode && (
          <span className={`song-midi-support-badge ${isSupported ? 'is-supported' : 'is-unsupported'}`}>
            {isSupported ? 'Web MIDI Ready' : 'Web MIDI Unsupported'}
          </span>
        )}
      </div>

      <div className="song-midi-panel-body" style={{ display: isExpanded ? 'block' : 'none' }}>
        <div className="song-midi-panel-controls">
          <button
            type="button"
            className="btn btn-secondary song-midi-connect-btn"
            onClick={requestAccess}
            disabled={!isSupported}
          >
            {isAccessGranted ? 'Refresh MIDI' : 'Connect MIDI'}
          </button>

          <label className="song-midi-select-wrap" htmlFor="song-midi-output-select">
            <span className="song-midi-label">Output</span>
            <select
              id="song-midi-output-select"
              className="song-midi-output-select"
              value={selectedOutputId || ''}
              onChange={(event) => setSelectedOutputId(event.target.value)}
              disabled={!isSupported || !isAccessGranted || outputs.length === 0}
            >
              {outputs.length === 0 ? (
                <option value="">No MIDI Output</option>
              ) : (
                outputs.map((output) => (
                  <option key={output.id} value={output.id}>
                    {output.manufacturer ? `${output.manufacturer} - ` : ''}
                    {output.name}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="song-midi-toggle-wrap">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(event) => setIsEnabled(event.target.checked)}
              disabled={!isSupported || !isAccessGranted}
            />
            <span>Auto Program Change</span>
          </label>
        </div>

        <div className="song-midi-panel-info">
          <span className="song-midi-panel-count">Cue terdeteksi: {cueCount}</span>
          {autoCueLabel ? <span className="song-midi-panel-cue">Auto saat pindah lagu: [{autoCueLabel}]</span> : null}
        </div>

        {lastMessage ? <p className="song-midi-panel-message">{lastMessage}</p> : null}
      </div>
    </div>
  );
}
