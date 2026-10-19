
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

import React, { memo, useMemo, useEffect, useRef, useState } from 'react';
import NumberToken from './NumberToken.jsx';
import { parseTimestampToken, parseLines, chordTextToNumberText, chordTextToJazzText, chordTextToSimpleText } from '../utils/chordUtils.js';

// Icon per seksi lagu, dicocokkan dari label seksi (mis. "[Chorus]").
const SECTION_ICONS = [
  { icon: '🎬', pattern: /intro|opening|\bint\b/i },
  { icon: '🎤', pattern: /verse|bait/i },
  { icon: '⭐', pattern: /pre[- ]?chorus/i },
  { icon: '🔁', pattern: /chorus|reff|refrain/i },
  { icon: '🌉', pattern: /bridge/i },
  { icon: '🎸', pattern: /solo|instrumental|interlude|musik/i },
  { icon: '🏁', pattern: /outro|ending|coda/i },
];

const getSectionIcon = (label = '') => {
  const hit = SECTION_ICONS.find((entry) => entry.pattern.test(String(label)));
  return hit ? hit.icon : '🎵';
};

/**
 * Gaya chord yang bisa dipilih dari panel lirik.
 * Satu pilihan untuk SEMUA chord — berbeda dengan tiga flag lama
 * (showChordNumbers/showJazzChords/showSimpleChords) yang saling menimpa
 * dan bisa aktif bersamaan.
 */
export const CHORD_STYLES = {
  DEFAULT: 'DEFAULT',
  SIMPLE: 'SIMPLE',
  JAZZ: 'JAZZ',
  NUMBER: 'NUMBER',
};

export const CHORD_STYLE_OPTIONS = [
  { value: CHORD_STYLES.DEFAULT, label: 'Default' },
  { value: CHORD_STYLES.SIMPLE, label: 'Simple' },
  { value: CHORD_STYLES.JAZZ, label: 'Jazz' },
  { value: CHORD_STYLES.NUMBER, label: 'Angka' },
];

export const normalizeChordStyle = (value, fallback = CHORD_STYLES.DEFAULT) =>
  CHORD_STYLE_OPTIONS.some((option) => option.value === value) ? value : fallback;

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

const ChordDisplayBase = memo(function ChordDisplay({
    song,
    transpose = 0,
    zoom = 1,
    showChords = true,
    showLyrics = true,
    showChordNumbers = false,
    showJazzChords = false,
    showSimpleChords = false,
    // Gaya chord tunggal (Default | Simple | Jazz | Angka). Bila kosong,
    // fallback ke flag lama supaya pemakai lama tetap jalan.
    chordStyle = '',
    keySignature = 'C',
    onTimestampClick,
    onTimestampPause,
    /**
     * Playback state owned by the parent, which is the only thing that can
     * actually observe the player. When omitted, the button still seeks but
     * never claims to be paused/playing, because a local guess would drift out
     * of sync with the real video (it used to always reset to "not playing").
     */
    isPlaying = false,
    /**
     * 1-based source line the caret is on. Rows parsed from that line get
     * highlighted so the editor and preview stay visibly in sync.
     */
    activeLine = null,
    /** Mode fokus: kunci bagian aktif — baris di luar bagian itu diredupkan. */
    focusSectionKey = null,
  /**
   * Skala font dari tombol A-/A+; diterapkan sebagai CSS var di induk
   * (SongChordsLyricsDisplay), tidak mengubah ukuran font di sini.
   */
    fontScale = 1,
  }) {

  const formatInstrumentPatchText = (lineObj) => {
    const entries = Object.entries(lineObj?.fields || {});
    if (!entries.length) return lineObj?.text || '';
    return entries
      .map(([key, value]) => `${key.charAt(0).toUpperCase()}${key.slice(1)}: ${value}`)
      .join(' | ');
  };

  const resolvedChordStyle = chordStyle
    ? normalizeChordStyle(chordStyle)
    : (showChordNumbers
      ? CHORD_STYLES.NUMBER
      : showJazzChords
        ? CHORD_STYLES.JAZZ
        : showSimpleChords
          ? CHORD_STYLES.SIMPLE
          : CHORD_STYLES.DEFAULT);
  const showNumberNotation = resolvedChordStyle === CHORD_STYLES.NUMBER;

  const formatChordToken = (token) => {
    if (resolvedChordStyle === CHORD_STYLES.NUMBER) return chordTextToNumberText(token, keySignature);
    if (resolvedChordStyle === CHORD_STYLES.JAZZ) return chordTextToJazzText(token);
    if (resolvedChordStyle === CHORD_STYLES.SIMPLE) return chordTextToSimpleText(token);
    return token;
  };

  /**
   * A clickable timestamp with its play/pause button.
   *
   * Shared by every line type: a timestamp can appear on a lyrics line, a chord
   * grid, or even alongside a section tag, and previously only the lyrics branch
   * rendered the button — so "[01:23] | C | G |" was silently unplayable.
   */
  const renderTimestampToken = (rawToken, seconds, key) => {
    const canPlay = typeof onTimestampClick === 'function';
    const label = String(rawToken).replace(/\[|\]/g, '');
    return (
      <span key={key} className="cd-timestamp">
        <span className="cd-timestamp-label">{label}</span>
        <button
          type="button"
          className="btn cd-timestamp-btn"
          disabled={!canPlay}
          onClick={() => {
            if (!canPlay) return;
            // Pause only when the parent reports real playback; otherwise seek
            // here. The parent owns the state, so the icon and the action can no
            // longer drift apart.
            if (isPlaying && typeof onTimestampPause === 'function') {
              onTimestampPause();
            } else {
              onTimestampClick(seconds);
            }
          }}
          style={{
            marginLeft: 4,
            cursor: canPlay ? 'pointer' : 'default',
            opacity: canPlay ? 1 : 0.4,
          }}
          title={
            !canPlay
              ? 'Tambahkan YouTube untuk memutar dari sini'
              : isPlaying
                ? 'Jeda video'
                : `Putar ke ${label}`
          }
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>
      </span>
    );
  };

  // --- Hooks (must all run before any early return, per the Rules of Hooks) ---
  const lines = useMemo(() => song?.lyrics ? song.lyrics.split(/\r?\n/) : [], [song?.lyrics]);
  // Nada angka relatif terhadap key, jadi transpose tidak boleh ikut diterapkan
  // dua kali.
  const effectiveTranspose = showNumberNotation ? 0 : transpose;
  // Parsing the whole lyric is the expensive part of a render, and in the
  // editor this component re-renders on every keystroke. Memoising on the
  // actual inputs keeps typing cheap: the text still changes per keystroke, but
  // unrelated re-renders (preview toggle, follow state, playback state) no
  // longer re-parse the document.
  const parsedLines = useMemo(
    () => parseLines(lines, effectiveTranspose),
    [lines, effectiveTranspose]
  );

  // Auto-fit horizontal dihapus: lirik tidak lagi otomatis diubah ukurannya —
  // lebar konten yang melebihi panel bisa digulir (overflow-x) oleh user.

  if (!song?.lyrics) {
    return (
      <div className="cd-empty">
        No lyrics available
      </div>
    );
  }

  /** Highlight class for a parsed row, compared by source line. */
  const syncClass = (lineObj) => {
    if (activeLine === null || lineObj.sourceLine !== activeLine) return '';
    // Rows copied out of an earlier section only "belong" to the caret's line
    // in a loose sense, so they get a quieter marker than typed lines.
    return lineObj.isExpandedFromSection ? ' cd-sync-row is-expanded' : ' cd-sync-row';
  };

  const renderPresetCueBadge = (lineObj, key) => (
    <div key={key} className={`cd-preset-cue${syncClass(lineObj)}`}>
      <span className="cd-preset-cue-label">[{lineObj.label}]</span>
    </div>
  );

  const renderedRows = [];

  // Mode fokus: baris dikelompokkan per bagian (section). Baris setelah
  // section aktif sampai section berikutnya tetap penuh; sisanya diredupkan.
  let currentFocusSection = null;
  const focusRowClass = () => {
    if (focusSectionKey === null) return '';
    if (currentFocusSection === focusSectionKey) return '';
    return ' cd-focus-dim';
  };

  parsedLines.forEach((lineObj, i) => {
    if (lineObj?.type === 'preset_cue') {
      renderedRows.push(renderPresetCueBadge(lineObj, `preset-cue-${i}`));
      return;
    }

    if (lineObj.type === 'empty') {
      renderedRows.push(<div key={i} className={`cd-empty-line${syncClass(lineObj)}${focusRowClass()}`}>&nbsp;</div>);
      return;
    }
    if (lineObj.type === 'structure') {
      currentFocusSection = `${i}:${lineObj.label}`;
      const isFocusActive = focusSectionKey !== null && currentFocusSection === focusSectionKey;
      const isFocusDim = focusSectionKey !== null && !isFocusActive;
      renderedRows.push(
        <div
          key={i}
          className={`cd-section-struct${syncClass(lineObj)}${isFocusActive ? ' cd-focus-active' : ''}${isFocusDim ? ' cd-focus-dim' : ''}`}
          data-section-key={currentFocusSection}
        >
          <span className="cd-section-struct-label">
            <span className="cd-section-struct-icon" aria-hidden="true">{getSectionIcon(lineObj.label)}</span>
            {lineObj.label}
          </span>
          {lineObj.isRepeatedReference ? (
            <span className="cd-section-repeat-badge" title="Bagian ini diambil dari section sebelumnya">
              Repeated
            </span>
          ) : null}
          {/* A section line may still carry a timestamp ("[Intro] [00:05]"). */}
          {(() => {
            const seconds = parseTimestampToken(lineObj.label || '');
            if (seconds === null || typeof onTimestampClick !== 'function') return null;
            const raw = String(lineObj.label).match(/\[[^\]]+\]/);
            return renderTimestampToken(raw ? raw[0] : lineObj.label, seconds, 'section-ts');
          })()}
        </div>
      );
      return;
    }
    if (lineObj.type === 'instrument') {
      renderedRows.push(<span key={i} className={`cd-instrument-token cd-section-inst${syncClass(lineObj)}`}>{lineObj.label}</span>);
      return;
    }
    if (lineObj.type === 'modulation') {
      renderedRows.push(<div key={i} className={`cd-modulation${syncClass(lineObj)}`}>🔄 Modulasi ke {lineObj.label}</div>);
      return;
    }
    if (lineObj.type === 'instrument_patch') {
      renderedRows.push(<span key={i} className={`cd-instrument-token cd-instrument-patch${syncClass(lineObj)}`}>{formatInstrumentPatchText(lineObj)}</span>);
      return;
    }
    if (lineObj.type === 'metadata') {
      renderedRows.push(<div key={i} className={`cd-metadata${syncClass(lineObj)}`}>{lineObj.text}</div>);
      return;
    }
    if ((lineObj.type === 'chord' && showChords) || lineObj.type === 'number') {
      if (lineObj.type === 'chord') {
        renderedRows.push(
          <div key={i} className={`cd-chord${syncClass(lineObj)}${focusRowClass()}`}>
            {lineObj.tokens.map((t, j) => {
              if (t.isSpace) return <span key={j}>{t.token}</span>;
              if (t.isBarline) return <span key={j} className="cd-barline-token">{t.token}</span>;

              // A timestamp can sit on a chord line ("[01:23] | C | G |").
              const seconds = typeof t.token === 'string' ? parseTimestampToken(t.token) : null;
              if (seconds !== null) return renderTimestampToken(t.token, seconds, j);

              return (
                <span key={j} className="cd-token">
                  {formatChordToken(t.token)}
                </span>
              );
            })}
          </div>
        );
        return;
      }

      renderedRows.push(
        <div key={i} className={`cd-number${syncClass(lineObj)}${focusRowClass()}`}>
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

    if (!showLyrics) {
      return;
    }
    renderedRows.push(
      <div key={i} className={`cd-lyrics${syncClass(lineObj)}${focusRowClass()}`}>
        {lineObj.tokens.map((t, j) => {
          if (t.isChord && !showChords) {
            return null;
          }
          const tokenText = t.isChord ? formatChordToken(t.token) : t.token;
          const seconds = typeof tokenText === 'string' ? parseTimestampToken(tokenText) : null;
          if (seconds !== null) {
            return renderTimestampToken(t.token, seconds, j);
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

  // Tanpa wrapper: induk (.song-lyrics-display di SongChordsLyricsDisplay)
  // sudah jadi panel scroll. Dua elemen ber-class sama bertumpuk menciptakan
  // pembungkus duplikat (padding/scroll ganda).
  return (
    <div
      className="cd"
      style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
    >
      {renderedRows}
    </div>
  );
});

/**
 * Memoised so the editor's live preview does not re-render — and re-parse the
 * whole lyric — on every unrelated parent render (preview mode toggle, follow
 * state, video playback polling). Props are compared shallowly, which is
 * correct here: they are primitives or a stable `song` object.
 */
export default ChordDisplayBase;