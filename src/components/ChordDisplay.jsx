import React from 'react';
import { transposeChord as transposeChordUtil, getNoteIndex, parseChordLine, parseSection, parseNumberLine } from '../utils/chordUtils.js';
import ChordToken from './ChordToken.jsx';
import NumberToken from './NumberToken.jsx';

// Gunakan langsung transposeChordUtil dari chordUtils
const transposeChord = transposeChordUtil;

export default function ChordDisplay({ song, transpose = 0, highlightChords = false }) {
  if (!song || !song.lyrics) return <div>Tidak ada lirik</div>;
  const lines = song.lyrics.split(/\r?\n/);

  // Fungsi render line dengan komponen token modular
  function renderLyricsLine(line, key) {
    const tokens = line.split(/(\s+)/).filter(Boolean);
    return (
      <span key={key} className="lyrics-line">
        {tokens.map((token, idx) => {
          const trimmed = token.trim();
          if (parseChordLine(trimmed)) {
            let chord = transpose ? transposeChord(trimmed, transpose) : trimmed;
            return <ChordToken key={idx} chord={chord} highlight={true} />;
          }
          if (parseNumberLine(trimmed)) {
            return <NumberToken key={idx} number={token} />;
          }
          return token;
        })}
      </span>
    );
  }

  return (
    <div className="chord-display">
      <pre>
        {lines.map((line, i) => {
          if (line.trim() === '') {
            // Baris kosong, render span kosong agar tetap terlihat
            return <span key={i} className="lyrics-line-empty">&nbsp;</span>;
          }
          const section = parseSection(line);
          if (section) {
            if (section.type === 'structure') {
              return (
                <span key={i} className="structure-marker">
                  <span className="structure-label">{section.label}</span>
                </span>
              );
            }
            if (section.type === 'instrument') {
              return (
                <span key={i} className="instrument-highlight">
                  {section.label}
                </span>
              );
            }
          }
          if (parseChordLine(line)) {
            // Render chord line per karakter agar spasi tetap
            return (
              <span key={i} className="chord-line" style={{ whiteSpace: 'pre' }}>
                {line.split(/(\s+)/).map((token, j) => {
                  if (/^\s+$/.test(token)) return token;
                  let chord = transpose ? transposeChord(token, transpose) : token;
                  return highlightChords ? <ChordToken key={j} chord={chord} highlight={true} /> : chord;
                })}
              </span>
            );
          } else if (parseNumberLine(line)) {
            // Render not angka line per karakter agar spasi tetap
            return (
              <span key={i} className="number-line" style={{ whiteSpace: 'pre' }}>
                {line.split(/(\s+)/).map((token, j) => {
                  if (/^\s+$/.test(token)) return token;
                  return <NumberToken key={j} number={token} />;
                })}
              </span>
            );
          } else {
            // Render lirik biasa dengan highlight chord/not angka per token
            return renderLyricsLine(line, i);
          }
        })}
      </pre>
    </div>
  );
}