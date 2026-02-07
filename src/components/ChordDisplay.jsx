import React from 'react';
import NumberToken from './NumberToken.jsx';
import { transposeChord, parseChordLine, parseSection, parseNumberLine } from '../utils/chordUtils.js';

function parseLines(lines, transpose) {
  return lines.map(line => {
    const trimmed = line.trim();
    if (trimmed === '') return { type: 'empty' };
    const section = parseSection(line);
    if (section) return { type: section.type, label: section.label };
    if (parseChordLine(line)) {
      // Transpose all chord tokens in line
      const tokens = line.split(/(\s+)/).map(token => {
        if (/^\s+$/.test(token)) return { token, isSpace: true };
        return { token: transpose ? transposeChord(token, transpose) : token, isChord: true };
      });
      return { type: 'chord', tokens };
    }
    if (parseNumberLine(line)) {
      const tokens = line.split(/(\s+)/).map(token => {
        if (/^\s+$/.test(token)) return { token, isSpace: true };
        return { token, isNumber: true };
      });
      return { type: 'number', tokens };
    }
    // Lyrics line, tokenize for chord/number inline
    const tokens = line.split(/(\s+)/).map(token => {
      const t = token.trim();
      if (/^\s+$/.test(token)) return { token, isSpace: true };
      if (parseChordLine(t)) return { token: transpose ? transposeChord(t, transpose) : t, isChord: true };
      if (parseNumberLine(t)) return { token, isNumber: true };
      return { token };
    });
    return { type: 'lyrics', tokens };
  });
}

export default function ChordDisplay({ song, transpose = 0, highlightChords = false, zoom = 1 }) {
  if (!song?.lyrics) {
    return (
      <div className="cd-empty">
        No lyrics available
      </div>
    );
  }

  const lines = song.lyrics.split(/\r?\n/);
  const parsedLines = parseLines(lines, transpose);

  return (
    <div className="cd" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
      {parsedLines.map((lineObj, i) => {
        switch (lineObj.type) {
          case 'empty':
            return <div key={i} className="cd-empty-line">&nbsp;</div>;
          case 'structure':
            return <div key={i} className="cd-section-struct">{lineObj.label}</div>;
          case 'instrument':
            return <div key={i} className="cd-section-inst">{lineObj.label}</div>;
          case 'chord':
            return (
              <div key={i} className="cd-chord">
                {lineObj.tokens.map((t, j) =>
                  t.isSpace ? <span key={j}>{t.token}</span> :
                  highlightChords ? <ChordToken key={j} chord={t.token} highlight={true} /> : <span key={j} className="cd-token">{t.token}</span>
                )}
              </div>
            );
          case 'number':
            return (
              <div key={i} className="cd-number">
                {lineObj.tokens.map((t, j) =>
                  t.isSpace ? <span key={j}>{t.token}</span> : <NumberToken key={j} number={t.token} />
                )}
              </div>
            );
          case 'lyrics':
            return (
              <div key={i} className="cd-lyrics">
                {lineObj.tokens.map((t, j) => (
                  <span key={j}>{t.token}</span>
                ))}
              </div>
            );
          default:
            return <div key={i}>{lineObj.tokens.map((t, j) => <span key={j}>{t.token}</span>)}</div>;
        }
      })}
    </div>
  );
}