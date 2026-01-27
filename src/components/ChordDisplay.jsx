import React, { useState, useEffect } from 'react';
import { parseChordPro, transposeChord, getAllChords } from '../utils/chordUtils';
import { parseMelodyString, transposeMelody, formatNoteDisplay, extractMelodyFromLyrics } from '../utils/musicNotationUtils';

const ChordDisplay = ({ song, transpose = 0, performanceMode = false, performanceFontSize = 100, performanceTheme = 'dark-stage', lyricsMode = false, keyboardMode = false, highlightChords = false }) => {
  const [selectedChord, setSelectedChord] = useState(null);
  const [parsedSong, setParsedSong] = useState(null);
  const [allChords, setAllChords] = useState([]);
  // Precompute melody bars for inline numeric notation
  const [melodyBars, setMelodyBars] = useState([]);
  
  useEffect(() => {
    if (song && song.lyrics) {
      const parsed = parseChordPro(song.lyrics);
      setParsedSong(parsed);
      setAllChords(getAllChords(parsed));
    }
    // Prepare melody bars for inline rendering
    if (song && song.lyrics) {
      // Extract melody from lyrics text (lines starting with digits)
      const melodyStr = extractMelodyFromLyrics(song.lyrics);
      if (melodyStr) {
        const notes = parseMelodyString(melodyStr);
        const transposed = transposeMelody(notes, transpose);
        const bars = [];
        transposed.forEach(n => {
          const b = n.bar || 0;
          if (!bars[b]) bars[b] = [];
          bars[b].push(n);
        });
        setMelodyBars(bars.filter(Boolean));
      } else {
        setMelodyBars([]);
      }
    } else {
      setMelodyBars([]);
    }
  }, [song, transpose]);
  
  if (!parsedSong) return null;

  // Function to render text with curly bracket, instrument, repeat sign, and inline chord highlighting
  const renderTextWithBrackets = (text) => {
    const parts = [];
    const bracketRegex = /(\{[^}]*\})/g;
    const instrumentRegex = /\b(Guitar|Bass|Piano|Drums|Violin|Saxophone|Sax|Trumpet|Flute|Clarinet|Cello|Organ|Synth|Keyboard|Vocals|Mandolin|Gitar|Bas|Drum|Biola|Vokal|Suling|Seruling|Strings|Brass)\b/gi;
    const repeatSignRegex = /(\|:|:\||\b(?:D\.S\.|D\.C\.|Da Capo|Dal Segno|Fine|Coda|To Coda|Repeat|%)\b)/gi;
    // Inline chord detection inside bars/repeat symbols
    // Updated to support compact format: D..Gm..Bb
    // Case-sensitive to avoid matching lowercase words like "ade" or "gaga"
    const chordRegex = /(^|[\s|:])(-?[A-G][#b]?(?:maj|min|dim|aug|sus|add|m)?[0-9]*(?:\/[A-G][#b]?)?(?:\.\.|-?[A-G][#b]?(?:maj|min|dim|aug|sus|add|m)?[0-9]*(?:\/[A-G][#b]?)?)*)(?=$|[\s|:])/g;
    
    let lastIndex = 0;
    let match;

    // First handle brackets
    const segments = [];
    while ((match = bracketRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: 'text', value: text.substring(lastIndex, match.index) });
      }
      segments.push({ type: 'bracket', value: match[0] });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      segments.push({ type: 'text', value: text.substring(lastIndex) });
    }

    // Then highlight instruments and repeat signs in text segments
    segments.forEach((segment, segIdx) => {
      if (segment.type === 'bracket') {
        parts.push(
          <span key={`bracket-${segIdx}`} className="bracket-highlight">
            {segment.value.slice(1, -1)}
          </span>
        );
      } else {
        // Highlight instruments and repeat signs in this text segment
        let textLastIndex = 0;
        let instrMatch;
        let repeatMatch;
        let chordMatch;
        const textParts = [];
        
        // Create a combined list of all matches with their type
        const allMatches = [];
        
        // Find all instrument matches
        while ((instrMatch = instrumentRegex.exec(segment.value)) !== null) {
          allMatches.push({ index: instrMatch.index, length: instrMatch[0].length, type: 'instrument', text: instrMatch[0] });
        }
        
        // Reset regex global state
        instrumentRegex.lastIndex = 0;
        
        // Find all repeat sign matches
        while ((repeatMatch = repeatSignRegex.exec(segment.value)) !== null) {
          allMatches.push({ index: repeatMatch.index, length: repeatMatch[0].length, type: 'repeat', text: repeatMatch[0] });
        }
        
        // Reset regex global state
        repeatSignRegex.lastIndex = 0;

        // Find inline chord matches (between bars/repeat markers)
        while ((chordMatch = chordRegex.exec(segment.value)) !== null) {
          const chordText = chordMatch[2];
          const chordIndex = chordMatch.index + chordMatch[1].length;
          // Transpose inline chord if compact format (D..Gm) or single chord
          const transposedChordText = chordText.includes('..')
            ? chordText.split('..').map(c => transposeChord(c.trim(), transpose)).join('..')
            : transposeChord(chordText, transpose);
          allMatches.push({ index: chordIndex, length: chordText.length, type: 'chord', text: transposedChordText });
        }

        // Reset regex global state
        chordRegex.lastIndex = 0;
        
        // Sort matches by index
        allMatches.sort((a, b) => a.index - b.index);
        
        // Remove overlapping matches
        const uniqueMatches = [];
        for (const match of allMatches) {
          const isOverlapping = uniqueMatches.some(m => 
            (match.index >= m.index && match.index < m.index + m.length) ||
            (m.index >= match.index && m.index < match.index + match.length)
          );
          if (!isOverlapping) {
            uniqueMatches.push(match);
          }
        }
        
        // Render with highlights
        textLastIndex = 0;
        for (const match of uniqueMatches) {
          if (match.index > textLastIndex) {
            textParts.push(segment.value.substring(textLastIndex, match.index));
          }
          const highlightClass = match.type === 'instrument'
            ? 'instrument-highlight'
            : match.type === 'repeat'
              ? 'repeat-sign-highlight'
              : 'inline-chord-highlight';
          textParts.push(
            <span key={`${match.type}-${segIdx}-${match.index}`} className={highlightClass}>
              {match.text}
            </span>
          );
          textLastIndex = match.index + match.length;
        }
        if (textLastIndex < segment.value.length) {
          textParts.push(segment.value.substring(textLastIndex));
        }
        
        if (textParts.length > 0) {
          parts.push(<span key={`text-${segIdx}`}>{textParts}</span>);
        } else {
          parts.push(segment.value);
        }
      }
    });

    return parts.length > 0 ? parts : text;
  };

  const renderLine = (lineData, index) => {
    // Dukungan Ref:Chorus atau Ref:Verse dsb
    if (lineData.type === 'structure_ref') {
      const structureLines = parsedSong.structures?.[lineData.structure] || [];
      return (
        <React.Fragment key={index}>
          {structureLines.length > 0
            ? structureLines.map((subLine, subIdx) => renderLine(subLine, `${index}-ref-${subIdx}`))
            : (
              <div className="lyrics-line comment-line" key={`${index}-notfound`}>
                <div className="text-line">
                  <span className="bracket-highlight">{`Ref:${lineData.structure} (tidak ditemukan)`}</span>
                </div>
              </div>
            )
          }
        </React.Fragment>
      );
    }

    // Deteksi baris referensi format Ref:Chorus pada format standar
    if (lineData.line && typeof lineData.line === 'string') {
      const refMatch = lineData.line.match(/^Ref:([A-Za-z0-9 _-]+)$/i);
      if (refMatch) {
        const structure = refMatch[1].trim();
        const structureLines = parsedSong.structures?.[structure] || [];
        return (
          <React.Fragment key={index}>
            {structureLines.length > 0
              ? structureLines.map((subLine, subIdx) => renderLine(subLine, `${index}-ref-${subIdx}`))
              : (
                <div className="lyrics-line comment-line" key={`${index}-notfound`}>
                  <div className="text-line">
                    <span className="bracket-highlight">{`Ref:${structure} (tidak ditemukan)`}</span>
                  </div>
                </div>
              )
            }
          </React.Fragment>
        );
      }
    }

    if (lineData.type === 'empty') {
      // Render baris kosong sebagai <br /> agar tetap terlihat spasi di UI
      return <div key={index} className="lyrics-line empty"><br /></div>;
    }
    
    if (lineData.type === 'comment') {
      return (
        <div key={index} className="lyrics-line comment-line">
          <div className="text-line">
            <span className="bracket-highlight">{lineData.text}</span>
          </div>
        </div>
      );
    }
    
    if (lineData.type === 'structure_start') {
      const structureIcons = {
        'INTRO': '🎸',
        'VERSE': '📝',
        'PRE-CHORUS': '🎶',
        'CHORUS': '🎤',
        'BRIDGE': '🌉',
        'SOLO': '🎹',
        'OUTRO': '🎼',
      };
      const icon = structureIcons[lineData.structure.toUpperCase()] || '📍';
      return (
        <div key={index} className={`structure-marker structure-start ${performanceMode ? 'performance-structure' : ''}`}>
          <span className="structure-icon">{icon}</span>
          <span className="structure-label">{lineData.structure.toUpperCase()}</span>
        </div>
      );
    }
    
    if (lineData.type === 'structure_end') {
      return <div key={index} className="structure-marker structure-end"></div>;
    }
    
    if (lineData.type === 'line_with_chords' || lineData.type === 'line_with_chords_aligned') {
      // Always render barText (chord bar line) above lyric line if available
      let barLine = null;
      if (lineData.barText) {
        barLine = (
          <div className="bar-line-row">{renderTextWithBrackets(lineData.barText)}</div>
        );
      }

      let chordLine = [];
      if (lineData.type === 'line_with_chords_aligned' && Array.isArray(lineData.chords)) {
        // Render chord aligned to each lyric character
        chordLine = lineData.chords.map((chord, idx) =>
          chord ? (
            <span
              key={`chord-${idx}`}
              className={`chord${highlightChords ? ' inline-chord-highlight' : ''}`}
              style={{ position: 'absolute', left: `calc(${idx}ch + 2px)` }}
            >
              {transposeChord(chord, transpose)}
            </span>
          ) : null
        );
      } else if (Array.isArray(lineData.chords)) {
        // Fallback: original rendering for line_with_chords
        const barSource = lineData.barText || lineData.text || '';
        let currentPos = 0;
        lineData.chords.forEach(({ chord, position }, idx) => {
          const spacesNeeded = position - currentPos;
          if (spacesNeeded > 0) {
            chordLine.push(
              <span key={`space-${idx}`} className="chord-space">
                {'\u00A0'.repeat(spacesNeeded)}
              </span>
            );
          }
          const transposedChord = transposeChord(chord, transpose);
          chordLine.push(
            <span
              key={`chord-${idx}`}
              className={`chord${highlightChords ? ' inline-chord-highlight' : ''}`}
            >
              {transposedChord}
            </span>
          );
          currentPos = position + chord.length;
        });
      }

      // Process text with bar lines (for lyric line)
      const textParts = [];
      const textWithBars = lineData.text || '';
      const barRegex = /(\|:?:?\|?)/g;
      let lastIndex = 0;
      let match;
      while ((match = barRegex.exec(textWithBars)) !== null) {
        if (match.index > lastIndex) {
          const textSegment = textWithBars.substring(lastIndex, match.index);
          textParts.push(
            <span key={`text-${lastIndex}`}>
              {renderTextWithBrackets(textSegment)}
            </span>
          );
        }
        textParts.push(
          <span key={`bar-${match.index}`} className="bar-line">
            {match[0]}
          </span>
        );
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < textWithBars.length) {
        const textSegment = textWithBars.substring(lastIndex);
        textParts.push(
          <span key={`text-${lastIndex}`}>
            {renderTextWithBrackets(textSegment)}
          </span>
        );
      }

      return (
        <div key={index} className="lyrics-line">
          {barLine}
          {/* Hanya render chordLine jika type-nya line_with_chords_aligned (untuk mode align khusus),
              atau jika barLine tidak ada (untuk fallback lama) */}
          {!lyricsMode && !barLine && <div className="chord-line">{chordLine}</div>}
          {!lyricsMode && lineData.type === 'line_with_chords_aligned' && <div className="chord-line">{chordLine}</div>}
          <div className="text-line">
            {textParts.length > 0 ? textParts : renderTextWithBrackets(lineData.text)}
          </div>
        </div>
      );
    }
    
    return (
      <div key={index} className="lyrics-line">
        <div className="text-line">{renderTextWithBrackets(lineData.line)}</div>
      </div>
    );
  };
  
  // Tampilan modern, bersih, dan responsif untuk penampil lirik/akor
  return (
    <div className="chord-display modern-viewer">
      <div className="song-header">
        <h2 className="song-title-main">{parsedSong.metadata.title || song.title}</h2>
        {/* Selalu tampilkan nama penyanyi/artist dari database, fallback ke metadata */}
        {(song.artist || parsedSong.metadata.artist) && (
          <div className="song-artist-main">{song.artist || parsedSong.metadata.artist}</div>
        )}
        {/* Song info section */}
        <div className="song-info-section">
          {/* Prioritaskan data dari database (song), fallback ke metadata jika ada */}
          {(song.key || parsedSong.metadata.key) && (
            <span className="song-info-item"><strong>Key:</strong> {song.key || parsedSong.metadata.key}</span>
          )}
          {(song.capo || parsedSong.metadata.capo) && (
            <span className="song-info-item"><strong>Capo:</strong> {song.capo || parsedSong.metadata.capo}</span>
          )}
          {(song.tempo || parsedSong.metadata.tempo) && (
            <span className="song-info-item"><strong>Tempo:</strong> {song.tempo || parsedSong.metadata.tempo} BPM</span>
          )}
          {(song.style || parsedSong.metadata.style) && (
            <span className="song-info-item"><strong>Style:</strong> {song.style || parsedSong.metadata.style}</span>
          )}
          {(song.genre || parsedSong.metadata.genre) && (
            <span className="song-info-item"><strong>Genre:</strong> {song.genre || parsedSong.metadata.genre}</span>
          )}
          {(song.album || parsedSong.metadata.album) && (
            <span className="song-info-item"><strong>Album:</strong> {song.album || parsedSong.metadata.album}</span>
          )}
          {(song.year || parsedSong.metadata.year) && (
            <span className="song-info-item"><strong>Tahun:</strong> {song.year || parsedSong.metadata.year}</span>
          )}
        </div>
      </div>

      {!performanceMode && !lyricsMode && allChords.length > 0 && (
        <div className="all-chords">
          <span className="chord-label">Chord:</span>
          {allChords.map((chord, idx) => (
            <span key={idx} className="chord-badge">
              {transposeChord(chord, transpose)}
            </span>
          ))}
        </div>
      )}

      {/* Struktur Lagu */}
      {!performanceMode && !lyricsMode && parsedSong && parsedSong.lines && (
        <div className="song-structure-flow">
          <span className="structure-label">Struktur:</span>{' '}
          {(() => {
            // Ambil urutan struktur dari lines
            const flow = [];
            parsedSong.lines.forEach(line => {
              if (line.type === 'structure_start' && line.structure) {
                flow.push(line.structure.toUpperCase());
              }
            });
            // Gabungkan dan hilangkan duplikat berurutan
            const flowDisplay = flow.filter((s, i) => i === 0 || s !== flow[i - 1]);
            return flowDisplay.length > 0
              ? flowDisplay.join(' → ')
              : <span className="structure-not-found">Tidak terdeteksi</span>;
          })()}
        </div>
      )}

      {/* Tampilkan metadata lain (selain title/artist) di atas lirik jika ada */}
      {parsedSong && parsedSong.lines && parsedSong.lines.some(l => l.type === 'metadata') && (
        <div className="song-metadata-extra" style={{ margin: '10px 0 18px 0', fontSize: '1em', color: 'var(--text-muted)' }}>
          {parsedSong.lines.filter(l => l.type === 'metadata').map((meta, idx) => (
            <div key={idx} className="metadata-line">
              <strong>{meta.key}:</strong> {meta.value}
            </div>
          ))}
        </div>
      )}
      <div className="lyrics-content">
        {parsedSong.lines.map((line, index) => renderLine(line, index))}
      </div>
    </div>
  );
};

export default ChordDisplay;
