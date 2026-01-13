import React, { useState, useEffect } from 'react';
import { parseChordPro, transposeChord, getAllChords } from '../utils/chordUtils';
import { parseMelodyString, transposeMelody, formatNoteDisplay, extractMelodyFromLyrics } from '../utils/musicNotationUtils';

const ChordDisplay = ({ song, transpose = 0, performanceMode = false, performanceFontSize = 100, performanceTheme = 'dark-stage', lyricsMode = false }) => {
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
    if (lineData.type === 'empty') {
      return <div key={index} className="lyrics-line empty"></div>;
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
    
    if (lineData.type === 'line_with_chords') {
      // If there's no lyric text but we have barText (e.g., "Am | F | Bdim | Am |"), render as inline bar line only
      if (!lineData.text && lineData.barText) {
        return (
          <div key={index} className="lyrics-line">
            <div className="text-line">{renderTextWithBrackets(lineData.barText)}</div>
          </div>
        );
      }

      const barSource = lineData.barText || lineData.text || '';
      const chordLine = [];
      let currentPos = 0;
      
      lineData.chords.forEach(({ chord, position }, idx) => {
        const spacesNeeded = position - currentPos;
        if (spacesNeeded > 0) {
          const spacesText = '\u00A0'.repeat(spacesNeeded);
          // Check if spaces contain bar lines
          const textBeforeChord = barSource.substring(currentPos, position);
          if (textBeforeChord.includes('|')) {
            const parts = spacesText.split('');
            let barPositions = [];
            for (let i = 0; i < textBeforeChord.length; i++) {
              if (textBeforeChord[i] === '|') {
                barPositions.push(i);
              }
            }
            
            if (barPositions.length > 0) {
              let lastPos = 0;
              barPositions.forEach((barPos, bIdx) => {
                if (barPos > lastPos) {
                  chordLine.push(
                    <span key={`space-${idx}-${bIdx}`} className="chord-space">
                      {'\u00A0'.repeat(barPos - lastPos)}
                    </span>
                  );
                }
                chordLine.push(
                  <span key={`bar-chord-${idx}-${bIdx}`} className="bar-line">
                    |
                  </span>
                );
                lastPos = barPos + 1;
              });
              if (lastPos < spacesNeeded) {
                chordLine.push(
                  <span key={`space-${idx}-end`} className="chord-space">
                    {'\u00A0'.repeat(spacesNeeded - lastPos)}
                  </span>
                );
              }
            } else {
              chordLine.push(
                <span key={`space-${idx}`} className="chord-space">
                  {spacesText}
                </span>
              );
            }
          } else {
            chordLine.push(
              <span key={`space-${idx}`} className="chord-space">
                {spacesText}
              </span>
            );
          }
        }
        
        const transposedChord = transposeChord(chord, transpose);
        chordLine.push(
          <span
            key={`chord-${idx}`}
            className="chord"
          >
            {transposedChord}
          </span>
        );
        
        currentPos = position + chord.length;
      });
      
      // Process text with bar lines
      const textParts = [];
      // Only render bars in the text line when the lyric line itself contains them to avoid duplicating the chord bar row
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
          {!lyricsMode && <div className="chord-line">{chordLine}</div>}
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
  
  return (
    <div 
      className={`chord-display ${performanceMode ? `performance-mode theme-${performanceTheme}` : ''} ${lyricsMode ? 'lyrics-mode' : ''}`}
      style={performanceMode ? { '--perf-font-scale': performanceFontSize / 100 } : {}}
    >
      <div className="song-header">
        <h2>{parsedSong.metadata.title || song.title}</h2>
        <p className="artist">{parsedSong.metadata.artist || song.artist}</p>
        <div className="song-metadata">
          {(parsedSong.metadata.key || song.key) && (
            <span className="metadata-item">
              <strong>Key:</strong> {transposeChord(parsedSong.metadata.key || song.key, transpose)}
              {transpose !== 0 && ` (Original: ${parsedSong.metadata.key || song.key})`}
            </span>
          )}
          {parsedSong.metadata.original_key && (
            <span className="metadata-item">
              <strong>Original Key:</strong> {parsedSong.metadata.original_key}
            </span>
          )}
          {(song.tempo || parsedSong.metadata.tempo) && (
            <span className="metadata-item">
              <strong>Tempo:</strong> {song.tempo || parsedSong.metadata.tempo} BPM
            </span>
          )}
          {song.style && (
            <span className="metadata-item">
              <strong>Style:</strong> {song.style}
            </span>
          )}
          {parsedSong.metadata.time && (
            <span className="metadata-item">
              <strong>Time:</strong> {parsedSong.metadata.time}
            </span>
          )}
          {parsedSong.metadata.capo && (
            <span className="metadata-item">
              <strong>Capo:</strong> {parsedSong.metadata.capo}
            </span>
          )}
        </div>
      </div>
      
      {!performanceMode && !lyricsMode && allChords.length > 0 && (
        <div className="all-chords">
          <strong>Chords: </strong>
          {allChords.map((chord, idx) => (
            <span key={idx} className="chord-badge">
              {transposeChord(chord, transpose)}
            </span>
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
