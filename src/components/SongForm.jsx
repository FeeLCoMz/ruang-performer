import React, { useState, useEffect } from 'react';
import AiAssistant from './AiAssistant';
// import SetlistPicker from './SetlistPicker';
import YouTubeViewer from './YouTubeViewer';
import AIAssistantModal from './AIAssistantModal';
import { transcribeAudio } from '../apiClient';

function extractYouTubeId(input) {
  if (!input) return null;
  // If already looks like an ID (11 chars, letters/numbers/-/_)
  const maybeId = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(maybeId)) return maybeId;

  // Try to extract from URL
  try {
    const url = new URL(maybeId.includes('http') ? maybeId : `https://${maybeId}`);
    // v= query param
    if (url.searchParams && url.searchParams.get('v')) return url.searchParams.get('v');
    // youtu.be short link
    if (url.hostname && url.pathname) {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length > 0) return parts[parts.length - 1];
    }
  } catch (e) {
    // not a full url, try regex fallback
    const m = maybeId.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
  }

  return null;
}

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
  // Lyrics history for undo
  const [lyricsHistory, setLyricsHistory] = useState([]);
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
  const [showTranscribe, setShowTranscribe] = useState(false);
  const [transcribeFile, setTranscribeFile] = useState(null);
  const [transcribeLoading, setTranscribeLoading] = useState(false);
  const [transcribeError, setTranscribeError] = useState('');
  const [transcribeResult, setTranscribeResult] = useState('');
  const [showFormatHelp, setShowFormatHelp] = useState(false);
  const [detectedFormat, setDetectedFormat] = useState(null);
  const [showConvertMenu, setShowConvertMenu] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showTextCleanMenu, setShowTextCleanMenu] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);

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
    let newValue = value;

    // Extract YouTube ID from URL if it's a YouTube field
    if (name === 'youtubeId' && value.trim()) {
      const extractedId = extractYouTubeId(value);
      if (extractedId) {
        newValue = extractedId;
      }
    }

    // Store previous lyrics for undo
    if (name === 'lyrics') {
      setLyricsHistory(prev => [formData.lyrics, ...prev].slice(0, 20)); // keep max 20 history
    }

    setFormData(prev => ({ ...prev, [name]: newValue }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Detect format when lyrics change
    if (name === 'lyrics' && newValue.trim()) {
      const hasChordProMarkup = newValue.includes('[') && newValue.includes(']') || newValue.match(/^\{[^}]+\}/m);
      setDetectedFormat(hasChordProMarkup ? 'ChordPro' : 'Standard');
    } else if (name === 'lyrics' && !newValue.trim()) {
      setDetectedFormat(null);
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
      title: (formData.title ?? '').toString().trim(),
      artist: (formData.artist ?? '').toString().trim(),
      youtubeId: (formData.youtubeId ?? '').toString().trim(),
      key: (formData.key ?? '').toString().trim(),
      tempo: (formData.tempo ?? '').toString().trim(),
      style: (formData.style ?? '').toString().trim(),
      lyrics: (formData.lyrics ?? '').toString().trim(),
      timestamps: Array.isArray(formData.timestamps) ? formData.timestamps : [],
      createdAt: song?.createdAt || new Date().toISOString()
    };
    onSave(songData);
  };

  const handleApplyAISuggestions = (suggestions) => {
    // Apply selected AI suggestions to form
    setFormData(prev => {
      const updated = { ...prev };
      if (suggestions.key) updated.key = suggestions.key;
      if (suggestions.tempo) updated.tempo = suggestions.tempo;
      if (suggestions.style) updated.style = suggestions.style;
      if (suggestions.youtubeId) updated.youtubeId = suggestions.youtubeId;
      return updated;
    });
    setShowAIAssistant(false);
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

      // Check for forbidden error (403) or other errors
      if (!response.ok) {
        if (response.status === 403) {
          // Open YouTube search in external browser
          const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeSearchQuery)}`;
          window.open(searchUrl, '_blank');
          setShowYouTubeSearch(false);
          setYoutubeSearchQuery('');
          setSearchError('');
          return;
        }
        throw new Error('Gagal mencari video YouTube');
      }

      const data = await response.json();
      
      if (data.error) {
        // Check for forbidden error in response
        if (data.error.code === 403 || data.error.status === 'PERMISSION_DENIED') {
          const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeSearchQuery)}`;
          window.open(searchUrl, '_blank');
          setShowYouTubeSearch(false);
          setYoutubeSearchQuery('');
          setSearchError('');
          return;
        }
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
    const baseKey = formData.key || 'C';
    const template = `{title: ${formData.title || 'Judul Lagu'}}\n{artist: ${formData.artist || 'Nama Artis'}}\n{key: ${baseKey}}\n{original_key: ${baseKey}}\n{time: 4/4}\n{tempo: 120}\n{capo: 0}\n{comment: Gunakan bracket [C] untuk menaruh chord di dalam lirik}\n\n{start_of_intro}\n[C]Intro baris pertama\n{end_of_intro}\n\n{start_of_verse}\n[C]Baris pertama dengan [G]inline chord\n[Am]Baris kedua lanjut [F]progression\n{end_of_verse}\n\n{start_of_chorus}\n[C]Hook utama ada di [G]chorus\n[Am]Baris kedua [F]chorus\n{end_of_chorus}\n\n{start_of_bridge}\n[Em]Bridge untuk perubahan [F]warna\n{end_of_bridge}\n\n{start_of_outro}\n[C]Outro penutup [G]lagu\n{end_of_outro}`;
    setFormData(prev => ({ ...prev, lyrics: template }));
  };

  const insertStandardTemplate = () => {
    const baseKey = formData.key || 'C';
    const template = `Title: ${formData.title || 'Judul Lagu'}\nArtist: ${formData.artist || 'Nama Artis'}\nKey: ${baseKey}\nOriginal Key: ${baseKey}\nTime: 4/4\nTempo: 120\nCapo: 0\n\nIntro:\nC               G\nIntro baris pertama dengan chord\n\nVerse:\nC               G               Am              F\nBaris pertama lirik dengan chord di atas lirik\nC               G               Am              F\nBaris kedua lirik dengan chord di atas lirik\n\nChorus:\nC               G               Am              F\nHook utama chorus\nAm              F\nBaris penutup chorus\n\nBridge:\nEm              F\nBridge untuk variasi\n\nOutro:\nC               G\nOutro penutup lagu`;
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

  // Convert ChordPro format to Standard format
  const convertChordProToStandard = () => {
    const text = formData.lyrics;
    if (!text.trim()) return;

    const lines = text.split('\n');
    const result = [];
    let currentSection = '';
    let chordLines = [];
    let lyricLines = [];

    // Support numbered sections (e.g., Intro 1, Verse 2, etc)
    const sectionPatterns = {
      intro: /\{start_of_intro\}|\[intro(\s*\d+)?\]|^intro(\s*\d+)?\s*:?/i,
      verse: /\{start_of_verse\}|\[verse(\s*\d+)?\]|^verse(\s*\d+)?\s*:?/i,
      chorus: /\{start_of_chorus\}|\[chorus(\s*\d+)?\]|^chorus(\s*\d+)?\s*:?/i,
      bridge: /\{start_of_bridge\}|\[bridge(\s*\d+)?\]|^bridge(\s*\d+)?\s*:?/i,
      outro: /\{start_of_outro\}|\[outro(\s*\d+)?\]|^outro(\s*\d+)?\s*:?/i,
      pre_chorus: /\{start_of_pre_chorus\}|\[pre_chorus(\s*\d+)?\]|^pre.?chorus(\s*\d+)?\s*:?/i,
      interlude: /\{start_of_interlude\}|\[interlude(\s*\d+)?\]|^interlude(\s*\d+)?\s*:?/i
    };

    // Function to generate section label with number if present
    const getSectionLabel = (sectionKey, line) => {
      const numMatch = line.match(/(\d+)/);
      const baseLabel = {
        intro: 'Intro',
        verse: 'Verse',
        chorus: 'Chorus',
        bridge: 'Bridge',
        outro: 'Outro',
        pre_chorus: 'Pre-Chorus',
        interlude: 'Interlude'
      }[sectionKey] || sectionKey;
      return numMatch ? `${baseLabel} ${numMatch[1]}:` : `${baseLabel}:`;
    };

    // Skip metadata lines
    let startIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/^\{[^}]+\}/) || line.match(/^(Title|Artist|Key|Original Key|Time|Tempo|Capo):/i)) {
        result.push(line);
        startIdx = i + 1;
      } else {
        break;
      }
    }

    // Process lyrics and chords
    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Treat lines with only whitespace as empty lines
      if (trimmed === '') {
        // Flush previous section if any content
        if (chordLines.length > 0 || lyricLines.length > 0) {
          if (currentSection) result.push(currentSection);
          for (let j = 0; j < Math.max(chordLines.length, lyricLines.length); j++) {
            if (chordLines[j]) result.push(chordLines[j]);
            if (lyricLines[j]) result.push(lyricLines[j]);
          }
          chordLines = [];
          lyricLines = [];
        }
        result.push('');
        currentSection = '';
        continue;
      }

      // Check for section markers
      let foundSection = false;
      for (const [sectionKey, pattern] of Object.entries(sectionPatterns)) {
        if (pattern.test(trimmed)) {
          // Flush previous section
          if (chordLines.length > 0 || lyricLines.length > 0) {
            if (currentSection) result.push(currentSection);
            for (let j = 0; j < Math.max(chordLines.length, lyricLines.length); j++) {
              if (chordLines[j]) result.push(chordLines[j]);
              if (lyricLines[j]) result.push(lyricLines[j]);
            }
            chordLines = [];
            lyricLines = [];
          }
          currentSection = getSectionLabel(sectionKey, trimmed);
          foundSection = true;
          break;
        }
      }

      if (foundSection || trimmed.match(/^\{end_of_\w+\}/) || trimmed.match(/^\{comment:/)) {
        continue; // Skip section markers and comments
      }

      // Check if line is chord line (contains [C] or similar patterns)
      const hasChordPro = /\[[A-G][#b]?[^\]]*\]/.test(line);

      if (hasChordPro) {
        // This is a chord line in ChordPro format - convert to standard
        let chordLine = '';
        let lyricLine = '';
        let pos = 0;

        const chordMatches = [];
        const chordRegex = /\[([^\]]+)\]/g;
        let match;
        while ((match = chordRegex.exec(line)) !== null) {
          chordMatches.push({ chord: match[1], index: match.index });
        }

        const textWithoutChords = line.replace(/\[([^\]]+)\]/g, '').trim();

        // Build chord line
        if (chordMatches.length > 0) {
          let spaces = 0;
          const firstChord = chordMatches[0].chord;
          chordLine = firstChord;
          spaces = Math.max(15 - firstChord.length, 1);

          for (let j = 1; j < chordMatches.length; j++) {
            const chord = chordMatches[j].chord;
            spaces = Math.max(15 - chord.length, 1);
            chordLine += ' '.repeat(spaces) + chord;
          }
        }

        if (chordLine) {
          chordLines.push(chordLine);
          if (textWithoutChords) {
            lyricLines.push(textWithoutChords);
          }
        } else {
          lyricLines.push(trimmed);
        }
      } else if (trimmed) {
        // Regular lyric line
        lyricLines.push(trimmed);
      }
    }

    // Flush last section
    if (chordLines.length > 0 || lyricLines.length > 0) {
      if (currentSection) result.push(currentSection);
      for (let j = 0; j < Math.max(chordLines.length, lyricLines.length); j++) {
        if (chordLines[j]) result.push(chordLines[j]);
        if (lyricLines[j]) result.push(lyricLines[j]);
      }
    }

    // Preserve empty lines exactly as in result
    setLyricsHistory(prev => [formData.lyrics, ...prev].slice(0, 20));
    setFormData(prev => ({ ...prev, lyrics: result.map(l => l === '' ? '' : l).join('\n') }));
  };

  // Text cleaning functions
  const applyTextCleaning = (action) => {
    const textarea = document.getElementById('lyrics');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const fullText = formData.lyrics;
    const selectedText = fullText.substring(start, end);
    const beforeText = fullText.substring(0, start);
    const afterText = fullText.substring(end);
    
    let cleanedText = selectedText || fullText;
    
    switch(action) {
      case 'trim':
        cleanedText = (selectedText || fullText).split('\n').map(line => line.trim()).join('\n');
        break;
      case 'remove-extra-spaces':
        cleanedText = (selectedText || fullText).split('\n').map(line => line.replace(/  +/g, ' ')).join('\n');
        break;
      case 'uppercase':
        cleanedText = (selectedText || fullText).toUpperCase();
        break;
      case 'lowercase':
        cleanedText = (selectedText || fullText).toLowerCase();
        break;
      case 'capitalize':
        cleanedText = (selectedText || fullText).split('\n').map(line => 
          line.charAt(0).toUpperCase() + line.slice(1)
        ).join('\n');
        break;
      case 'remove-empty-lines':
        cleanedText = (selectedText || fullText).split('\n').filter(line => line.trim()).join('\n');
        break;
      case 'normalize-spacing':
        cleanedText = (selectedText || fullText).split('\n').map(line => line.trim()).filter(line => line).join('\n');
        break;
      case 'sentence-case':
        cleanedText = (selectedText || fullText).split('\n').map(line => {
          return line.charAt(0).toUpperCase() + line.slice(1).toLowerCase();
        }).join('\n');
        break;
      default:
        break;
    }
    
    if (selectedText) {
      setFormData(prev => ({ ...prev, lyrics: beforeText + cleanedText + afterText }));
    } else {
      setFormData(prev => ({ ...prev, lyrics: cleanedText }));
    }
    
    setShowTextCleanMenu(false);
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
        <div className="modal-content song-form-modal">
          <button
            onClick={onCancel}
            className="btn-close songform-close-btn"
            aria-label="Tutup"
          >✕</button>
          <div className="modal-header songform-header">
            <h2>{song ? '✏️ Edit Lagu' : '✨ Tambah Lagu Baru'}</h2>
          </div>
          <form onSubmit={handleSubmit} className="song-form-grid">
            {/* Section 1: Basic Information */}
            <div className="form-row">
              <div className="form-group songform-flex2">
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
              <div className="songform-flex-row songform-flex1">
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => setShowAIAssistant(true)}
                  disabled={!formData.title && !formData.artist}
                  title="Cari informasi lagu dengan AI"
                >
                  🤖 AI
                </button>
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
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowAiChat(true)}
                  disabled={!formData.title && !formData.artist}
                  title="Chat AI tentang lagu ini"
                >
                  💬 Chat AI
                </button>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group songform-flex1">
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

            {/* Setlist Picker removed as requested */}

            {/* Section 2: Metadata (Key, Tempo, Style) */}
            <div className="form-row">
              <div className="form-group songform-flex1">
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
              <div className="form-group songform-flex1">
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
                <div className="songform-flex-row-center">
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
                  placeholder="ID atau URL YouTube (otomatis ekstrak ID dari URL)"
                />
                <small className="songform-youtube-hint">ID adalah kode setelah "v=" di URL YouTube, atau paste URL lengkapnya untuk ekstrak otomatis</small>
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
                <div className="textarea-header songform-align-center">
                  <label className="songform-flex-label">
                    ⏱️ Struktur Lagu (Timestamp)
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      Waktu saat ini: {fmtTime(currentVideoTime)} / {fmtTime(videoDuration)}
                    </span>
                  </label>
                  <div className="template-buttons songform-gap">
                    <select id="tsLabel" className="btn songform-minw-140" defaultValue="Verse">
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
                  <ul className="songform-timestamp-list">
                    {formData.timestamps.map((ts, idx) => (
                      <li key={idx} className="songform-timestamp-item">
                        <div className="songform-timestamp-label-col">
                          <strong className="songform-timestamp-label">{ts.label}</strong>
                          <small className="songform-timestamp-time">{fmtTime(ts.time)}</small>
                        </div>
                        <div className="songform-timestamp-btns">
                          <button type="button" className="btn btn-xs" onClick={() => seekToTimestamp(ts.time)} title="Putar dari timestamp">▶</button>
                          <button type="button" className="btn btn-xs btn-danger" onClick={() => removeTimestamp(idx)} title="Hapus">🗑</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <small className="songform-timestamp-empty">Belum ada timestamp. Pilih label lalu klik ➕ Tambah Timestamp.</small>
                )}
              </div>
            )}

            {/* Section 5: Lyrics & Chord */}
            <div className="form-group">
              <div className="textarea-header">
                <label htmlFor="lyrics" className="songform-flex-label">
                  Lirik & Chord *
                </label>
                <div className="songform-formathelp-btnrow">
                  <button
                    type="button"
                    className="btn btn-xs songform-formathelp-btn"
                    onClick={() => setShowFormatHelp(prev => !prev)}
                    title="Lihat format yang didukung"
                  >
                    ❓
                  </button>
                  {showFormatHelp && (
                    <div className="songform-formathelp-pop">
                      <div className="songform-formathelp-pop-header">
                        <strong>Format yang didukung</strong>
                        <button type="button" className="btn btn-xs" onClick={() => setShowFormatHelp(false)} title="Tutup">
                          ✕
                        </button>
                      </div>
                      <ul className="songform-formathelp-list">
                        <li><b>ChordPro:</b> metadata ({'{title}'}, {'{artist}'}, {'{key}'}, {'{original_key}'}, {'{time}'}, {'{tempo}'}, {'{capo}'}), penanda bagian ({'{start_of_verse}'}/{'{end_of_verse}'}, chorus, bridge, intro, outro), komentar {'{comment: ...}'}, dan inline chord [C] di dalam lirik.</li>
                        <li><b>Standard:</b> header metadata (Title, Artist, Key, Original Key, Time, Tempo, Capo), chord di atas lirik dengan penanda bagian ("Intro:", "Verse:", "Chorus:", dll.). Chord chart (baris hanya chord) juga boleh dicampur dengan lirik.</li>
                      </ul>
                    </div>
                  )}
                </div>
                <div className="template-buttons">
                  <div style={{ position: 'relative' }}>
                    <button type="button" onClick={() => setShowTemplateMenu(!showTemplateMenu)} className="btn btn-sm">
                      📋 Template ▼
                    </button>
                    {showTemplateMenu && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '0.5rem',
                        minWidth: '150px',
                        zIndex: 20,
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        boxShadow: '0 12px 28px rgba(0,0,0,0.18)'
                      }}>
                        <button
                          type="button"
                          onClick={() => {
                            insertTemplate();
                            setShowTemplateMenu(false);
                          }}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--border)',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={e => e.target.style.background = 'var(--card-hover)'}
                          onMouseLeave={e => e.target.style.background = 'transparent'}
                          title="Sisipkan template ChordPro"
                        >
                          ChordPro
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            insertStandardTemplate();
                            setShowTemplateMenu(false);
                          }}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={e => e.target.style.background = 'var(--card-hover)'}
                          onMouseLeave={e => e.target.style.background = 'transparent'}
                          title="Sisipkan template Standard"
                        >
                          Standard
                        </button>
                      </div>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <button type="button" onClick={() => setShowConvertMenu(!showConvertMenu)} className="btn btn-sm btn-primary">
                      � Convert ▼
                    </button>
                    {showConvertMenu && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '0.5rem',
                        minWidth: '180px',
                        zIndex: 20,
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        boxShadow: '0 12px 28px rgba(0,0,0,0.18)'
                      }}>
                        <button
                          type="button"
                          onClick={() => {
                            convertStandardToChordPro();
                            setShowConvertMenu(false);
                          }}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--border)',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={e => e.target.style.background = 'var(--card-hover)'}
                          onMouseLeave={e => e.target.style.background = 'transparent'}
                          title="Konversi Standard ke ChordPro"
                        >
                          → ke ChordPro
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            convertChordProToStandard();
                            setShowConvertMenu(false);
                          }}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={e => e.target.style.background = 'var(--card-hover)'}
                          onMouseLeave={e => e.target.style.background = 'transparent'}
                          title="Konversi ChordPro ke Standard"
                        >
                          → ke Standard
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (lyricsHistory.length > 0) {
                        setFormData(prev => ({ ...prev, lyrics: lyricsHistory[0] }));
                        setLyricsHistory(prev => prev.slice(1));
                      }
                    }}
                    className="btn btn-sm"
                    disabled={lyricsHistory.length === 0}
                    title={lyricsHistory.length === 0 ? 'Undo tidak tersedia' : 'Kembalikan lirik sebelumnya'}
                  >
                    ↩️ Undo
                  </button>
                  <button type="button" onClick={() => setShowTranscribe(true)} className="btn btn-sm">
                    🎤 Transkripsi
                  </button>
                  <div style={{ position: 'relative' }}>
                    <button type="button" onClick={() => setShowTextCleanMenu(!showTextCleanMenu)} className="btn btn-sm">
                      ✨ Rapikan ▼
                    </button>
                    {showTextCleanMenu && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '0.5rem',
                        minWidth: '200px',
                        zIndex: 20,
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        boxShadow: '0 12px 28px rgba(0,0,0,0.18)'
                      }}>
                        <button
                          type="button"
                          onClick={() => applyTextCleaning('trim')}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--border)',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={e => e.target.style.background = 'var(--card-hover)'}
                          onMouseLeave={e => e.target.style.background = 'transparent'}
                          title="Hapus spasi di awal & akhir"
                        >
                          ✂️ Potong Spasi
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTextCleaning('remove-extra-spaces')}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--border)',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={e => e.target.style.background = 'var(--card-hover)'}
                          onMouseLeave={e => e.target.style.background = 'transparent'}
                          title="Hapus spasi ganda"
                        >
                          📏 Hapus Spasi Ganda
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTextCleaning('remove-empty-lines')}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--border)',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={e => e.target.style.background = 'var(--card-hover)'}
                          onMouseLeave={e => e.target.style.background = 'transparent'}
                          title="Hapus baris kosong"
                        >
                          🗑️ Hapus Baris Kosong
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTextCleaning('uppercase')}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--border)',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={e => e.target.style.background = 'var(--card-hover)'}
                          onMouseLeave={e => e.target.style.background = 'transparent'}
                          title="Ubah ke HURUF BESAR"
                        >
                          🔤 HURUF BESAR
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTextCleaning('lowercase')}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--border)',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={e => e.target.style.background = 'var(--card-hover)'}
                          onMouseLeave={e => e.target.style.background = 'transparent'}
                          title="Ubah ke huruf kecil"
                        >
                          🔤 huruf kecil
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTextCleaning('capitalize')}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--border)',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={e => e.target.style.background = 'var(--card-hover)'}
                          onMouseLeave={e => e.target.style.background = 'transparent'}
                          title="Huruf pertama besar"
                        >
                          🔤 Kapitalisasi
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTextCleaning('sentence-case')}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--border)',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={e => e.target.style.background = 'var(--card-hover)'}
                          onMouseLeave={e => e.target.style.background = 'transparent'}
                          title="Kalimat normal"
                        >
                          🔤 Title Case
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTextCleaning('normalize-spacing')}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={e => e.target.style.background = 'var(--card-hover)'}
                          onMouseLeave={e => e.target.style.background = 'transparent'}
                          title="Normalkan spasi & baris"
                        >
                          🎯 Normalisasi Lengkap
                        </button>
                      </div>
                    )}
                  </div>
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
              {detectedFormat && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  <strong style={{ color: 'var(--primary)' }}>Format terdeteksi:</strong> {detectedFormat}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} title={song ? 'Update Lagu' : 'Simpan Lagu'}>
                💾
              </button>
              <button type="button" onClick={onCancel} className="btn" style={{ flex: 1 }} title="Batal">
                ✕
              </button>
            </div>
          </form>
        </div>
      </div>

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
                  <button
                    type="button"
                    onClick={() => {
                      if (youtubeSearchQuery.trim()) {
                        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeSearchQuery)}`;
                        window.open(searchUrl, '_blank');
                      }
                    }}
                    className="btn"
                    title="Buka pencarian di YouTube (eksternal)"
                  >
                    🌐
                  </button>
                </div>
                <small style={{ display: 'block', marginTop: '0.35rem', color: 'var(--text-muted)' }}>
                  Masukkan judul lagu dan artis untuk mencari video. Klik 🌐 untuk membuka YouTube secara eksternal.
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

      {/* AI Assistant Modal */}
      {showAIAssistant && (
        <AIAssistantModal
          formData={formData}
          onClose={() => setShowAIAssistant(false)}
          onApplySuggestions={handleApplyAISuggestions}
        />
      )}

      {/* AI Chat Modal */}
      {showAiChat && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: 480, margin: '40px auto', position: 'relative' }}>
            <button
              onClick={() => setShowAiChat(false)}
              className="btn btn-sm btn-danger"
              style={{ position: 'absolute', top: 12, right: 12 }}
            >✕</button>
            <AiAssistant song={song} onClose={() => setShowAiChat(false)} />
          </div>
        </div>
      )}

    </>
  );
};

export default SongFormBaru;