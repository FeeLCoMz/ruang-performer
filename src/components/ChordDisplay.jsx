
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

const BARLINE_REGEX = /^(\|:|:\||\[\:|:\]|\|\||\|)$/;

const parseBeatsPerBar = (timeSignature) => {
  const match = String(timeSignature || '4/4').trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) return 4;
  const numerator = Number(match[1]);
  if (!Number.isFinite(numerator) || numerator <= 0) return 4;
  return Math.max(1, Math.min(12, numerator));
};

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

const getSecondaryAccentBeatSet = (timeSignature, beatsPerBar) => {
  const normalized = String(timeSignature || '').replace(/\s+/g, '');
  if (normalized === '6/8' && beatsPerBar >= 4) return new Set([3]);
  if (normalized === '12/8' && beatsPerBar >= 10) return new Set([3, 6, 9]);
  if (normalized === '4/4' && beatsPerBar >= 3) return new Set([2]);
  return new Set();
};

const splitCompactChordToken = (token) => {
  if (typeof token !== 'string' || !token.includes('..')) return [token];
  return token
    .split(/\.{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
};

const buildMeasuresFromChordTokens = (tokens) => {
  const compact = Array.isArray(tokens) ? tokens.filter((token) => !token?.isSpace) : [];
  if (!compact.length) return [];

  const hasBarline = compact.some((token) => token?.isBarline || BARLINE_REGEX.test(token?.token || ''));
  const normalizeMeasureTokens = (measureTokens) => {
    const expanded = [];
    measureTokens.forEach((token) => {
      const parts = splitCompactChordToken(token?.token || '');
      if (parts.length > 1) {
        parts.forEach((part) => expanded.push({ ...token, token: part }));
      } else {
        expanded.push(token);
      }
    });
    return expanded;
  };

  if (hasBarline) {
    const measures = [];
    let currentMeasure = [];

    compact.forEach((token) => {
      const isBarline = token?.isBarline || BARLINE_REGEX.test(token?.token || '');
      if (isBarline) {
        if (currentMeasure.length) {
          measures.push(normalizeMeasureTokens(currentMeasure));
          currentMeasure = [];
        }
        return;
      }
      currentMeasure.push(token);
    });

    if (currentMeasure.length) {
      measures.push(normalizeMeasureTokens(currentMeasure));
    }

    return measures;
  }

  const chordLikeTokens = compact.filter((token) => token?.isChord || token?.isNumber);
  if (!chordLikeTokens.length) {
    return [normalizeMeasureTokens(compact)];
  }

  return chordLikeTokens.map((token) => normalizeMeasureTokens([token]));
};

const buildBeatSlotsFromMeasureTokens = (measureTokens, beatsPerBar) => {
  const totalBeats = Math.max(1, Number(beatsPerBar) || 4);
  const slots = Array.from({ length: totalBeats }, () => ({ chords: [], texts: [] }));
  const chordTokens = (Array.isArray(measureTokens) ? measureTokens : []).filter((token) => token?.isChord || token?.isNumber);

  if (!chordTokens.length) {
    return slots;
  }

  const hasDotStepper = chordTokens.some((token) => /^\.$/.test(String(token?.token || '').trim()));

  if (!hasDotStepper) {
    chordTokens.forEach((token, idx) => {
      const beatIndex = Math.min(idx, totalBeats - 1);
      slots[beatIndex].chords.push(token.token);
    });
    return slots;
  }

  let beatCursor = 0;
  chordTokens.forEach((token) => {
    const raw = String(token?.token || '').trim();
    if (!raw) return;

    if (raw === '.') {
      beatCursor = Math.min(totalBeats, beatCursor + 1);
      return;
    }

    const targetBeat = Math.min(Math.max(0, beatCursor), totalBeats - 1);
    slots[targetBeat].chords.push(raw);
    beatCursor = Math.min(totalBeats, beatCursor + 1);
  });

  return slots;
};


export default function ChordDisplay({ song, transpose = 0, zoom = 1, showChords = true, showChordNumbers = false, showJazzChords = false, showSimpleChords = false, keySignature = 'C', onTimestampClick, onTimestampPause, onPresetCueTrigger, layoutMode = 'lyrics', currentBeat = 0, timeSignature = '4/4', barGridColumns = 'auto', barGridFocusMode = false }) {
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
  const effectiveTranspose = showChordNumbers ? 0 : transpose;
  const parsedLines = parseLines(lines, effectiveTranspose);
  const beatsPerBar = parseBeatsPerBar(timeSignature);
  const secondaryAccents = getSecondaryAccentBeatSet(timeSignature, beatsPerBar);
  const activeBeat = Number.isFinite(Number(currentBeat))
    ? ((Number(currentBeat) % beatsPerBar) + beatsPerBar) % beatsPerBar
    : 0;
  const normalizedColumns = ['auto', '2', '4'].includes(String(barGridColumns))
    ? String(barGridColumns)
    : 'auto';

  const shouldHideLineInFocusMode = (lineObj) => {
    if (!barGridFocusMode || layoutMode !== 'bar-grid') return false;
    return ['lyrics', 'metadata', 'instrument', 'instrument_patch', 'number', 'empty'].includes(lineObj?.type);
  };

  const renderPresetCueBadge = (lineObj, key, inlineForGrid = false) => {
    const hasMidiProgram = Number.isFinite(Number(lineObj?.midi?.program));
    const midiChannelLabel = Number.isFinite(Number(lineObj?.midi?.channel)) ? `CH ${lineObj.midi.channel}` : null;
    const midiProgramLabel = hasMidiProgram ? `PC ${lineObj.midi.program}` : null;
    const midiBankLabel = Number.isFinite(Number(lineObj?.midi?.bankMsb))
      ? `BANK ${lineObj.midi.bankMsb}/${Number.isFinite(Number(lineObj?.midi?.bankLsb)) ? lineObj.midi.bankLsb : 0}`
      : null;

    return (
      <div key={key} className={`cd-preset-cue${inlineForGrid ? ' cd-preset-cue-inline' : ''}`}>
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
  let pendingPresetCue = null;

  parsedLines.forEach((lineObj, i) => {
    if (lineObj?.type === 'preset_cue') {
      if (layoutMode === 'bar-grid') {
        pendingPresetCue = lineObj;
      } else {
        renderedRows.push(renderPresetCueBadge(lineObj, `preset-cue-${i}`));
      }
      return;
    }

    if (shouldHideLineInFocusMode(lineObj)) {
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
      if (layoutMode === 'bar-grid') {
        const isNumberLine = lineObj.type === 'number';
        renderedRows.push(
          <div key={i} className="cd-chord-grid-block">
            {pendingPresetCue ? renderPresetCueBadge(pendingPresetCue, `pending-preset-cue-${i}`, true) : null}
            <div className="cd-chord cd-chord-grid-line">
              {buildMeasuresFromChordTokens(lineObj.tokens).map((measureTokens, measureIdx) => (
                <div key={`${i}-${measureIdx}`} className="cd-bar-measure">
                  <div className="cd-bar-beat-markers" aria-hidden="true">
                    {Array.from({ length: beatsPerBar }, (_, beatIdx) => (
                      <span
                        key={`${i}-${measureIdx}-${beatIdx}`}
                        className={`cd-bar-beat-led${activeBeat === beatIdx ? ' is-active' : ''}${beatIdx === 0 ? ' is-downbeat' : ''}${secondaryAccents.has(beatIdx) ? ' is-sub-accent' : ''}`}
                      />
                    ))}
                  </div>
                  <div className="cd-bar-chords">
                    {buildBeatSlotsFromMeasureTokens(measureTokens, beatsPerBar).map((slot, beatIdx) => {
                      const chordText = slot.chords
                        .map((chord) => isNumberLine ? chord : formatChordToken(chord))
                        .filter(Boolean)
                        .join(' / ');

                      return (
                        <span
                          key={`${i}-${measureIdx}-beat-${beatIdx}`}
                          className={`cd-bar-beat-cell${chordText ? ' cd-bar-beat-cell--occupied' : ''}`}
                        >
                          {chordText || '·'}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
        pendingPresetCue = null;
        return;
      }

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
      pendingPresetCue = null;
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

  if (pendingPresetCue) {
    renderedRows.push(renderPresetCueBadge(pendingPresetCue, 'pending-preset-cue-tail', layoutMode === 'bar-grid'));
  }

  return (
    <div className={`cd ${layoutMode === 'bar-grid' ? 'cd-layout-bar-grid' : ''} ${layoutMode === 'bar-grid' ? `cd-layout-bar-grid-cols-${normalizedColumns}` : ''} ${barGridFocusMode && layoutMode === 'bar-grid' ? 'cd-layout-bar-grid-focus' : ''}`} style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
      {renderedRows}
    </div>
  );
}