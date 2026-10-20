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
 * Model parsing (penting):
 *  - Header (artis/key/tempo/genre/birama/youtube/patch/partitur) hanya
 *    berlaku selama lagu belum punya baris lirik. Posisinya terhadap baris
 *    judul tidak masalah: boleh di atas judul, boleh di bawahnya.
 *  - Blok baru dibuka hanya ketika judul yang BERBEDA muncul.
 *  - Header tanpa judul yang kemudian diikuti lagu berjudul masuk ke lagu
 *    berjudul itu (chart siaran menyimpan satu header band di paling atas).
 *  - Header yang ditulis setelah lirik lagu sebelumnya menjadi milik lagu
 *    berikutnya ("Key: G" lalu "Judul: Lagu Dua").
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

const METADATA_LINE_REGEX = /^([A-Za-z][A-Za-z .]{0,24}?)\s*[:=]\s*(.*)$/;

/** Kata lirik yang kebetulan diawali "judul"; jangan dijadikan judul lagu. */
const TITLE_STOPWORDS = new Set(['keyakinan', 'keyakinanku']);

const KEY_SIGNATURE_REGEX = /^[A-G][#b]?(m|maj|min|minor|major|sus|dim|aug|add)?(\/[A-G][#b]?)?$/i;

/** Label seksi ("[Chorus]", "[Intro]", "[Verse 1]"). */
const SECTION_LABEL_REGEX = /^\[\s*(intro|outro|coda|verse|pre[- ]?chorus|chorus|post[- ]?chorus|reff|refrain|bridge|interlude|instrumental|musik|music|solo|int\.?)\b[^\]]*\]\s*[:-]?\s*$/i;
const SECTION_HEADER_REGEX = /^\[?\s*(intro|outro|coda|verse|pre[- ]?chorus|chorus|post[- ]?chorus|reff|refrain|bridge|interlude|instrumental|musik|music|solo|int\.?)\b[^:\]]*[:\]]\s*$/i;

const BLOCK_FIELDS = [
  'artist',
  'key',
  'tempo',
  'genre',
  'timeSignature',
  'youtubeId',
  'keyboardPatch',
  'sheetMusicXml',
];

function normalizeNewlines(text) {
  return String(text ?? '').replace(/\r\n?/g, '\n');
}

function normalizeLabel(label) {
  return String(label || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeTitle(rawTitle) {
  return String(rawTitle || '')
    .replace(/^#+\s*/, '')
    .replace(/^[|\-:]+|[|\-:]+$/g, '')
    .trim();
}

function splitSeparatorLine(line) {
  const match = line.trim().match(SEPARATOR_REGEX);
  if (!match) return null;
  return { title: match[2].trim() };
}

function parseMetadataLine(line) {
  const match = line.trim().match(METADATA_LINE_REGEX);
  if (!match) return null;
  const label = normalizeLabel(match[1]);
  const field = LABEL_LOOKUP.get(label);
  if (!field) return null;
  return { field, label, value: match[2].trim() };
}

/**
 * Cek apakah "Kata: nilai" benar-benar metadata lagu, bukan lirik. Nilai harus
 * masuk akal supaya baris seperti "Kunci: hatiku" tetap lirik.
 */
function isSongMetadata(metadata) {
  if (!metadata || !metadata.value) return false;
  switch (metadata.field) {
    case 'title':
      return !TITLE_STOPWORDS.has(metadata.label.replace(/\s+/g, ''));
    case 'key':
      return KEY_SIGNATURE_REGEX.test(metadata.value);
    case 'tempo':
      return /\d/.test(metadata.value);
    case 'youtube':
      return /youtu\.?be|^[A-Za-z0-9_-]{11}$|https?:/i.test(metadata.value);
    default:
      return true;
  }
}

/** Baris label seksi ("Verse", "[Outro]"): milik lirik, bukan judul lagu. */
function isSectionLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return true;
  if (SECTION_LABEL_REGEX.test(trimmed) || SECTION_HEADER_REGEX.test(trimmed)) return true;
  return /^(intro|outro|coda|verse\s*\d*|chorus|reff|bridge|interlude|solo)$/i.test(trimmed);
}

function createBlock(title) {
  return {
    title,
    artist: '',
    key: '',
    tempo: '',
    genre: '',
    timeSignature: '',
    youtubeId: '',
    keyboardPatch: '',
    sheetMusicXml: '',
    lyricsLines: [],
  };
}

const hasLyrics = (block) => Boolean(block && block.lyricsLines.some((line) => line.trim()));

const hasHeader = (block) => BLOCK_FIELDS.some((field) => block[field]);

const isEmptyBlock = (block) => !block.title && !hasLyrics(block) && !hasHeader(block);

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
  let lastTitle = '';
  /**
   * Header yang belum (pasti) punya judul. Disimpan berurutan:
   * [{ field, value }]. Header di atas judul berikutnya ikut pindah ke lagu
   * itu; header di bawah judul lagu ini dikembalikan ke lagu ini.
   */
  let headerQueue = [];

  const applyHeader = (block, field, value) => {
    if (field === 'sheetMusic') {
      // "Partitur: tidak ada" bukan MusicXML.
      if (/xml|score|ada/i.test(value)) block.sheetMusicXml = value;
      return;
    }
    if (field === 'youtube') {
      block.youtubeId = value;
      return;
    }
    block[field] = value;
  };

  /** Header blok tanpa judul hanya milik lagu berjudul berikutnya. */
  const isAnonHeaderBlock = (block) => Boolean(block && !block.title && !hasLyrics(block) && hasHeader(block));

  const commitCurrent = (forAnotherSong = false) => {
    if (!current || isEmptyBlock(current)) return;
    if (forAnotherSong && isAnonHeaderBlock(current)) return;
    blocks.push(current);
  };

  const startSong = (title) => {
    // Header anonim (blok tanpa judul & tanpa lirik) menjadi milik lagu
    // berjudul yang muncul sekarang.
    const anonHeaders = isAnonHeaderBlock(current) ? current : null;
    const queued = [...headerQueue];
    headerQueue = [];
    if (current && !isEmptyBlock(current) && !anonHeaders) blocks.push(current);
    current = createBlock(title);
    lastTitle = title;
    [anonHeaders, queued].forEach((source) => {
      if (!source) return;
      BLOCK_FIELDS.forEach((field) => {
        if (source[field] && !current[field]) applyHeader(current, field, source[field]);
      });
    });
  };

  const closeSong = () => {
    commitCurrent();
    current = createBlock('');
    headerQueue = [];
    lastTitle = '';
  };

  const defineTitle = (title) => {
    if (!title) return;
    if (current && title.toLowerCase() === lastTitle.toLowerCase()) {
      // Judul berulang: lanjutan lagu yang sama, bukan lagu baru.
      current.title = current.title || title;
      return;
    }
    startSong(title);
  };

  for (const rawLine of lines) {
    const separator = splitSeparatorLine(rawLine);

    if (separator) {
      const explicitTitle = normalizeTitle(separator.title);
      if (explicitTitle) {
        // "## Judul" = penanda judul lagu.
        defineTitle(explicitTitle);
      } else if (current && (hasLyrics(current) || current.title)) {
        // "===" / "---" tanpa judul = penutup lagu aktif (bukan garis dekorasi
        // di bawah header judul).
        closeSong();
      }
      continue;
    }

    if (!current) {
      if (!rawLine.trim()) continue;
      current = createBlock('');
      headerQueue = [];
    }

    const metadata = parseMetadataLine(rawLine);
    if (!metadata || !isSongMetadata(metadata)) {
      current.lyricsLines.push(rawLine);
      continue;
    }

    if (metadata.field === 'title') {
      const nextTitle = normalizeTitle(metadata.value);
      if (isSectionLine(nextTitle)) {
        // "Judul: Verse 2" / "Judul: Outro" adalah label bagian, bukan judul.
        current.lyricsLines.push(rawLine);
        continue;
      }
      // "Judul:" dengan nilai kosong bukan penanda lagu baru.
      if (nextTitle) defineTitle(nextTitle);
      continue;
    }

    const lyricsStarted = hasLyrics(current);

    if (!lyricsStarted) {
      // Header lagu: posisinya relatif terhadap judul tidak penting.
      applyHeader(current, metadata.field, metadata.value);
      // Blok tanpa judul: header ini menunggu judul. Bila judul yang muncul
      // berikutnya berbeda, header pindah ke lagu itu (tidak tertinggal sebagai
      // lagu tanpa judul). Header tetap disimpan di antrean meski sudah
      // diterapkan ke blok ini, supaya bisa ikut pindah.
      if (!current.title) {
        headerQueue = [...headerQueue.filter((item) => item.field !== metadata.field), {
          field: metadata.field,
          value: metadata.value,
        }];
      }
      continue;
    }

    // Setelah lirik dimulai, header dicatat sebagai calon header lagu berikutnya.
    // Hanya bila header ini ditulis setelah lagu berjudul & berlirik: "Key: G"
    // tepat di atas "Judul: Lagu Dua" milik lagu kedua.
    const isNextSongHeader = Boolean(current.title && lyricsStarted);
    if (isNextSongHeader) {
      headerQueue = [...headerQueue, { field: metadata.field, value: metadata.value }];
    }
  }

  commitCurrent();

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
