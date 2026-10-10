
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

import React from 'react';
import NumberToken from './NumberToken.jsx';
import { parseTimestampToken, parseLines, chordTextToNumberText, chordTextToJazzText, chordTextToSimpleText } from '../utils/chordUtils.js';

const getInstrumentTokenClass = (label = '') => {
  const normalized = String(label || '').trim().toLowerCase();
  if (!normalized) return 'cd-instrument-token--default';

  if (/(gitar|guitar|bass|ukulele|mandolin)/.test(normalized)) return 'cd-instrument-token--guitar';
  if (/(piano|keyboard|organ|keys|synth|sintet|melodika|pianika)/.test(normalized)) return 'cd-instrument-token--piano';
  if (/(suling|flute|clarinet|sakso|sax|trumpet|terompet|brass|horn|trombone|tuba)/.test(normalized)) return 'cd-instrument-token--wind';
  if (/(drum|drums|perkusi|percussion|tamborin|marakas|cajon|rebana)/.test(normalized)) return 'cd-instrument-token--drums';
  if (/(vokal|voice|choir|vocal|vocalist)/.test(normalized)) return 'cd-instrument-token--vocal';
  if (/(violin|biola|cello|string|strings|kontrabas)/.test(normalized)) return 'cd-instrument-token--strings';
  return 'cd-instrument-token--default';
  };

  export default function ChordDisplay({
    song,
    transpose = 0,
    zoom = 1,
    showChords = true,
    showChordNumbers = false,
    showJazzChords = false,
    showSimpleChords = false,
    keySignature = 'C',
    onTimestampClick,
    onTimestampPause,
    onPresetCueTrigger,
    /**
     * Playback state owned by the parent, which is the only thing that can
     * actually observe the player. When omitted, the button still seeks but
     * never claims to be paused/playing, because a local guess would drift out
     * of sync with the real video (it used to always reset to "not playing").
     */
    isPlaying = false,
  }) {

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
  const effectiveTranspose = showChordNumbers ? 0 : transpose;
  const parsedLines = parseLines(lines, effectiveTranspose);

  const renderPresetCueBadge = (lineObj, key) => {
    const hasMidiProgram = Number.isFinite(Number(lineObj?.midi?.program));
    const midiChannelLabel = Number.isFinite(Number(lineObj?.midi?.channel)) ? `CH ${lineObj.midi.channel}` : null;
    const midiProgramLabel = hasMidiProgram ? `PC ${lineObj.midi.program}` : null;
    const midiBankLabel = Number.isFinite(Number(lineObj?.midi?.bankMsb))
      ? `BANK ${lineObj.midi.bankMsb}/${Number.isFinite(Number(lineObj?.midi?.bankLsb)) ? lineObj.midi.bankLsb : 0}`
      : null;

    return (
      <div key={key} className="cd-preset-cue">
        <span className="cd-preset-cue-label">[{lineObj.label}]</span>
        <span className="cd-preset-cue-meta">
          {midiProgramLabel || 'Manual Cue'}
          {midiChannelLabel ? ` ${midiChannelLabel}` : ''}
          {midiBankLabel ? ` ${midiBankLabel}` : ''}
        </span>
        {typeof onPresetCueTrigger === 'function' ? (
          <button
            type="button"
            className="cd-preset-cue-trigger"
            onClick={() => onPresetCueTrigger(lineObj)}
            title={hasMidiProgram ? 'Kirim Program Change sekarang' : 'Cue ini belum punya Program Change'}
          >
            {hasMidiProgram ? 'Send MIDI' : 'No PC'}
          </button>
        ) : null}
      </div>
    );
  };

  const renderedRows = [];

  parsedLines.forEach((lineObj, i) => {
    if (lineObj?.type === 'preset_cue') {
      renderedRows.push(renderPresetCueBadge(lineObj, `preset-cue-${i}`));
      return;
    }

    if (lineObj.type === 'empty') {
      renderedRows.push(<div key={i} className="cd-empty-line">&nbsp;</div>);
      return;
    }
    if (lineObj.type === 'structure') {
      renderedRows.push(
        <div key={i} className="cd-section-struct">
          <span>{lineObj.label}</span>
          {lineObj.isRepeatedReference ? (
            <span className="cd-section-repeat-badge" title="Bagian ini diambil dari section sebelumnya">
              Repeated
            </span>
          ) : null}
        </div>
      );
      return;
    }
    if (lineObj.type === 'instrument') {
      renderedRows.push(<span key={i} className="cd-instrument-token cd-section-inst">{lineObj.label}</span>);
      return;
    }
    if (lineObj.type === 'modulation') {
      renderedRows.push(<div key={i} className="cd-modulation">🔄 Modulasi ke {lineObj.label}</div>);
      return;
    }
    if (lineObj.type === 'instrument_patch') {
      renderedRows.push(<span key={i} className="cd-instrument-token cd-instrument-patch">{formatInstrumentPatchText(lineObj)}</span>);
      return;
    }
    if (lineObj.type === 'metadata') {
      renderedRows.push(<div key={i} className="cd-metadata">{lineObj.text}</div>);
      return;
    }
    if ((lineObj.type === 'chord' && showChords) || lineObj.type === 'number') {
      if (lineObj.type === 'chord') {
        renderedRows.push(
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
        return;
      }

      renderedRows.push(
        <div key={i} className="cd-number">
          {lineObj.tokens.map((t, j) =>
            t.isSpace ? <span key={j}>{t.token}</span> : <NumberToken key={j} number={t.token} />
          )}
        </div>
      );
      return;
    }
    if (lineObj.type === 'chord' && !showChords) {
      return;
    }

    renderedRows.push(
      <div key={i} className="cd-lyrics">
        {lineObj.tokens.map((t, j) => {
          if (t.isChord && !showChords) {
            return null;
          }
          const tokenText = t.isChord ? formatChordToken(t.token) : t.token;
          const seconds = typeof tokenText === 'string' ? parseTimestampToken(tokenText) : null;
          if (seconds !== null) {
            const canPlay = typeof onTimestampClick === 'function';
            return (
              <span key={j} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{fontWeight: 600}}>{tokenText}</span>
                <button
                  type="button"
                  className="btn"
                  disabled={!canPlay}
                  onClick={() => {
                    if (!canPlay) return;
                    // Pause only when the parent reports real playback; otherwise
                    // seek here. The parent owns the state, so the icon and the
                    // action can no longer drift apart.
                    if (isPlaying && typeof onTimestampPause === 'function') {
                      onTimestampPause();
                    } else {
                      onTimestampClick(seconds);
                    }
                  }}
                  style={{ marginLeft: 4, color: 'var(--primary-accent)', background: 'none', border: 'none', cursor: canPlay ? 'pointer' : 'default', fontSize: '1em', opacity: canPlay ? 1 : 0.4 }}
                  title={
                    !canPlay
                      ? 'Tambahkan YouTube untuk memutar dari sini'
                      : isPlaying
                        ? 'Jeda video'
                        : `Putar ke ${t.token.replace(/\[|\]/g, '')}`
                  }
                >
                  {isPlaying ? '⏸️' : '▶️'}
                </button>
              </span>
            );
          }
          if (t.isCueMark) {
            return <span key={j} className="cd-cue-mark-token">{tokenText}</span>;
          }
          if (t.isInstrument) {
            return <span key={j} className={`cd-instrument-token ${getInstrumentTokenClass(tokenText)}`}>{tokenText}</span>;
          }
          return <span key={j}>{tokenText}</span>;
        })}
      </div>
    );
  });

  return (
    <div className="cd" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
      {renderedRows}
    </div>
  );
}