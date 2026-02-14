
import React from 'react';
import NumberToken from './NumberToken.jsx';
import { transposeChord, parseSection, parseNumberLine, isChordLine, parseTimestampToken, parseLines } from '../utils/chordUtils.js';


/**
 * Komponen ChordDisplay
 * Menampilkan lirik lagu beserta notasi chord, angka, dan struktur bagian lagu.
 * Mendukung transposisi chord dan zoom tampilan.
 *
 * Props:
 * @param {Object} song - Objek lagu, harus memiliki properti 'lyrics' (string)
 * @param {number} [transpose=0] - Jumlah transposisi chord (positif/negatif)
 * @param {number} [zoom=1] - Skala zoom tampilan (1 = normal)
 * @param {function} [onTimestampClick] - Handler saat timestamp diklik (detik)
 *
 * Fitur:
 * - Parsing baris lirik menjadi struktur: kosong, struktur, instrumen, chord, angka, lirik
 * - Chord dan angka ditampilkan dengan token khusus
 * - Mendukung transposisi chord secara otomatis
 * - Layout responsif dengan CSS class standar
 */

/**
 * Mem-parse array baris lirik menjadi struktur token untuk rendering.
 * @param {string[]} lines - Array baris lirik
 * @param {number} transpose - Jumlah transposisi chord
 * @returns {Array} Array objek baris terstruktur
 */

export default function ChordDisplay({ song, transpose = 0, zoom = 1, onTimestampClick }) {
  // Jika tidak ada lirik, tampilkan pesan kosong
  if (!song?.lyrics) {
    return (
      <div className="cd-empty">
        No lyrics available
      </div>
    );
  }

  // Pisahkan lirik menjadi baris, lalu parse
  const lines = song.lyrics.split(/\r?\n/);
  const parsedLines = parseLines(lines, transpose);

  // Render setiap baris sesuai tipenya
  return (
    <div className="cd" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
      {parsedLines.map((lineObj, i) => {
        if (lineObj.type === 'empty')
          return <div key={i} className="cd-empty-line">&nbsp;</div>;
        if (lineObj.type === 'structure')
          return <div key={i} className="cd-section-struct">{lineObj.label}</div>;
        if (lineObj.type === 'instrument')
          return <div key={i} className="cd-section-inst">{lineObj.label}</div>;
        if (lineObj.type === 'chord')
          return (
            <div key={i} className="cd-chord">
              {lineObj.tokens.map((t, j) =>
                t.isSpace ? <span key={j}>{t.token}</span> :
                <span key={j} className="cd-token">{t.token}</span>
              )}
            </div>
          );
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
              const seconds = typeof t.token === 'string' ? parseTimestampToken(t.token) : null;
              if (seconds !== null) {
                return (
                  <button
                    key={j}
                    className="cd-timestamp-btn"
                    type="button"
                    onClick={() => onTimestampClick && onTimestampClick(seconds)}
                    style={{ color: 'var(--primary-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                    title={`Putar ke ${t.token.replace(/\[|\]/g, '')}`}
                  >
                    {t.token}
                  </button>
                );
              }
              return <span key={j}>{t.token}</span>;
            })}
          </div>
        );
      })}
    </div>
  );
}