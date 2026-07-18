
/**
 * ChordDisplay.jsx
 *
 * Komponen utama untuk menampilkan lirik lagu beserta notasi chord, angka, dan struktur bagian lagu.
 * Mendukung transposisi chord, zoom tampilan, dan klik timestamp.
 *
 * Props:
 *   - song: { lyrics: string, ... } (objek lagu, wajib ada lyrics)
 *   - transpose: number (opsional, default 0) — jumlah transposisi chord
 *   - zoom: number (opsional, default 1) — skala tampilan
 *   - onTimestampClick: function (opsional) — handler klik timestamp (dalam detik)
 *
 * Fitur utama:
 *   - Parsing otomatis baris lirik menjadi struktur: kosong, section, instrumen, chord, angka, lirik
 *   - Chord dan angka ditampilkan dengan token khusus (bisa di-transpose)
 *   - Timestamp [mm:ss] atau [hh:mm:ss] bisa diklik untuk trigger handler
 *   - Layout responsif dengan CSS class standar
 */

import React, { useState } from 'react';
import NumberToken from './NumberToken.jsx';
import { parseTimestampToken, parseLines, chordTextToNumberText, chordTextToJazzText, chordTextToSimpleText } from '../utils/chordUtils.js';


export default function ChordDisplay({ song, transpose = 0, zoom = 1, showChords = true, showChordNumbers = false, showJazzChords = false, showSimpleChords = false, keySignature = 'C', onTimestampClick, onTimestampPause }) {
  const [isPlaying, setIsPlaying] = useState(false);

  const formatInstrumentPatchText = (lineObj) => {
    const entries = Object.entries(lineObj?.fields || {});
    if (!entries.length) return lineObj?.text || '';
    return entries
      .map(([key, value]) => `${key.charAt(0).toUpperCase()}${key.slice(1)}: ${value}`)
      .join(' | ');
  };

  const formatChordToken = (token) => {
    if (showChordNumbers) return chordTextToNumberText(token, keySignature);
    if (showJazzChords) return chordTextToJazzText(token);
    if (showSimpleChords) return chordTextToSimpleText(token);
    return token;
  };

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
        if (lineObj.type === 'empty')
          return <div key={i} className="cd-empty-line">&nbsp;</div>;
        if (lineObj.type === 'structure')
          return <div key={i} className="cd-section-struct">{lineObj.label}</div>;
        if (lineObj.type === 'instrument')
          return <div key={i} className="cd-section-inst">{lineObj.label}</div>;
        if (lineObj.type === 'modulation')
          return <div key={i} className="cd-modulation">🔄 Modulasi ke {lineObj.label}</div>;
        if (lineObj.type === 'instrument_patch')
          return <div key={i} className="cd-section-inst cd-instrument-patch">{formatInstrumentPatchText(lineObj)}</div>;
        if (lineObj.type === 'metadata')
          return <div key={i} className="cd-metadata">{lineObj.text}</div>;
        if (lineObj.type === 'chord' && showChords)
          return (
            <div key={i} className="cd-chord">
              {lineObj.tokens.map((t, j) =>
                t.isSpace ? (
                  <span key={j}>{t.token}</span>
                ) : t.isBarline ? (
                  <span key={j} className="cd-barline-token">{t.token}</span>
                ) : (
                  <span key={j} className="cd-token">
                    {formatChordToken(t.token)}
                  </span>
                )
              )}
            </div>
          );
        if (lineObj.type === 'chord' && !showChords) {
          return null;
        }
        if (lineObj.type === 'number')
          return (
            <div key={i} className="cd-number">
              {lineObj.tokens.map((t, j) =>
                t.isSpace ? <span key={j}>{t.token}</span> : <NumberToken key={j} number={t.token} />
              )}
            </div>
          );
        // lyrics (default)
        return (
          <div key={i} className="cd-lyrics">
            {lineObj.tokens.map((t, j) => {
              if (t.isChord && !showChords) {
                return null;
              }
              const tokenText = t.isChord ? formatChordToken(t.token) : t.token;
              const seconds = typeof tokenText === 'string' ? parseTimestampToken(tokenText) : null;
              if (seconds !== null) {
                return (
                  <span key={j} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{fontWeight: 600}}>{tokenText}</span>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        if (isPlaying) {
                          onTimestampPause && onTimestampPause();
                        } else {
                          onTimestampClick && onTimestampClick(seconds);
                        }
                        setIsPlaying(!isPlaying);
                      }}
                      style={{ marginLeft: 4, color: 'var(--primary-accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1em' }}
                      title={isPlaying ? 'Pause YouTube' : `Putar ke ${t.token.replace(/\[|\]/g, '')}`}
                    >
                      {isPlaying ? '⏸️' : '▶️'}
                    </button>
                  </span>
                );
              }
              return <span key={j}>{tokenText}</span>;
            })}
          </div>
        );
      })}
    </div>
  );
}