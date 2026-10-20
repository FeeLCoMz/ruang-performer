/**
 * bulkLyricsParser.js
 *
 * Parser untuk modul Bulk Add Lirik & Chord.
 *
 * Contoh input:
 *
 *   ## Judul Lagu
 *   Artis: Nama Artis
 *   Key: C
 *   Tempo: 120
 *   [Intro] C G Am F
 *   Ku menunggu...
 *
 *   ## Lagu Kedua
 *
 * Pemisah blok: "## Judul", "# Judul", "===", "---", atau baris "Judul: ...".
 * Metadata blok: Artis, Key/Nada, Tempo/BPM, Genre, Time Signature/Birama,
 * YouTube, Keyboard Patch, Partitur.
 *
 * Modul ini murni fungsi (tanpa React/DOM) agar mudah diuji.
 */

import { formatWholeLyricsDocument } from '../../utils/lyricsEditorUtils.js';
import { validateMusicalFields } from '../../utils/songFormUtils.js';
import { extractYouTubeId } from '../../utils/youtubeUtils.js';

/** Baris pemisah blok: "## Judul", "# Judul", "===", "---". */
const SEPARATOR_REGEX = /^(#{1,6}|={3,}|-{3,})\s*(.*)$/;

/**
 * Label metadata yang dikenali. Hanya label ini yang dipotong dari lirik,
 * sehingga baris seperti "Ku: mencintaimu" tetap utuh.
 */
const METADATA_LABELS = {
  title: ['judul', 'title'],
  artist: ['artis', 'artist', 'band', 'penyanyi'],
  key: ['key', 'nada', 'nada dasar', 'kunci'],
  tempo: ['tempo', 'bpm'],
  genre: ['genre', 'aliran'],
  timeSignature: ['time signature', 'time', 'birama', 'sukatan'],
  youtube: ['youtube', 'youtube id', 'yt', 'video'],
  keyboardPatch: ['keyboard patch', 'patch', 'sound'],
  sheetMusic: ['partitur', 'sheet music', 'musicxml', 'sheet'],
};

const LABEL_LOOKUP = new Map(
  Object.entries(METADATA_LABELS).flatMap(([field, labels]) => labels.map((label) => [label, field])),
);

const METADATA_LINE_REGEX = /^([A-Za-z][A-Za-z ]{0,20})\s*[:=]\s*(.*)$/;

function normalizeNewlines(text) {
  return String(text ?? '').replace(/\r\n?/g, '\n');
}

function splitSeparatorLine(line) {
  const match = line.trim().match(SEPARATOR_REGEX);
  if (!match) return null;
  return { title: match[2].trim() };
}

function parseMetadataLine(line) {
  const match = line.trim().match(METADATA_LINE_REGEX);
  if (!match) return null;
  const label = match[1].trim().toLowerCase().replace(/\s+/g, ' ');
  const field = LABEL_LOOKUP.get(label);
  if (!field) return null;
  return { field, value: match[2].trim() };
}

function normalizeTitle(rawTitle) {
  return String(rawTitle || '')
    .replace(/^#+\s*/, '')
    .replace(/^[|\-:]+|[|\-:]+$/g, '')
    .trim();
}

/**
 * Pecah teks mentah menjadi blok-blok lagu.
 *
 * @param {string} text
 * @returns {Array<{ title: string, artist: string, key: string, tempo: string,
 *   genre: string, timeSignature: string, youtubeId: string,
 *   keyboardPatch: string, sheetMusicXml: string, lyrics: string }>}
 */
export function splitBulkSongBlocks(text) {
  const lines = normalizeNewlines(text).split('\n');
  const blocks = [];
  let current = null;

  const hasBlockContent = (block) => Boolean(
    block
    && (
      block.lyricsLines.some((line) => line.trim())
      || block.title
      || block.artist
      || block.key
      || block.tempo
      || block.genre
    ),
  );

  /** Tutup blok aktif. Blok kosong (tanpa lirik & metadata) tidak ikut masuk. */
  const finishBlock = () => {
    if (current && hasBlockContent(current)) blocks.push(current);
    current = null;
  };

  /** Mulai blok baru; blok aktif yang kosong dibuang. */
  const openBlock = (initial = {}) => {
    finishBlock();
    current = {
      title: '',
      artist: '',
      key: '',
      tempo: '',
      genre: '',
      timeSignature: '',
      youtubeId: '',
      keyboardPatch: '',
      sheetMusicXml: '',
      lyricsLines: [],
      ...initial,
    };
  };

  for (const rawLine of lines) {
    const separator = splitSeparatorLine(rawLine);

    if (separator) {
      const explicitTitle = normalizeTitle(separator.title);
      if (explicitTitle) {
        // "## Judul" / "Judul: ..." = awal lagu baru.
        openBlock({ title: explicitTitle });
      } else {
        // "===" / "---" tanpa judul = penutup blok aktif.
        finishBlock();
      }
      continue;
    }

    if (!current) {
      // Teks sebelum pemisah pertama menjadi blok pertama.
      if (!rawLine.trim()) continue;
      openBlock();
    }

    const metadata = parseMetadataLine(rawLine);
    // Metadata hanya berlaku sebelum lirik dimulai. Setelah itu baris seperti
    // "[Keys: Piano]" atau "Key: ..." adalah bagian aransemen/lirik.
    const lyricsStarted = current.lyricsLines.some((line) => line.trim());
    if (metadata && !lyricsStarted) {
      if (metadata.field === 'title') {
        const nextTitle = normalizeTitle(metadata.value);
        if (nextTitle) openBlock({ title: nextTitle });
      } else if (metadata.field === 'youtube') {
        current.youtubeId = metadata.value;
      } else if (metadata.field === 'sheetMusic') {
        // "Partitur: tidak ada" bukan MusicXML.
        if (/xml|score|ada/i.test(metadata.value)) current.sheetMusicXml = metadata.value;
      } else {
        current[metadata.field] = metadata.value;
      }
      continue;
    }

    current.lyricsLines.push(rawLine);
  }

  finishBlock();

  return blocks.map(({ lyricsLines, ...rest }) => ({
    ...rest,
    lyrics: lyricsLines.join('\n').replace(/^\n+|\n+$/g, ''),
  }));
}

function parseTempoValue(value) {
  const match = String(value || '').match(/\d{2,3}/);
  return match ? match[0] : '';
}

/**
 * Tebak judul dari baris lirik saat blok tidak punya judul. Hasil tebakan
 * tetap ditandai sebagai error supaya user memeriksanya sebelum menyimpan.
 */
function guessTitleFromLyrics(lyrics) {
  const candidates = normalizeNewlines(lyrics)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);

  const candidate = candidates.find((line) => {
    if (line.length < 3 || line.length > 80) return false;
    if (/^[\s[\]():|.]*$/.test(line)) return false;
    const wordCount = line.split(/\s+/).length;
    return wordCount >= 2 && wordCount <= 12;
  });

  return candidate || '';
}

/**
 * Ubah blok mentah menjadi record siap-simpan + daftar masalah.
 *
 * @param {Array<Object>} blocks Hasil splitBulkSongBlocks (atau blok manual).
 * @param {Object} [options]
 * @param {boolean} [options.autoFormat=true] Rapikan lirik dengan formatWholeLyricsDocument.
 * @param {string} [options.defaultKey] Key dipakai bila blok tidak punya key.
 * @param {string} [options.defaultTempo] Tempo dipakai bila blok tidak punya tempo.
 * @param {string} [options.defaultTimeSignature] Birama default.
 * @param {boolean} [options.guessTitle=false] Tebak judul dari lirik.
 */
export function buildBulkSongRecords(blocks, options = {}) {
  const {
    autoFormat = true,
    defaultKey = '',
    defaultTempo = '',
    defaultTimeSignature = '',
    guessTitle = false,
  } = options;

  return (Array.isArray(blocks) ? blocks : [])
    .filter((block) => block && (String(block.title || '').trim() || String(block.lyrics || '').trim()))
    .map((block, index) => {
      const errors = [];
      const originalTitle = String(block.title || '').trim();
      const guessedTitle = !originalTitle && guessTitle ? guessTitleFromLyrics(block.lyrics) : '';
      const title = originalTitle || guessedTitle;

      if (!title) {
        errors.push('Judul lagu wajib diisi.');
      } else if (!originalTitle) {
        errors.push(`Judul belum ditulis - sementara dipakai "${title}". Periksa kembali.`);
      }

      const tempo = parseTempoValue(block.tempo || defaultTempo);
      const songKey = String(block.key || defaultKey || '').trim();
      const timeSignature = String(block.timeSignature || defaultTimeSignature || '4/4').trim();
      const youtubeId = block.youtubeId ? extractYouTubeId(block.youtubeId) || block.youtubeId : '';

      const lyricsText = String(block.lyrics || '').trim();
      if (!lyricsText) errors.push('Lirik & chord masih kosong.');

      const musicalErrors = validateMusicalFields({ key: songKey, timeSignature, tempo });
      Object.values(musicalErrors).forEach((message) => {
        if (message) errors.push(message);
      });

      if (block.youtubeId && /^https?:/i.test(block.youtubeId) && !extractYouTubeId(block.youtubeId)) {
        errors.push('URL YouTube tidak dikenali.');
      }

      const lyrics = autoFormat && lyricsText ? formatWholeLyricsDocument(lyricsText) : lyricsText;

      return {
        index,
        title,
        artist: String(block.artist || '').trim(),
        key: songKey,
        tempo,
        timeSignature,
        genre: String(block.genre || '').trim(),
        youtubeId,
        keyboardPatch: String(block.keyboardPatch || '').trim(),
        sheetMusicXml: String(block.sheetMusicXml || '').trim(),
        lyrics,
        errors,
        titleGuessed: Boolean(!originalTitle && guessedTitle),
      };
    });
}

/**
 * Konversi record preview menjadi payload yang dipahami /api/songs/bulk.
 * Hanya record tanpa error yang dikirim.
 */
export function recordsToSongPayloads(records, { bandId = '' } = {}) {
  return (Array.isArray(records) ? records : [])
    .filter((record) => record && Array.isArray(record.errors) && record.errors.length === 0)
    .map((record) => {
      const song = {
        title: record.title,
        artist: record.artist || '',
        key: record.key || '',
        tempo: record.tempo || '',
        time_signature: record.timeSignature || '4/4',
        genre: record.genre || '',
        lyrics: record.lyrics || '',
        youtubeId: record.youtubeId || '',
        keyboardPatch: record.keyboardPatch || '',
        sheetMusicXml: record.sheetMusicXml || '',
      };
      if (bandId) song.bandId = bandId;
      return song;
    });
}

/** Ringkasan: berapa lagu siap simpan dan berapa yang perlu diperbaiki. */
export function summarizeBulkRecords(records) {
  const list = Array.isArray(records) ? records : [];
  const isReady = (record) => Array.isArray(record.errors) && record.errors.length === 0;
  const readyCount = list.filter(isReady).length;
  return {
    total: list.length,
    readyCount,
    errorCount: list.length - readyCount,
    withLyrics: list.filter((record) => String(record.lyrics || '').trim()).length,
  };
}

export const DEMO_BULK_SONGS = `## Contoh Lagu Satu
Artis: Nama Artis
Key: C
Tempo: 92
Genre: Pop
Time Signature: 4/4

[Verse 1]
C            G
Ku menunggu di sini
Am           F
Sampai pagi menjelang

[Chorus]
C            G
Bawa aku pulang
Am           F
Ke tempat kita bertemu

## Contoh Lagu Dua
Artis: Nama Artis
Key: Am
Tempo: 120

[Intro] Am G F E
[Verse]
Am             G
Malam ini bintang bicara
F              E
Tentang kita dan semesta`;
