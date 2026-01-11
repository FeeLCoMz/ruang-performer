import React, { useState, useEffect } from 'react';
import { parseChordPro, transposeChord, getAllChords } from '../utils/chordUtils';
import { parseMelodyString, transposeMelody, formatNoteDisplay, extractMelodyFromLyrics } from '../utils/musicNotationUtils';

const ChordDisplay = ({ song, transpose = 0 }) => {
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
  
  let melodyBarCursor = 0;

  // Function to render text with curly bracket highlighting
  const renderTextWithBrackets = (text) => {
    const parts = [];
    const bracketRegex = /(\{[^}]*\})/g;
    let lastIndex = 0;
    let match;

    while ((match = bracketRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {text.substring(lastIndex, match.index)}
          </span>
        );
      }
      parts.push(
        <span key={`bracket-${match.index}`} className="bracket-highlight">
           {match[0].slice(1, -1)}
        </span>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.substring(lastIndex)}
        </span>
      );
    }

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
      return (
        <div key={index} className="structure-marker structure-start">
          <span className="structure-label">{lineData.structure.toUpperCase()}</span>
        </div>
      );
    }
    
    if (lineData.type === 'structure_end') {
      return <div key={index} className="structure-marker structure-end"></div>;
    }
    
    if (lineData.type === 'line_with_chords') {
      const chordLine = [];
      let currentPos = 0;
      
      lineData.chords.forEach(({ chord, position }, idx) => {
        const spacesNeeded = position - currentPos;
        if (spacesNeeded > 0) {
          const spacesText = '\u00A0'.repeat(spacesNeeded);
          // Check if spaces contain bar lines
          const textBeforeChord = lineData.text.substring(currentPos, position);
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
      const textWithBars = lineData.text;
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
          <div className="chord-line">{chordLine}</div>
          <div className="text-line">
            {textParts.length > 0 ? textParts : renderTextWithBrackets(lineData.text)}
          </div>
          {/* Inline numeric notation (not angka) mapped by bars */}
          {melodyBars.length > 0 && (
            (() => {
              // Count groups of '|' in this line (treat consecutive | as one)
              const barMatches = (lineData.text.match(/\|+/g) || []);
              const barGroupsInLine = barMatches.length;
              if (barGroupsInLine === 0) return null;
              const slice = melodyBars.slice(melodyBarCursor, melodyBarCursor + barGroupsInLine);
              melodyBarCursor += slice.length;
              if (slice.length === 0) return null;
              return (
                <div className="numeric-notation-inline">
                  {slice.map((bar, bi) => (
                    <span key={bi} className="melody-bar-inline">
                      {bar.map((n, ni) => (
                        <span key={ni} className={`melody-note-inline${n.type === 'rest' ? ' rest' : ''}`}>
                          {formatNoteDisplay(n)}{ni < bar.length - 1 ? ' ' : ''}
                        </span>
                      ))}
                      <span className="bar-separator">|</span>
                    </span>
                  ))}
                </div>
              );
            })()
          )}
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
    <div className="chord-display">
      <div className="song-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <h2>{parsedSong.metadata.title || song.title}</h2>
            <p className="artist">{parsedSong.metadata.artist || song.artist}</p>
          </div>
          {parsedSong.format && (
            <span style={{
              background: 'var(--primary)',
              color: 'white',
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              marginLeft: '1rem'
            }}>
              {parsedSong.format === 'chordpro' ? 'ChordPro' : parsedSong.format === 'standard' ? 'Standard' : 'Unknown'}
            </span>
          )}
        </div>
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
      
      {allChords.length > 0 && (
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
