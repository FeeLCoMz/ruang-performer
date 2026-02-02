import React from 'react';
import { transposeChord as transposeChordUtil, parseChordLine, parseSection, parseNumberLine } from '../utils/chordUtils.js';
import ChordToken from './ChordToken.jsx';
import NumberToken from './NumberToken.jsx';

const transposeChord = transposeChordUtil;

export default function ChordDisplay({ song, transpose = 0, highlightChords = false }) {
  if (!song?.lyrics) {
    return (
      <div className="cd-empty">
        No lyrics available
      </div>
    );
  }

  const lines = song.lyrics.split(/\r?\n/);

  function renderLyricsLine(line, key) {
    const tokens = line.split(/(\s+)/).filter(Boolean);
    return (
      <div key={key} className="cd-lyrics">
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
    <div className="cd">
      {lines.map((line, i) => {
        // Empty line
        if (line.trim() === '') {
          return (
            <div key={i} className="cd-empty-line">
              &nbsp;
            </div>
          );
        }

        // Section markers
        const section = parseSection(line);
        if (section) {
          if (section.type === 'structure') {
            return (
              <div key={i} className="cd-section-struct">
                {section.label}
              </div>
            );
          }
          if (section.type === 'instrument') {
            return (
              <div key={i} className="cd-section-inst">
                {section.label}
              </div>
            );
          }
        }

        // Chord line
        if (parseChordLine(line)) {
          return (
            <div key={i} className="cd-chord">
              {line.split(/(\s+)/).map((token, j) => {
                if (/^\s+$/.test(token)) return <span key={j}>{token}</span>;
                let chord = transpose ? transposeChord(token, transpose) : token;
                return highlightChords ? (
                  <ChordToken key={j} chord={chord} highlight={true} />
                ) : (
                  <span key={j} className="cd-token">
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
            <div key={i} className="cd-number">
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