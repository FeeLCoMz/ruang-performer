import React, { useState, useEffect } from 'react';
import YouTubeViewer from './YouTubeViewer';
import AiAssistant from './AiAssistant';
import { transcribeAudio } from '../apiClient';

const SongFormBaru = ({ song, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    youtubeId: '',
    key: '',
    tempo: '',
    style: '',
    lyrics: '',
    timestamps: []
  });
  const [errors, setErrors] = useState({});
  const [tapTimes, setTapTimes] = useState([]);
  const [bpm, setBpm] = useState(null);
  const [minimizeYouTube, setMinimizeYouTube] = useState(true);
  const [showYouTubeSearch, setShowYouTubeSearch] = useState(false);
  const [youtubeSearchQuery, setYoutubeSearchQuery] = useState('');
  const [youtubeResults, setYoutubeResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [showChordSearch, setShowChordSearch] = useState(false);
  const [chordSearchUrl, setChordSearchUrl] = useState('');
  const [chordSearchResults, setChordSearchResults] = useState(null);
  const [isLoadingChord, setIsLoadingChord] = useState(false);
  const [chordError, setChordError] = useState('');
  const [copiedChord, setCopiedChord] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [showTranscribe, setShowTranscribe] = useState(false);
  const [transcribeFile, setTranscribeFile] = useState(null);
  const [transcribeLoading, setTranscribeLoading] = useState(false);
  const [transcribeError, setTranscribeError] = useState('');
  const [transcribeResult, setTranscribeResult] = useState('');
  // ...existing code...

  useEffect(() => {
    if (song) {
      setFormData({
        title: song.title || '',
        artist: song.artist || '',
        youtubeId: song.youtubeId || '',
        key: song.key || '',
        tempo: song.tempo || '',
        style: song.style || '',
        lyrics: song.lyrics || '',
        timestamps: Array.isArray(song.timestamps) ? song.timestamps : []
      });
    }
  }, [song]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Judul lagu harus diisi';
    if (!formData.artist.trim()) newErrors.artist = 'Nama artis harus diisi';
    if (!formData.lyrics.trim()) newErrors.lyrics = 'Lirik lagu harus diisi';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    const songData = {
      title: formData.title.trim(),
      artist: formData.artist.trim(),
      youtubeId: formData.youtubeId.trim(),
      key: formData.key.trim(),
      tempo: formData.tempo.trim(),
      style: formData.style.trim(),
      lyrics: formData.lyrics.trim(),
      timestamps: Array.isArray(formData.timestamps) ? formData.timestamps : [],
      createdAt: song?.createdAt || new Date().toISOString()
    };
    onSave(songData);
  };

  const handleTapTempo = () => {
    const now = Date.now();
    const newTaps = [...tapTimes, now].slice(-8);
    setTapTimes(newTaps);

    if (newTaps.length >= 2) {
      const intervals = [];
      for (let i = 1; i < newTaps.length; i++) {
        intervals.push(newTaps[i] - newTaps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      setBpm(calculatedBpm);
      setFormData(prev => ({ ...prev, tempo: String(calculatedBpm) }));
    }

    setTimeout(() => {
      setTapTimes(prev => {
        if (prev.length > 0 && Date.now() - prev[prev.length - 1] > 3000) {
          return [];
        }
        return prev;
      });
    }, 3000);
  };

  const resetTapTempo = () => {
    setTapTimes([]);
    setBpm(null);
    setFormData(prev => ({ ...prev, tempo: '' }));
  };

  // ===== Timestamp (Struktur Lagu) helpers =====
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [viewerSeekTo, setViewerSeekTo] = useState(null);

  const fmtTime = (s) => {
    const sec = Math.max(0, Math.floor(s || 0));
    const m = Math.floor(sec / 60);
    const r = sec % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  };

  const addTimestamp = (label) => {
    const time = Math.floor(currentVideoTime || 0);
    if (!formData.youtubeId) return;
    if (!label || !label.trim()) return;
    setFormData(prev => ({
      ...prev,
      timestamps: [...(prev.timestamps || []), { label: label.trim(), time }]
    }));
  };

  const removeTimestamp = (idx) => {
    setFormData(prev => ({
      ...prev,
      timestamps: (prev.timestamps || []).filter((_, i) => i !== idx)
    }));
  };

  const seekToTimestamp = (time) => {
    setViewerSeekTo(Math.max(0, Number(time) || 0));
    // reset after trigger to avoid repeated seeks on same value
    setTimeout(() => setViewerSeekTo(null), 0);
  };

  const searchYouTube = async () => {
    if (!youtubeSearchQuery.trim()) {
      setSearchError('Masukkan kata kunci pencarian');
      return;
    }

    setIsSearching(true);
    setSearchError('');

    try {
      // Using YouTube Data API v3 (requires API key)
      // Note: User needs to get their own API key from Google Cloud Console
      const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || 'AIzaSyDummy_ReplaceWithRealKey';
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(youtubeSearchQuery)}&key=${API_KEY}`
      );

      if (!response.ok) {
        throw new Error('Gagal mencari video YouTube');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'YouTube API error');
      }

      const videos = data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.medium.url,
        description: item.snippet.description
      }));

      setYoutubeResults(videos);
    } catch (error) {
      setSearchError(`Error: ${error.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const searchChordFromUrl = async (url) => {
    if (!url.trim()) {
      setChordError('URL tidak boleh kosong');
      return;
    }

    // Directly open the URL in a new tab
    window.open(url.trim(), '_blank');
    setShowChordSearch(false);
    setChordSearchUrl('');
    setChordError('');
  };

  const copyChordToClipboard = async () => {
    if (!chordSearchResults) return;
    
    // Try to copy text from iframe
    try {
      const iframeDoc = document.getElementById('chord-iframe')?.contentDocument || document.getElementById('chord-iframe')?.contentWindow?.document;
      if (iframeDoc) {
        const text = iframeDoc.body.innerText;
        if (text) {
          await navigator.clipboard.writeText(text);
          setCopiedChord(true);
          setTimeout(() => setCopiedChord(false), 2000);
          return;
        }
      }
    } catch (error) {
      console.log('Cannot access iframe content, showing manual copy instead');
    }
    
    setChordError('Silakan copy langsung dari website yang ditampilkan');
  };

  const pasteChordToLyrics = () => {
    if (!chordSearchResults) return;
    
    // Try to get text from iframe
    try {
      const iframeDoc = document.getElementById('chord-iframe')?.contentDocument || document.getElementById('chord-iframe')?.contentWindow?.document;
      if (iframeDoc) {
        const text = iframeDoc.body.innerText;
        if (text.trim()) {
          setFormData(prev => ({ 
            ...prev, 
            lyrics: prev.lyrics ? prev.lyrics + '\n\n' + text : text
          }));
          setShowChordSearch(false);
          setChordSearchUrl('');
          setChordSearchResults(null);
          setChordError('');
          return;
        }
      }
    } catch (error) {
      console.log('Cannot access iframe content');
    }
    
    setChordError('Silakan copy langsung dari website, atau paste URL dan buka di browser baru');
  };

  const openChordSearchModal = () => {
    const query = `${formData.title} ${formData.artist} chord`.trim();
    // Pre-fill with Google search URL
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    setChordSearchUrl(searchUrl);
    setShowChordSearch(true);
    setChordSearchResults(null);
    setChordError('');
  };

  const selectYouTubeVideo = (videoId) => {
    setFormData(prev => ({ ...prev, youtubeId: videoId }));
    setShowYouTubeSearch(false);
    setYoutubeResults([]);
    setYoutubeSearchQuery('');
  };

  const openYouTubeSearchModal = () => {
    const query = `${formData.title} ${formData.artist}`.trim();
    setYoutubeSearchQuery(query);
    setShowYouTubeSearch(true);
    setYoutubeResults([]);
    setSearchError('');
  };



  // ...existing code...

  const insertTemplate = () => {
    const template = `{title: ${formData.title || 'Judul Lagu'}}\n{artist: ${formData.artist || 'Nama Artis'}}\n{key: C}\n{time: 4/4}\n{tempo: 120}\n{capo: 0}\n\n{start_of_intro}\n[C]Intro baris | [G]dengan chord |\n{end_of_intro}\n\n{start_of_verse}\n[C]Lirik baris | [G]pertama dengan | [Am]chord dan | [F]bar |\n[C]Lirik baris | [G]kedua dengan | [Am]chord dan | [F]bar |\n{end_of_verse}\n\n{start_of_pre-chorus}\n[Dm]Pre-chorus | [G]dengan lirik |\n{end_of_pre-chorus}\n\n{start_of_chorus}\n[C]Ini bagian | [G]chorus |\n[Am]Dengan lirik | [F]yang catchy |\n{end_of_chorus}\n\n{start_of_bridge}\n[Em]Bridge | [F]bagian |\n{end_of_bridge}\n\n{start_of_outro}\n[C]Outro | [G]bagian |\n{end_of_outro}`;
    setFormData(prev => ({ ...prev, lyrics: template }));
  };

  const insertStandardTemplate = () => {
    const template = `Title: ${formData.title || 'Judul Lagu'}\nArtist: ${formData.artist || 'Nama Artis'}\nKey: C\nTime: 4/4\nTempo: 120\nCapo: 0\n\nIntro:\nC              G\nIntro baris dengan chord\n\nVerse:\nC              G              Am             F\nLirik baris | pertama dengan | chord dan | bar |\nC              G              Am             F\nLirik baris | kedua dengan | chord dan | bar |\n\nPre-Chorus:\nDm             G\nPre-chorus dengan lirik\n\nChorus:\nC              G              Am             F\nIni bagian | chorus |\nAm             F\nDengan lirik | yang catchy |\n\nBridge:\nEm             F\nBridge bagian\n\nOutro:\nC              G\nOutro bagian`;
    setFormData(prev => ({ ...prev, lyrics: template }));
  };

  const convertStandardToChordPro = () => {
    const text = formData.lyrics;
    if (!text.trim()) return;

    const lines = text.split('\n');
    const result = [];
    let i = 0;
    // Regex untuk mendeteksi chord (termasuk extension/alteration/duration dots)
    const chordBase = '[A-G][#b]?';
    const chordQuality = '(?:maj7?|maj9?|maj11?|maj13?|mM7|mM9|mM11|mM13|m7b5|maj|min|m|dim7?|aug|sus[24]?|add[0-9]+)?';
    const chordExtension = '(?:6|7|9|11|13)?';
    const chordAlteration = '(?:[#b](?:5|9|11|13))?';
    const chordSlash = '(?:\\/-?[A-G][#b]?)?';
    const chordDots = '\\.*';
    const chordTokenPattern = `-?${chordBase}${chordQuality}${chordExtension}${chordAlteration}${chordSlash}${chordDots}`;
    const chordRegex = new RegExp(chordTokenPattern, 'g');
    const chordRegexWithDots = new RegExp(chordTokenPattern, 'i');
    const chordCaptureRegex = new RegExp(`^(-?)(${chordBase}${chordQuality}${chordExtension}${chordAlteration}${chordSlash})(\\.*)$`, 'i');
    
    // Function to check if line is chord chart format (with bars |)
    const isChordChartLine = (line) => {
      const trimmed = line.trim();
      // Must have multiple pipes and contain chords or dots
      if (!trimmed.includes('|')) return false;
      if ((trimmed.match(/\|/g) || []).length < 2) return false;
      const tokens = trimmed.split(/\s+|\|/).filter(Boolean);
      return tokens.some(tok => tok === '.' || chordRegexWithDots.test(tok));
    };

    // Function to convert chord chart line (Gm | . | F | Cm)
    const convertChordChartLine = (line) => {
      const parts = line.split('|').map(p => p.trim()).filter(p => p);
      const chords = [];
      let lastChord = '';

      for (const part of parts) {
        if (part === '.') {
          // Dot means repeat last chord
          if (lastChord) chords.push(lastChord);
        } else if (chordRegexWithDots.test(part)) {
          // This is a chord
          chords.push(part.replace(/\.+$/, ''));
          lastChord = part.replace(/\.+$/, '');
        }
      }

      return chords.map(c => `[${c}]`).join(' | ');
    };

    // Function to check if a line is primarily chords (lyrics format)
    const isChordLine = (line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      
      // Check if it's a structure label with chords (e.g., "Intro : Gm D# F")
      const structureLabelMatch = trimmed.match(/^(Intro|Verse|Chorus|Reff|Bridge|Outro|Int\.|Musik|Lead|Strings|Brass|Suling|Mandolin|Coda|Ending|Back to)\s*:\s*(.+)/i);
      if (structureLabelMatch) {
        const afterLabel = structureLabelMatch[2].trim();
        // Check if what follows contains chords
        const tokens = afterLabel.split(/\s+/);
        let chordCount = 0;
        for (const token of tokens) {
          // Match chords with optional - prefix and .. suffix, or single dot for repeat
          if (chordRegexWithDots.test(token) || token === '.') chordCount++;
        }
        // If majority are chords, treat this line as having chords
        return chordCount > 0 && (chordCount / tokens.length) >= 0.5;
      }
      
      // Skip section labels without chords
      if (/^(Intro|Verse|Chorus|Reff|Bridge|Outro|Int\.|Musik|Lead|Strings|Brass|Suling|Mandolin|Coda|Ending|Back to)\s*:?$/i.test(trimmed)) {
        return false;
      }

      // Check if it's chord chart format first
      if (isChordChartLine(trimmed)) {
        return false; // Will be handled separately
      }
      
      // Check for chord bar format (e.g., "D . Gm . Bb . D .")
      // Count chords and dots - if they dominate, it's a chord line
      const tokens = trimmed.split(/\s+/);
      let chordOrDotCount = 0;
      for (const token of tokens) {
        if (chordRegexWithDots.test(token) || token === '.') {
          chordOrDotCount++;
        }
      }
      if (chordOrDotCount > 0 && (chordOrDotCount / tokens.length) >= 0.6) {
        return true;
      }
      
      // Remove all valid chords (including - prefix and .. suffix) and check what's left
      const withoutChords = trimmed.replace(new RegExp(chordTokenPattern, 'gi'), '').replace(/[\s\.\-]+/g, '');
      
      // If almost nothing left, it's a chord line
      return withoutChords.length < 3;
    };

    while (i < lines.length) {
      const currentLine = lines[i];
      const trimmed = currentLine.trim();
      const nextLine = lines[i + 1];

      // Check for metadata line (contains | with tempo/style info)
      if (trimmed.includes('|') && /\d+\s*(Bpm|bpm)/i.test(trimmed)) {
        // Parse metadata
        const parts = trimmed.split('|').map(p => p.trim());
        result.push(`{comment: ${parts.join(' - ')}}`);
        i++;
        continue;
      }

      // Check for section labels (ALL CAPS or with colon)
      if (/^[A-Z\s]+$/.test(trimmed) || /^(Intro|Verse|Chorus|Reff|Bridge|Outro|Int\.|Musik|Lead|Strings|Brass|Suling|Mandolin|Coda|Ending|Back to)/i.test(trimmed)) {
        result.push(`{comment: ${trimmed}}`);
        
        // Check if next lines are indented chords (for "Musik :\n        D -C D.." pattern)
        let j = i + 1;
        while (j < lines.length && lines[j].trim() && /^\s+/.test(lines[j]) && isChordLine(lines[j])) {
          const indentedChords = lines[j].trim();
          // Parse chords with syncope marks and dots
          const chordTokens = indentedChords.split(/\s+/);
          let chordProLine = '';
          for (const token of chordTokens) {
            // Check if token is a chord (with optional - prefix and .. suffix)
            const chordMatch = token.match(chordCaptureRegex);
            if (chordMatch) {
              const syncope = chordMatch[1]; // "-" if present
              const chord = chordMatch[2];
              const duration = chordMatch[3]; // ".." if present
              
              // Preserve syncope mark in comment if present
              if (syncope) {
                chordProLine += `[${chord}]{comment: -}${duration} `;
              } else {
                chordProLine += `[${chord}]${duration} `;
              }
            }
          }
          if (chordProLine.trim()) {
            result.push(chordProLine.trim());
          }
          j++;
        }
        
        i = j;
        continue;
      }

      // Check if line is chord chart format
      if (isChordChartLine(currentLine)) {
        const converted = convertChordChartLine(currentLine);
        if (converted) result.push(converted);
        i++;
        continue;
      }

      // Check if current line is a chord line (lyrics format)
      if (isChordLine(currentLine)) {
        // Check if it's a structure label with chords (e.g., "Intro : Gm D# F")
        const structureLabelMatch = currentLine.match(/^(Intro|Verse|Chorus|Reff|Bridge|Outro|Int\.|Musik|Lead|Strings|Brass|Suling|Mandolin|Coda|Ending|Back to)\s*:\s*(.+)/i);
        
        if (structureLabelMatch) {
          // Extract label and chords
          const label = structureLabelMatch[1];
          const chordsAfterLabel = structureLabelMatch[2].trim();
          
          // Add the label line
          result.push(`{comment: ${label} :}`);
          
          // Convert chords to ChordPro format
          const chordTokens = chordsAfterLabel.split(/\s+/);
          let chordProLine = '';
          for (const token of chordTokens) {
            if (chordRegexWithDots.test(token)) {
              chordProLine += `[${token}] `;
            }
          }
          result.push(chordProLine.trim());
          
          // Check if there are continuation lines (indented chords)
          let j = i + 1;
          while (j < lines.length && lines[j].trim() && isChordLine(lines[j]) && /^\s+/.test(lines[j])) {
            const continuationChords = lines[j].trim().split(/\s+/);
            let continuationLine = '';
            for (const token of continuationChords) {
              if (chordRegexWithDots.test(token)) {
                continuationLine += `[${token}] `;
              }
            }
            result.push(continuationLine.trim());
            j++;
          }
          
          i = j;
          continue;
        }
        
        // Check if next line exists and is lyrics (not chords, not empty)
        if (nextLine && nextLine.trim() && !isChordLine(nextLine) && !isChordChartLine(nextLine)) {
          // This is chord + lyrics pattern
          const chordLine = currentLine;
          const lyricLine = nextLine;

          // Find all chords with their positions
          const chords = [];
          let match;
          const chordPattern = new RegExp(chordTokenPattern, 'g');
          
          while ((match = chordPattern.exec(chordLine)) !== null) {
            if (match[0].trim()) {
              chords.push({ 
                chord: match[0].trim(), 
                pos: match.index 
              });
            }
          }

          // Build converted line by inserting chords at their positions
          let convertedLine = '';
          let lyricPos = 0;
          
          for (const { chord, pos } of chords) {
            // Calculate corresponding position in lyrics (accounting for leading spaces)
            const targetPos = pos - (chordLine.length - chordLine.trimStart().length);
            
            if (targetPos > lyricPos) {
              // Add lyrics up to this position
              convertedLine += lyricLine.substring(lyricPos, Math.min(targetPos, lyricLine.length));
              lyricPos = targetPos;
            }
            
            // Add chord
            convertedLine += `[${chord}]`;
          }
          
          // Add remaining lyrics
          if (lyricPos < lyricLine.length) {
            convertedLine += lyricLine.substring(lyricPos);
          }

          result.push(convertedLine.trim());
          i += 2; // Skip both chord and lyric lines
        } else {
          // Chord line without lyrics (instrumental section)
          // Handle chord bar format with pipes and/or dot repeat markers (e.g., "| D . | Gm . |" or "D . Gm .")
          const hasPipes = currentLine.includes('|');
          const tokens = hasPipes 
            ? currentLine.split('|').map(s => s.trim()).filter(s => s)
            : currentLine.trim().split(/\s+/);
          
          let lastChord = '';
          let chordProLine = '';
          let hasDotsOrMultipleChords = false;
          
          for (let j = 0; j < tokens.length; j++) {
            const token = tokens[j];
            
            if (hasPipes) {
              // Processing pipe-separated bars
              const barTokens = token.split(/\s+/);
              for (const barToken of barTokens) {
                if (barToken === '.') {
                  hasDotsOrMultipleChords = true;
                  if (lastChord) {
                    chordProLine += `[${lastChord}] `;
                  }
                } else if (chordRegexWithDots.test(barToken)) {
                  const cleanChord = barToken.replace(/\.+$/, '');
                  lastChord = cleanChord;
                  chordProLine += `[${cleanChord}] `;
                  if (tokens.length > 1 || barTokens.length > 1) hasDotsOrMultipleChords = true;
                }
              }
              // Add bar separator after each bar (except last)
              if (j < tokens.length - 1) {
                chordProLine += '| ';
              }
            } else {
              // Processing space-separated tokens (no pipes)
              if (token === '.') {
                hasDotsOrMultipleChords = true;
                if (lastChord) {
                  chordProLine += `[${lastChord}] `;
                }
              } else if (chordRegexWithDots.test(token)) {
                const cleanChord = token.replace(/\.+$/, '');
                lastChord = cleanChord;
                chordProLine += `[${cleanChord}] `;
                if (tokens.length > 1) hasDotsOrMultipleChords = true;
              }
            }
          }
          
          if (hasDotsOrMultipleChords && chordProLine.trim()) {
            result.push(chordProLine.trim());
          } else {
            // Fallback to original pattern matching
            const chords = [];
            let match;
            const chordPattern = new RegExp(chordTokenPattern, 'g');
            
            while ((match = chordPattern.exec(currentLine)) !== null) {
              if (match[0].trim()) {
                chords.push(match[0].trim());
              }
            }
            
            if (chords.length > 0) {
              result.push(chords.map(c => `[${c}]`).join(' '));
            } else {
              result.push(currentLine);
            }
          }
          i++;
        }
      } else {
        // Regular line (lyrics without chords above, or other content)
        result.push(currentLine);
        i++;
      }
    }

    setFormData(prev => ({ ...prev, lyrics: result.join('\n') }));
  };

  const formatChords = () => {
    const text = formData.lyrics || '';
    const chordBase = '[A-G][#b]?';
    const chordQuality = '(?:maj7?|maj9?|maj11?|maj13?|mM7|mM9|mM11|mM13|m7b5|maj|min|m|dim7?|aug|sus[24]?|add[0-9]+)?';
    const chordExtension = '(?:6|7|9|11|13)?';
    const chordAlteration = '(?:[#b](?:5|9|11|13))?';
    const chordSlash = '(?:\/-?[A-G][#b]?)?';
    const chordDots = '\\.*';
    const chordToken = new RegExp(`^-?${chordBase}${chordQuality}${chordExtension}${chordAlteration}${chordSlash}${chordDots}$`, 'i');

    const isChordHeavy = (line) => {
      const tokens = line.trim().split(/\s+/).filter(Boolean);
      if (tokens.length === 0) return false;
      const chordish = tokens.filter(t => t === '.' || chordToken.test(t)).length;
      return chordish / tokens.length >= 0.6;
    };

    const formatLine = (line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';

      if (trimmed.includes('|')) {
        const parts = trimmed
          .split('|')
          .map(p => p.trim())
          .filter((p, idx, arr) => p || idx === 0 || idx === arr.length - 1);
        return parts.join(' | ');
      }

      if (isChordHeavy(trimmed)) {
        return trimmed.replace(/\s+/g, ' ');
      }

      return trimmed.replace(/\s+/g, ' ');
    };

    const formatted = [];
    for (const line of text.split('\n')) {
      const next = formatLine(line);
      if (next === '' && formatted.at(-1) === '') continue;
      formatted.push(next);
    }

    setFormData(prev => ({ ...prev, lyrics: formatted.join('\n') }));
  };

  // Convert inline ChordPro ([C]Lyric) to chord-above-lyrics format
  const handleTranscribeFile = async () => {
    if (!transcribeFile) {
      setTranscribeError('Pilih file audio terlebih dahulu');
      return;
    }

    // Check file size (max 25MB)
    const MAX_SIZE = 25 * 1024 * 1024; // 25MB
    if (transcribeFile.size > MAX_SIZE) {
      setTranscribeError(`File terlalu besar (${(transcribeFile.size / 1024 / 1024).toFixed(1)}MB). Max 25MB.`);
      return;
    }

    setTranscribeLoading(true);
    setTranscribeError('');
    setTranscribeResult('');

    try {
      const resp = await transcribeAudio(transcribeFile);
      setTranscribeResult(resp.transcript || '');
    } catch (err) {
      setTranscribeError(err.message);
      console.error('Transcribe error:', err);
    } finally {
      setTranscribeLoading(false);
    }
  };

  const pasteTranscribeResult = () => {
    if (transcribeResult.trim()) {
      setFormData(prev => ({
        ...prev,
        lyrics: prev.lyrics ? prev.lyrics + '\n\n' + transcribeResult : transcribeResult
      }));
      setShowTranscribe(false);
      setTranscribeFile(null);
      setTranscribeResult('');
      setTranscribeError('');
    }
  };

   return (
    <>
      <div className="modal-overlay">
        <div className="modal-content song-form-modal" style={{ position: 'relative' }}>
          <button
            onClick={onCancel}
            className="btn-close"
            style={{ position: 'absolute', top: 18, right: 18, zIndex: 10 }}
            aria-label="Tutup"
          >✕</button>
          <div className="modal-header">
            <h2 style={{ marginBottom: 0 }}>{song ? '✏️ Edit Lagu' : '✨ Tambah Lagu Baru'}</h2>
          </div>
          <form onSubmit={handleSubmit} className="song-form-grid">
            {/* Section 1: Basic Information */}
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label htmlFor="title">Judul Lagu *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className={errors.title ? 'error' : ''}
                  placeholder="Masukkan judul lagu"
                  autoFocus
                />
                {errors.title && <span className="error-message">{errors.title}</span>}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flex: 1 }}>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={openChordSearchModal}
                  disabled={!formData.title && !formData.artist}
                  title="Cari chord dari situs chord"
                >
                  🔍 Chord
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={openYouTubeSearchModal}
                  disabled={!formData.title && !formData.artist}
                  title="Cari video dari YouTube"
                >
                  🎵 Video
                </button>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="artist">Nama Artis *</label>
                <input
                  type="text"
                  id="artist"
                  name="artist"
                  value={formData.artist}
                  onChange={handleChange}
                  className={errors.artist ? 'error' : ''}
                  placeholder="Masukkan nama artis"
                />
                {errors.artist && <span className="error-message">{errors.artist}</span>}
              </div>
            </div>

            {/* Section 2: Metadata (Key, Tempo, Style) */}
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="key">🎼 Key (Kunci)</label>
                <input
                  type="text"
                  id="key"
                  name="key"
                  value={formData.key}
                  onChange={handleChange}
                  placeholder="Contoh: C, D, Em, G#m"
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="tempo">⏱️ Tempo (BPM)</label>
                <input
                  type="text"
                  id="tempo"
                  name="tempo"
                  value={formData.tempo}
                  onChange={handleChange}
                  placeholder="Contoh: 120"
                />
                <div className="tap-tempo-controls">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleTapTempo}
                  >
                    👆 TAP
                  </button>
                  {bpm && (
                    <>
                      <span className="bpm-display">{bpm} BPM</span>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={resetTapTempo}
                      >
                        🔄
                      </button>
                    </>
                  )}
                  {!bpm && tapTimes.length > 0 && (
                    <span className="tap-hint">Ketuk {2 - tapTimes.length}x lagi</span>
                  )}
                  {!bpm && tapTimes.length === 0 && (
                    <span className="tap-hint">Ketuk irama lagu</span>
                  )}
                </div>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="style">🎵 Style</label>
                <input
                  type="text"
                  id="style"
                  name="style"
                  value={formData.style}
                  onChange={handleChange}
                  placeholder="Contoh: Pop, Rock, Jazz"
                />
              </div>
            </div>

            {/* Section 4: YouTube Video */}
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <label htmlFor="youtubeId">🎬 YouTube Video ID</label>
                  {formData.youtubeId && (
                    <button
                      type="button"
                      className="btn btn-xs"
                      onClick={() => setMinimizeYouTube(!minimizeYouTube)}
                      title={minimizeYouTube ? 'Tampilkan video' : 'Sembunyikan video'}
                    >
                      {minimizeYouTube ? '🔍' : '➤'}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  id="youtubeId"
                  name="youtubeId"
                  value={formData.youtubeId}
                  onChange={handleChange}
                  placeholder="Contoh: dQw4w9WgXcQ"
                />
                <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--text-muted)' }}>ID adalah kode setelah "v=" di URL YouTube</small>
                {formData.youtubeId && (
                  <div className="youtube-viewer-section">
                    <YouTubeViewer
                      videoId={formData.youtubeId}
                      minimalControls={minimizeYouTube}
                      onTimeUpdate={(t, d) => { setCurrentVideoTime(t); setVideoDuration(d); }}
                      seekToTime={viewerSeekTo}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Section 4b: Struktur Lagu (Timestamp) */}
            {formData.youtubeId && (
              <div className="form-group">
                <div className="textarea-header" style={{ alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    ⏱️ Struktur Lagu (Timestamp)
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      Waktu saat ini: {fmtTime(currentVideoTime)} / {fmtTime(videoDuration)}
                    </span>
                  </label>
                  <div className="template-buttons" style={{ gap: '0.5rem' }}>
                    <select id="tsLabel" className="btn" style={{ minWidth: 140 }} defaultValue="Verse">
                      {['Intro','Verse','Pre-Chorus','Chorus','Bridge','Solo','Outro'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button type="button" className="btn btn-sm btn-primary" onClick={() => {
                      const sel = document.getElementById('tsLabel');
                      addTimestamp(sel?.value || 'Verse');
                    }} title="Tambah timestamp pada waktu saat ini">
                      ➕ Tambah Timestamp
                    </button>
                  </div>
                </div>
                {(formData.timestamps || []).length > 0 ? (
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0.75rem 0 0 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                    {formData.timestamps.map((ts, idx) => (
                      <li key={idx} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ color: 'var(--text)' }}>{ts.label}</strong>
                          <small style={{ color: 'var(--text-muted)' }}>{fmtTime(ts.time)}</small>
                        </div>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button type="button" className="btn btn-xs" onClick={() => seekToTimestamp(ts.time)} title="Putar dari timestamp">▶</button>
                          <button type="button" className="btn btn-xs btn-danger" onClick={() => removeTimestamp(idx)} title="Hapus">🗑</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <small style={{ color: 'var(--text-muted)' }}>Belum ada timestamp. Pilih label lalu klik ➕ Tambah Timestamp.</small>
                )}
              </div>
            )}

            {/* Section 5: Lyrics & Chord */}
            <div className="form-group">
              <div className="textarea-header">
                <label htmlFor="lyrics" style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
                  Lirik & Chord *
                  <span className="help-popover-container">
                    <span className="help-icon" tabIndex="0">❓</span>
                    <span className="help-popover">
                      <strong>Format Pengisian:</strong>
                      <ul>
                        <li><b>ChordPro:</b> <code>[C]Lirik baris pertama</code></li>
                        <li><b>Standar:</b> Chord di atas, lirik di bawah</li>
                        <li><b>Bar:</b> <code>|</code> untuk pemisah bar</li>
                        <li><b>Notasi Angka:</b> <code>1 2 3 4 | 5 5 6 5</code></li>
                        <li><b>Notasi Balok:</b> <code>C4 D4 E4 F4</code></li>
                      </ul>
                    </span>
                  </span>
                </label>
                <div className="template-buttons">
                  <button type="button" onClick={insertTemplate} className="btn btn-sm">
                    📋 ChordPro
                  </button>
                  <button type="button" onClick={insertStandardTemplate} className="btn btn-sm">
                    📋 Standard
                  </button>
                  <button type="button" onClick={formatChords} className="btn btn-sm btn-secondary">
                    ✨ Format Chord
                  </button>
                  <button type="button" onClick={convertStandardToChordPro} className="btn btn-sm btn-primary">
                    🔄 Convert ke ChordPro
                  </button>
                  <button type="button" onClick={() => setShowAi(true)} className="btn btn-sm btn-secondary">
                    🤖 AI
                  </button>
                  <button type="button" onClick={() => setShowTranscribe(true)} className="btn btn-sm">
                    🎤 Transkripsi
                  </button>
                </div>
              </div>
              <textarea
                id="lyrics"
                name="lyrics"
                value={formData.lyrics}
                onChange={handleChange}
                className={errors.lyrics ? 'error' : ''}
                placeholder="Copy-paste dari situs lain atau gunakan format ChordPro [C]lirik..."
                rows={14}
              />
              {errors.lyrics && <span className="error-message">{errors.lyrics}</span>}
            </div>

            {/* Action Buttons */}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                💾 {song ? 'Update Lagu' : 'Simpan Lagu'}
              </button>
              <button type="button" onClick={onCancel} className="btn" style={{ flex: 1 }}>
                Batal
              </button>
            </div>
          </form>
        </div>
      </div>

      {showAi && (
        <AiAssistant
          onClose={() => setShowAi(false)}
          song={{
            title: formData.title,
            artist: formData.artist,
            key: formData.key,
            lyrics: formData.lyrics,
          }}
        />
      )}



      {/* YouTube Search Modal */}
      {showYouTubeSearch && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px', maxHeight: '80vh', overflow: 'auto' }}>
            <button
              onClick={() => {
                setShowYouTubeSearch(false);
                setYoutubeSearchQuery('');
                setYoutubeResults([]);
                setSearchError('');
              }}
              className="btn-close"
              style={{ position: 'absolute', top: 18, right: 18, zIndex: 10 }}
              aria-label="Tutup"
            >
              ✕
            </button>
            <div className="modal-header">
              <h2 style={{ marginBottom: 0 }}>🎵 Cari Video YouTube</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label htmlFor="youtubeSearch">Kata Kunci Pencarian</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    id="youtubeSearch"
                    value={youtubeSearchQuery}
                    onChange={(e) => {
                      setYoutubeSearchQuery(e.target.value);
                      setSearchError('');
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        searchYouTube();
                      }
                    }}
                    placeholder="Contoh: Percaya Padaku Afgan"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={searchYouTube}
                    disabled={isSearching}
                    className="btn btn-primary"
                  >
                    {isSearching ? '⏳' : '🔍'}
                  </button>
                </div>
                <small style={{ display: 'block', marginTop: '0.35rem', color: 'var(--text-muted)' }}>
                  Masukkan judul lagu dan artis untuk mencari video
                </small>
              </div>

              {searchError && (
                <div style={{ color: '#ef4444', fontSize: '0.9rem', marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px' }}>
                  {searchError}
                  <br />
                  <small>💡 Tip: Dapatkan API Key gratis di Google Cloud Console → YouTube Data API v3</small>
                </div>
              )}

              {youtubeResults.length > 0 && (
                <div className="youtube-results">
                  <p style={{ marginBottom: '1rem', fontWeight: 600 }}>
                    {youtubeResults.length} video ditemukan - Klik untuk memilih:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {youtubeResults.map((video) => (
                      <div
                        key={video.id}
                        onClick={() => selectYouTubeVideo(video.id)}
                        style={{
                          display: 'flex',
                          gap: '1rem',
                          padding: '0.75rem',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          backgroundColor: 'var(--bg-secondary)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--primary)';
                          e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                        }}
                      >
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          style={{
                            width: '120px',
                            height: '90px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            flexShrink: 0
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{
                            margin: '0 0 0.25rem 0',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}>
                            {video.title}
                          </h4>
                          <p style={{
                            margin: 0,
                            fontSize: '0.85rem',
                            color: 'var(--text-muted)'
                          }}>
                            {video.channelTitle}
                          </p>
                          <p style={{
                            margin: '0.25rem 0 0 0',
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            fontFamily: 'monospace'
                          }}>
                            ID: {video.id}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isSearching && youtubeResults.length === 0 && youtubeSearchQuery && !searchError && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Klik tombol 🔍 untuk mencari video
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chord Search Modal */}
      {showChordSearch && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px', maxHeight: '85vh', overflow: 'auto' }}>
            <button
              onClick={() => {
                setShowChordSearch(false);
                setChordSearchUrl('');
                setChordSearchResults(null);
                setChordError('');
              }}
              className="btn-close"
              style={{ position: 'absolute', top: 18, right: 18, zIndex: 10 }}
              aria-label="Tutup"
            >
              ✕
            </button>
            <div className="modal-header">
              <h2 style={{ marginBottom: 0 }}>🔍 Cari Chord dari Situs</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label htmlFor="chordSearchUrl">URL Situs Chord</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <input
                    type="url"
                    id="chordSearchUrl"
                    value={chordSearchUrl}
                    onChange={(e) => {
                      setChordSearchUrl(e.target.value);
                      setChordError('');
                      setChordSearchResults(null);
                    }}
                    placeholder="https://chordtela.com/... atau situs chord lainnya"
                    autoFocus
                    style={{ flex: '1 1 300px' }}
                  />
                  <button
                    type="button"
                    onClick={() => searchChordFromUrl(chordSearchUrl)}
                    disabled={isLoadingChord}
                    className="btn btn-primary"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {isLoadingChord ? '⏳ Membuka...' : '🔍 Buka'}
                  </button>
                </div>
                <small style={{ display: 'block', marginTop: '0.35rem', color: 'var(--text-muted)' }}>
                  Paste URL dari situs chord seperti Chordtela, Chordify, atau Chord.co.id. Misal: https://chordtela.com/lagu/judullagu
                </small>

                {/* Popular sites quick links */}
                <div style={{ marginTop: '1rem' }}>
                  <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                    <strong>Situs Populer:</strong>
                  </small>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-xs"
                      onClick={() => {
                        setChordSearchUrl(`https://www.chordtela.com/chord-kunci-gitar-dasar-hasil-pencarian?q=${encodeURIComponent(formData.title || 'chord')}`);
                      }}
                      title="Chordtela"
                    >
                      Chordtela
                    </button>
                    <button
                      type="button"
                      className="btn btn-xs"
                      onClick={() => {
                        const title = formData.title || formData.artist || 'chord';
                        setChordSearchUrl(`https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(title)}`);
                      }}
                      title="Ultimate Guitar"
                    >
                      Ultimate Guitar
                    </button>
                    <button
                      type="button"
                      className="btn btn-xs"
                      onClick={() => {
                        setChordSearchUrl(`https://www.songsterr.com/?pattern=${encodeURIComponent(formData.title || 'chord')}`);
                      }}
                      title="Songsterr"
                    >
                      Songsterr
                    </button>
                    <button
                      type="button"
                      className="btn btn-xs"
                      onClick={() => {
                        const query = `${formData.title} ${formData.artist} chord`.trim();
                        setChordSearchUrl(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
                      }}
                      title="Google"
                    >
                      Google
                    </button>
                  </div>
                </div>
              </div>

              {chordError && (
                <div style={{ color: '#ef4444', fontSize: '0.9rem', marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px' }}>
                  {chordError}
                </div>
              )}

              {chordSearchResults && (
                <div style={{ marginTop: '1.5rem' }}>
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                      <strong>URL Situs:</strong>
                    </small>
                    <div style={{ 
                      padding: '0.75rem', 
                      backgroundColor: 'var(--bg-input)', 
                      borderRadius: '4px', 
                      wordBreak: 'break-all',
                      fontFamily: 'monospace',
                      fontSize: '0.9rem',
                      color: 'var(--text)',
                      marginBottom: '0.75rem'
                    }}>
                      {chordSearchResults.url}
                    </div>
                    <small style={{ color: 'var(--text-muted)' }}>
                      💡 Klik tombol "🔗 Buka di Tab Baru" untuk melihat chord secara langsung
                    </small>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        window.open(chordSearchResults.url, '_blank');
                      }}
                      className="btn btn-primary"
                      style={{ flex: '1 1 150px' }}
                    >
                      🔗 Buka di Tab Baru
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          navigator.clipboard.writeText(chordSearchResults.url);
                          setCopiedChord(true);
                          setTimeout(() => setCopiedChord(false), 2000);
                        } catch (error) {
                          setChordError('Gagal menyalin URL');
                        }
                      }}
                      className="btn btn-secondary"
                      style={{ flex: '1 1 150px' }}
                    >
                      {copiedChord ? '✓ URL Tersalin!' : '📋 Salin URL'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowChordSearch(false);
                        setChordSearchUrl('');
                        setChordSearchResults(null);
                        setChordError('');
                      }}
                      className="btn"
                      style={{ flex: '1 1 150px' }}
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              )}

              {!chordSearchResults && !chordError && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <p>Paste URL situs chord atau gunakan tombol situs populer di atas</p>
                  <p style={{ fontSize: '0.85rem' }}>Kemudian klik tombol 🔍 untuk mengambil chord</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transcribe Audio Modal */}
      {showTranscribe && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '80vh', overflow: 'auto' }}>
            <button
              onClick={() => {
                setShowTranscribe(false);
                setTranscribeFile(null);
                setTranscribeResult('');
                setTranscribeError('');
              }}
              className="btn-close"
              style={{ position: 'absolute', top: 18, right: 18, zIndex: 10 }}
              aria-label="Tutup"
            >
              ✕
            </button>
            <div className="modal-header">
              <h2 style={{ marginBottom: 0 }}>🎤 Transkripsi Audio ke Text</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label htmlFor="audioFile">Pilih File Audio</label>
                <input
                  type="file"
                  id="audioFile"
                  accept="audio/*"
                  onChange={(e) => {
                    setTranscribeFile(e.target.files?.[0] || null);
                    setTranscribeError('');
                    setTranscribeResult('');
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.75rem',
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    cursor: 'pointer'
                  }}
                />
                <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                  Format: MP3, WAV, M4A, OGG, WebM, dll. Max 25MB
                </small>
              </div>

              {transcribeFile && (
                <div style={{
                  padding: '0.75rem',
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  color: 'var(--text)'
                }}>
                  <strong>File dipilih:</strong> {transcribeFile.name}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={handleTranscribeFile}
                  disabled={!transcribeFile || transcribeLoading}
                  className={`btn btn-sm ${transcribeLoading ? '' : 'btn-primary'}`}
                  style={{ flex: 1 }}
                >
                  {transcribeLoading ? '⏳ Transkripsi...' : '🚀 Mulai Transkripsi'}
                </button>
              </div>

              {transcribeError && (
                <div style={{
                  padding: '0.75rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  color: '#f87171'
                }}>
                  <strong>Error:</strong> {transcribeError}
                </div>
              )}

              {transcribeResult && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Hasil Transkripsi:</label>
                  <textarea
                    readOnly
                    value={transcribeResult}
                    style={{
                      width: '100%',
                      height: '200px',
                      padding: '0.75rem',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontFamily: 'monospace',
                      fontSize: '0.9rem',
                      resize: 'vertical',
                      marginBottom: '0.75rem'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={pasteTranscribeResult}
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                    >
                      ✓ Paste ke Lirik
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(transcribeResult);
                        alert('✓ Copied to clipboard');
                      }}
                      className="btn btn-sm"
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAi && (
        <AiAssistant
          onClose={() => setShowAi(false)}
          song={{
            title: formData.title,
            artist: formData.artist,
            key: formData.key,
            lyrics: formData.lyrics,
          }}
        />
      )}
    </>
  );
};

export default SongFormBaru;