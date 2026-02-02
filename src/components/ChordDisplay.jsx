import React from 'react';
import { transposeChord as transposeChordUtil, parseChordLine, parseSection, parseNumberLine } from '../utils/chordUtils.js';
import ChordToken from './ChordToken.jsx';
import NumberToken from './NumberToken.jsx';

const transposeChord = transposeChordUtil;

export default function ChordDisplay({ song, transpose = 0, highlightChords = false }) {
  if (!song?.lyrics) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: 'var(--text-muted)',
        fontStyle: 'italic'
      }}>
        No lyrics available
      </div>
    );
  }

  const lines = song.lyrics.split(/\r?\n/);

  function renderLyricsLine(line, key) {
    const tokens = line.split(/(\s+)/).filter(Boolean);
    return (
      <div key={key} style={{ minHeight: '1.5em', whiteSpace: 'pre-wrap' }}>
        {tokens.map((token, idx) => {
          const trimmed = token.trim();
          if (parseChordLine(trimmed)) {
            let chord = transpose ? transposeChord(trimmed, transpose) : trimmed;
            return <ChordToken key={idx} chord={chord} highlight={highlightChords} />;
          }
          if (parseNumberLine(trimmed)) {
            return <NumberToken key={idx} number={token} />;
          }
          return <span key={idx}>{token}</span>;
        })}
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: 'var(--font-mono, "Courier New", monospace)',
      fontSize: '1em',
      lineHeight: '1.8',
      color: 'var(--text-primary)',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word'
    }}>
      {lines.map((line, i) => {
        // Empty line
        if (line.trim() === '') {
          return (
            <div key={i} style={{ minHeight: '1.5em' }}>
              &nbsp;
            </div>
          );
        }

        // Section markers
        const section = parseSection(line);
        if (section) {
          if (section.type === 'structure') {
            return (
              <div key={i} style={{
                margin: '16px 0 8px 0',
                padding: '8px 12px',
                background: 'var(--primary-color)',
                color: 'white',
                borderRadius: '4px',
                fontWeight: '700',
                fontSize: '0.95em',
                display: 'inline-block'
              }}>
                {section.label}
              </div>
            );
          }
          if (section.type === 'instrument') {
            return (
              <div key={i} style={{
                margin: '12px 0 6px 0',
                padding: '6px 10px',
                background: 'var(--secondary-bg)',
                color: 'var(--primary-color)',
                borderLeft: '3px solid var(--primary-color)',
                fontWeight: '600',
                fontSize: '0.9em',
                fontStyle: 'italic'
              }}>
                {section.label}
              </div>
            );
          }
        }

        // Chord line
        if (parseChordLine(line)) {
          return (
            <div key={i} style={{
              whiteSpace: 'pre',
              marginBottom: '4px',
              minHeight: '1.5em'
            }}>
              {line.split(/(\s+)/).map((token, j) => {
                if (/^\s+$/.test(token)) return <span key={j}>{token}</span>;
                let chord = transpose ? transposeChord(token, transpose) : token;
                return highlightChords ? (
                  <ChordToken key={j} chord={chord} highlight={true} />
                ) : (
                  <span key={j} style={{ color: 'var(--primary-color)', fontWeight: '600' }}>
                    {chord}
                  </span>
                );
              })}
            </div>
          );
        }

        // Number notation line
        if (parseNumberLine(line)) {
          return (
            <div key={i} style={{
              whiteSpace: 'pre',
              marginBottom: '4px',
              minHeight: '1.5em'
            }}>
              {line.split(/(\s+)/).map((token, j) => {
                if (/^\s+$/.test(token)) return <span key={j}>{token}</span>;
                return <NumberToken key={j} number={token} />;
              })}
            </div>
          );
        }

        // Regular lyrics line
        return renderLyricsLine(line, i);
      })}
    </div>
  );
}