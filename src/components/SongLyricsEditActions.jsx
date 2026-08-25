import React, { useMemo, useState } from "react";
import {
  autoAlignChordLyricPairs,
  autoTagSongSections,
  detectSectionBadges,
  insertLineAtCursor,
  removeExtraSpacesAndBrokenLines,
  standardizeChordNotation,
  transposeLyricsText,
} from "../utils/lyricsEditorUtils.js";
import { GM_SOUND_CATEGORIES, GM_SOUND_BANK, filterGmSoundBankByCategory, formatGmPatchOptionLabel } from '../utils/gmSoundbank.js';

const LAST_MIDI_CHANNEL_STORAGE_KEY = 'ruangperformer_last_midi_channel';

const INSERT_KEY_OPTIONS = [
  'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
  'Am', 'Em', 'Bm', 'Dm', 'Gm', 'Cm'
];

const SECTION_LABELS = [
  { label: "Intro", value: "[Intro]" },
  { label: "Verse 1", value: "[Verse 1]" },
  { label: "Verse 2", value: "[Verse 2]" },
  { label: "Pre-Chorus", value: "[Pre-Chorus]" },
  { label: "Post-Chorus", value: "[Post-Chorus]" },
  { label: "Chorus", value: "[Chorus]" },
  { label: "Bridge", value: "[Bridge]" },
  { label: "Interlude", value: "[Interlude]" },
  { label: "Outro", value: "[Outro]" },
  { label: "Coda", value: "[Coda]" },
];

const METADATA_HELP_ITEMS = [
  {
    title: "Struktur Lagu",
    description: "Penanda bagian lagu yang akan ditampilkan sebagai section.",
    examples: ["[Intro]", "Verse:", "Chorus:", "Bridge:", "Outro:"],
  },
  {
    title: "Label Instrumen",
    description: "Baris nama instrumen untuk panduan pemain.",
    examples: ["[Piano]", "Guitar:", "Brass:", "Vokal:"],
  },
  {
    title: "Patch Instrumen",
    description: "Metadata patch/layer keyboard dalam satu baris.",
    examples: [
      "Patch: Stage Piano | Layer: Warm Pad (Volume 30%)",
      "Patch: EP Soft | Split: Bass",
      "Preset: Ballad Keys | Scene: Verse",
    ],
  },
  {
    title: "Preset Cue MIDI",
    description: "Patch keyboard yang bisa trigger Program Change otomatis/manual.",
    examples: [
      "[Keys: Acoustic Grand Piano | PC: 0 | CH: 1]",
      "[Guitar: Lead 2 (sawtooth) | PC: 81 | CH: 2]",
    ],
  },
  {
    title: "Metadata Aransemen",
    description: "Catatan perform berbasis key:value.",
    examples: [
      "Intensitas: 1",
      "Cue: Drum masuk di bar 9",
      "Notes: Main tipis di verse",
      "FX: Hall Reverb",
      "Feel: Half-time",
    ],
  },
  {
    title: "Modulasi",
    description: "Perintah perubahan key di tengah lagu.",
    examples: ["Modulation: G", "Key change: A"],
  },
  {
    title: "Original Key",
    description: "Informasi key asli lagu (tidak ikut ditranspose).",
    examples: ["Original Key: C"],
  },
  {
    title: "Timestamp",
    description: "Penanda waktu yang bisa diklik di tampilan chord.",
    examples: ["[01:23]", "[1:02:03]"],
  },
];

export default function SongLyricsEditActions({
  disabled,
  barsPerLine,
  setBarsPerLine,
  handleAlignSelectedBarlines,
  handleWrap4BarsPerLine,
  handleWrapBarsPerLine,
  showMetadataHelpButton = true,
  showSaveCancelButtons = false,
  savingLyrics = false,
  handleSaveLyrics,
  handleCancelEditLyrics,
  barsPerLineSelectId = "bars-per-line",
  showPianoControls = false,
  onOpenPiano,
  insertNotesEnabled = false,
  onToggleInsertNotes,
  insertNoteFormat = "bracket",
  onChangeInsertNoteFormat,
  insertTrailingSpace = false,
  onToggleInsertTrailingSpace,
  keySignature = "",
  onChangeInsertNumberKeySignature,
  lyricsRef,
  lyricsValue = "",
  setLyricsValue,
}) {
  const [showMetadataHelp, setShowMetadataHelp] = useState(false);
  const [selectedGmCategory, setSelectedGmCategory] = useState('piano-keys');
  const [selectedGmProgram, setSelectedGmProgram] = useState(0);
  const [selectedGmChannel, setSelectedGmChannel] = useState(() => {
    if (typeof window === 'undefined') return 1;
    const stored = Number.parseInt(window.localStorage.getItem(LAST_MIDI_CHANNEL_STORAGE_KEY) || '1', 10);
    if (!Number.isFinite(stored) || stored < 1 || stored > 16) return 1;
    return stored;
  });
  const metadataSections = useMemo(() => METADATA_HELP_ITEMS, []);
  const detectedSectionBadges = useMemo(() => detectSectionBadges(lyricsValue), [lyricsValue]);
  const filteredGmSounds = useMemo(() => {
    const filtered = filterGmSoundBankByCategory(selectedGmCategory);
    return filtered.length ? filtered : GM_SOUND_BANK;
  }, [selectedGmCategory]);
  const selectedGmPatch = useMemo(() => {
    const parsedProgram = Number(selectedGmProgram);
    return GM_SOUND_BANK.find((item) => item.program === parsedProgram) || filteredGmSounds[0] || GM_SOUND_BANK[0];
  }, [selectedGmProgram, filteredGmSounds]);

  const ensureSelectedProgramInCategory = (categoryValue) => {
    const candidateSounds = filterGmSoundBankByCategory(categoryValue);
    if (!candidateSounds.length) return;
    const hasSelected = candidateSounds.some((item) => item.program === Number(selectedGmProgram));
    if (!hasSelected) {
      setSelectedGmProgram(candidateSounds[0].program);
    }
  };

  const handleInsertSection = (sectionLabel) => {
    if (!lyricsRef?.current || typeof setLyricsValue !== 'function') return;
    const el = lyricsRef.current;
    const { nextText, nextCursor } = insertLineAtCursor({
      text: lyricsValue,
      selectionStart: el.selectionStart,
      label: sectionLabel,
    });
    setLyricsValue(nextText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  };

  const applyTextTransform = (transformer) => {
    if (typeof setLyricsValue !== "function") return;
    const nextText = transformer(lyricsValue);
    if (typeof nextText !== "string" || nextText === lyricsValue) return;

    const el = lyricsRef?.current;
    const nextCursor = Math.min(el?.selectionStart ?? nextText.length, nextText.length);
    setLyricsValue(nextText);

    setTimeout(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  };

  const handleInsertGmCue = () => {
    if (!lyricsRef?.current || typeof setLyricsValue !== 'function') return;

    const el = lyricsRef.current;
    const channel = Number.isFinite(Number(selectedGmChannel)) ? Number(selectedGmChannel) : 1;
    const program = Number.isFinite(Number(selectedGmProgram)) ? Number(selectedGmProgram) : 0;
    const patchName = selectedGmPatch?.name || 'GM Patch';
    const cueLine = `[Keys: ${patchName} | PC: ${program} | CH: ${channel}]`;

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LAST_MIDI_CHANNEL_STORAGE_KEY, String(channel));
    }

    const { nextText, nextCursor } = insertLineAtCursor({
      text: lyricsValue,
      selectionStart: el.selectionStart,
      label: cueLine,
    });

    setLyricsValue(nextText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  };

  return (
    <>
      <div className="song-lyrics-edit-actions">
        <div className="song-lyrics-edit-actions-group song-lyrics-edit-actions-group-sections">
          <span className="song-lyrics-action-group-title">Section Builder</span>
          <span className="song-lyrics-sections-label">Bagian:</span>
          <div className="song-lyrics-section-chip-list" role="group" aria-label="Section templates">
            {SECTION_LABELS.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                className="btn btn-secondary song-lyrics-section-btn"
                disabled={disabled}
                title={`Sisipkan ${value}`}
                onClick={() => handleInsertSection(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="song-lyrics-edit-actions-group song-lyrics-edit-actions-group-format">
          <span className="song-lyrics-action-group-title">Alignment & Grid</span>
          <button
            type="button"
            onClick={handleAlignSelectedBarlines}
            disabled={disabled}
            className="btn btn-secondary"
            title="Sejajarkan garis bar (|) pada teks yang dipilih"
          >
            ∥ Sejajar
          </button>
          <button
            type="button"
            onClick={() => applyTextTransform(autoAlignChordLyricPairs)}
            disabled={disabled}
            className="btn btn-secondary"
            title="Deteksi chord line di atas lirik dan rapikan posisinya agar sejajar dengan suku kata"
          >
            ⇅ Auto-Align
          </button>
          <button
            type="button"
            onClick={handleWrap4BarsPerLine}
            disabled={disabled}
            className="btn btn-secondary"
            title="Pecah otomatis menjadi 4 bar per baris pada teks yang dipilih"
          >
            ↩ 4/Baris
          </button>
          <div className="song-lyrics-bar-wrap-controls">
            <label htmlFor={barsPerLineSelectId} className="song-lyrics-bar-wrap-label">Bar/Baris</label>
            <select
              id={barsPerLineSelectId}
              className="song-lyrics-bar-wrap-select"
              value={barsPerLine}
              onChange={(e) => setBarsPerLine(Number(e.target.value))}
              disabled={disabled}
              aria-label="Pilih jumlah bar per baris"
            >
              <option value={2}>2</option>
              <option value={4}>4</option>
              <option value={6}>6</option>
            </select>
            <button
              type="button"
              onClick={() => handleWrapBarsPerLine(barsPerLine)}
              disabled={disabled}
              className="btn btn-secondary"
              title="Terapkan jumlah bar per baris pada teks yang dipilih"
            >
              Terapkan
            </button>
          </div>
        </div>
        <div className="song-lyrics-edit-actions-group song-lyrics-edit-actions-group-cleanup">
          <span className="song-lyrics-action-group-title">Cleanup & Structure</span>
          <button
            type="button"
            onClick={() => applyTextTransform(removeExtraSpacesAndBrokenLines)}
            disabled={disabled}
            className="btn btn-secondary"
            title="Hapus spasi ganda, tab, baris kosong menumpuk, dan karakter tersembunyi dari hasil copy-paste"
          >
            ✨ Bersihkan Teks
          </button>
          <button
            type="button"
            onClick={() => applyTextTransform(autoTagSongSections)}
            disabled={disabled}
            className="btn btn-secondary"
            title="Deteksi Intro, Verse, Chorus, Bridge, dan normalisasi menjadi tag section"
          >
            🏷 Tag Bagian
          </button>
          <button
            type="button"
            onClick={() => applyTextTransform(standardizeChordNotation)}
            disabled={disabled}
            className="btn btn-secondary"
            title="Standarkan format penulisan chord seperti min/minor/Maj menjadi format yang konsisten"
          >
            ♫ Standarkan Chord
          </button>
        </div>
        <div className="song-lyrics-edit-actions-group song-lyrics-edit-actions-group-transpose">
          <span className="song-lyrics-action-group-title">Quick Transpose</span>
          <span className="song-lyrics-sections-label">Transpose Teks:</span>
          <button
            type="button"
            onClick={() => applyTextTransform((text) => transposeLyricsText(text, -1))}
            disabled={disabled}
            className="btn btn-secondary"
            title="Turunkan semua chord dalam teks satu semitone"
          >
            -1
          </button>
          <button
            type="button"
            onClick={() => applyTextTransform((text) => transposeLyricsText(text, 1))}
            disabled={disabled}
            className="btn btn-secondary"
            title="Naikkan semua chord dalam teks satu semitone"
          >
            +1
          </button>
        </div>
        <div className="song-lyrics-edit-actions-group song-lyrics-edit-actions-group-gm-cue">
          <span className="song-lyrics-action-group-title">Keyboard Patch Builder</span>
          <div className="song-lyrics-gm-cue-controls">
            <label className="song-lyrics-gm-cue-field" htmlFor="gm-cue-category-select">
              Kategori Sound
              <select
                id="gm-cue-category-select"
                className="song-lyrics-bar-wrap-select"
                value={selectedGmCategory}
                onChange={(e) => {
                  const nextCategory = e.target.value;
                  setSelectedGmCategory(nextCategory);
                  ensureSelectedProgramInCategory(nextCategory);
                }}
                disabled={disabled}
              >
                {GM_SOUND_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
            </label>
            <label className="song-lyrics-gm-cue-field" htmlFor="gm-cue-patch-select">
              Soundbank GM
              <select
                id="gm-cue-patch-select"
                className="song-lyrics-bar-wrap-select song-lyrics-gm-cue-patch-select"
                value={String(selectedGmProgram)}
                onChange={(e) => setSelectedGmProgram(Number(e.target.value))}
                disabled={disabled}
              >
                {filteredGmSounds.map((patch) => (
                  <option key={patch.program} value={String(patch.program)}>
                    {formatGmPatchOptionLabel(patch)}
                  </option>
                ))}
              </select>
            </label>
            <label className="song-lyrics-gm-cue-field" htmlFor="gm-cue-channel-select">
              Channel
              <select
                id="gm-cue-channel-select"
                className="song-lyrics-bar-wrap-select"
                value={String(selectedGmChannel)}
                onChange={(e) => setSelectedGmChannel(Number(e.target.value))}
                disabled={disabled}
              >
                {Array.from({ length: 16 }, (_, idx) => idx + 1).map((channel) => (
                  <option key={channel} value={String(channel)}>CH {channel}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handleInsertGmCue}
              disabled={disabled}
              className="btn btn-primary"
              title="Sisipkan patch keyboard MIDI dari dropdown GM"
            >
              Insert Patch
            </button>
          </div>
        </div>
        {showPianoControls && (
          <div className="song-lyrics-edit-actions-group song-lyrics-piano-controls">
            <span className="song-lyrics-action-group-title">Piano Insert</span>
            <button
              type="button"
              onClick={onOpenPiano}
              disabled={disabled}
              className="btn btn-secondary"
              title="Buka Virtual Piano"
            >
              🎹 Piano
            </button>
            <button
              type="button"
              className={`btn ${insertNotesEnabled ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onToggleInsertNotes?.(!insertNotesEnabled)}
              disabled={disabled}
              title="Toggle insert not ke lirik"
              aria-pressed={insertNotesEnabled}
            >
              ✍ Insert {insertNotesEnabled ? 'ON' : 'OFF'}
            </button>
            {insertNotesEnabled && (
              <>
                <label className="song-lyrics-insert-format" htmlFor="lyrics-insert-format-select">
                  Format
                  <select
                    id="lyrics-insert-format-select"
                    className="song-lyrics-bar-wrap-select"
                    value={insertNoteFormat}
                    onChange={(e) => onChangeInsertNoteFormat?.(e.target.value)}
                    disabled={disabled}
                  >
                    <option value="bracket">[C]</option>
                    <option value="plain">C</option>
                    <option value="number">1-7</option>
                  </select>
                </label>
                {insertNoteFormat === "number" && (
                  <label className="song-lyrics-insert-key" htmlFor="lyrics-insert-key-select">
                    Key
                    <select
                      id="lyrics-insert-key-select"
                      className="song-lyrics-bar-wrap-select"
                      value={keySignature || 'C'}
                      onChange={(e) => onChangeInsertNumberKeySignature?.(e.target.value)}
                      disabled={disabled}
                      aria-label="Pilih key untuk angka chord"
                    >
                      {INSERT_KEY_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                )}
                <button
                  type="button"
                  className={`btn ${insertTrailingSpace ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => onToggleInsertTrailingSpace?.(!insertTrailingSpace)}
                  disabled={disabled}
                  title="Toggle spasi otomatis setelah insert"
                  aria-pressed={insertTrailingSpace}
                >
                  ␠ Spasi {insertTrailingSpace ? 'ON' : 'OFF'}
                </button>
              </>
            )}
          </div>
        )}
        {(showMetadataHelpButton || showSaveCancelButtons) && (
          <div className="song-lyrics-edit-actions-group song-lyrics-edit-actions-group-meta">
            <span className="song-lyrics-action-group-title">Editor Actions</span>
            {showMetadataHelpButton && (
              <button
                type="button"
                onClick={() => setShowMetadataHelp(true)}
                disabled={disabled}
                className="btn btn-secondary"
                title="Lihat daftar metadata yang didukung"
              >
                ❓ Help
              </button>
            )}
            {showSaveCancelButtons && (
              <>
                <button
                  type="button"
                  onClick={handleSaveLyrics}
                  disabled={disabled}
                  className="btn"
                  title={savingLyrics ? "Menyimpan..." : "Simpan"}
                  aria-label={savingLyrics ? "Menyimpan" : "Simpan"}
                >
                  {savingLyrics ? "⏳" : "✓"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEditLyrics}
                  disabled={disabled}
                  className="btn btn-secondary"
                  title="Batal"
                  aria-label="Batal"
                >
                  ✕
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {detectedSectionBadges.length > 0 && (
        <div className="song-lyrics-detected-sections" aria-label="Bagian lagu terdeteksi">
          <span className="song-lyrics-sections-label">Bagian Terdeteksi:</span>
          {detectedSectionBadges.map((item) => (
            <span
              key={`${item.lineNumber}-${item.label}`}
              className={`song-lyrics-section-detected-badge tone-${item.tone}`}
              title={`Baris ${item.lineNumber}`}
            >
              {item.label}
              <span className="song-lyrics-section-detected-line">L{item.lineNumber}</span>
            </span>
          ))}
        </div>
      )}

      {showMetadataHelp && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Panduan metadata lirik"
          onClick={() => setShowMetadataHelp(false)}
        >
          <div
            className="modal song-lyrics-metadata-help-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="song-lyrics-metadata-help-header">
              <h3>Panduan Metadata Lirik</h3>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowMetadataHelp(false)}
                aria-label="Tutup panduan metadata"
                title="Tutup"
              >
                ✕
              </button>
            </div>
            <p className="song-lyrics-metadata-help-desc">
              Gunakan format metadata berikut langsung di area lirik/chord.
            </p>
            <div className="song-lyrics-metadata-help-list">
              {metadataSections.map((item) => (
                <section key={item.title} className="song-lyrics-metadata-help-item">
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                  <ul>
                    {item.examples.map((example) => (
                      <li key={`${item.title}-${example}`}>
                        <code>{example}</code>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
