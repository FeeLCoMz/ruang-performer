import React, { useMemo, useState } from "react";
import { insertLineAtCursor } from "../utils/lyricsEditorUtils.js";
import {
  GM_SOUND_CATEGORIES,
  GM_SOUND_BANK,
  filterGmSoundBankByCategory,
  formatGmPatchOptionLabel,
} from "../utils/gmSoundbank.js";

const LAST_MIDI_CHANNEL_STORAGE_KEY = 'ruangperformer_last_midi_channel';

/**
 * LyricsEditorTools
 *
 * Everything in the lyrics editor that is NOT formatting: history, search,
 * MIDI cue insertion and the piano entry point. Kept apart from
 * LyricsFormatToolbar so the formatting area contains only formatting.
 */
export default function LyricsEditorTools({
  disabled = false,
  lyricsRef,
  lyricsValue = "",
  setLyricsValue,
  showPianoControls = false,
  onOpenPiano,
  insertNotesEnabled = false,
  showSaveCancelButtons = false,
  savingLyrics = false,
  handleSaveLyrics,
  handleCancelEditLyrics,
}) {
  const [selectedGmCategory, setSelectedGmCategory] = useState('piano-keys');
  const [selectedGmProgram, setSelectedGmProgram] = useState(0);
  const [selectedGmChannel, setSelectedGmChannel] = useState(() => {
    if (typeof window === 'undefined') return 1;
    const stored = Number.parseInt(window.localStorage.getItem(LAST_MIDI_CHANNEL_STORAGE_KEY) || '1', 10);
    if (!Number.isFinite(stored) || stored < 1 || stored > 16) return 1;
    return stored;
  });

  const filteredGmSounds = useMemo(() => {
    const filtered = filterGmSoundBankByCategory(selectedGmCategory);
    return filtered.length ? filtered : GM_SOUND_BANK;
  }, [selectedGmCategory]);

  const selectedGmPatch = useMemo(() => {
    const parsedProgram = Number(selectedGmProgram);
    return (
      GM_SOUND_BANK.find((item) => item.program === parsedProgram) ||
      filteredGmSounds[0] ||
      GM_SOUND_BANK[0]
    );
  }, [selectedGmProgram, filteredGmSounds]);

  const ensureSelectedProgramInCategory = (categoryValue) => {
    const candidateSounds = filterGmSoundBankByCategory(categoryValue);
    if (!candidateSounds.length) return;
    const hasSelected = candidateSounds.some((item) => item.program === Number(selectedGmProgram));
    if (!hasSelected) setSelectedGmProgram(candidateSounds[0].program);
  };

  const handleInsertGmCue = () => {
    const el = lyricsRef?.current;
    if (!el || typeof setLyricsValue !== 'function') return;

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
      selectionEnd: el.selectionEnd,
      label: cueLine,
    });

    setLyricsValue(nextText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  };

  return (
    <div className="lyric-tools">
      <div className="lyric-tools-history" role="group" aria-label="Riwayat dan pencarian">
        <button
          type="button"
          className="btn btn-secondary lyric-tools-btn"
          disabled={disabled}
          onClick={() => lyricsRef?.current?.undo?.()}
          title="Batalkan perubahan terakhir (Ctrl+Z)"
        >
          <span aria-hidden="true">↶</span>
          Undo
        </button>
        <button
          type="button"
          className="btn btn-secondary lyric-tools-btn"
          disabled={disabled}
          onClick={() => lyricsRef?.current?.redo?.()}
          title="Ulangi perubahan yang dibatalkan (Ctrl+Shift+Z)"
        >
          <span aria-hidden="true">↷</span>
          Redo
        </button>
        <button
          type="button"
          className="btn btn-secondary lyric-tools-btn"
          disabled={disabled}
          onClick={() => lyricsRef?.current?.openSearchPanel?.()}
          title="Cari / ganti teks di editor (Ctrl+F)"
        >
          <span aria-hidden="true">🔍</span>
          Cari
        </button>
      </div>

      <div className="lyric-tools-cue" role="group" aria-label="Sisipkan cue keyboard MIDI">
        <span className="lyric-tools-label">Cue Keyboard</span>

        <select
          className="lyric-tools-select"
          value={selectedGmCategory}
          onChange={(e) => {
            const nextCategory = e.target.value;
            setSelectedGmCategory(nextCategory);
            ensureSelectedProgramInCategory(nextCategory);
          }}
          disabled={disabled}
          aria-label="Kategori sound"
        >
          {GM_SOUND_CATEGORIES.map((category) => (
            <option key={category.value} value={category.value}>{category.label}</option>
          ))}
        </select>

        <select
          className="lyric-tools-select lyric-tools-select-patch"
          value={String(selectedGmProgram)}
          onChange={(e) => setSelectedGmProgram(Number(e.target.value))}
          disabled={disabled}
          aria-label="Soundbank GM"
        >
          {filteredGmSounds.map((patch) => (
            <option key={patch.program} value={String(patch.program)}>
              {formatGmPatchOptionLabel(patch)}
            </option>
          ))}
        </select>

        <select
          className="lyric-tools-select"
          value={String(selectedGmChannel)}
          onChange={(e) => setSelectedGmChannel(Number(e.target.value))}
          disabled={disabled}
          aria-label="Channel MIDI"
        >
          {Array.from({ length: 16 }, (_, idx) => idx + 1).map((channel) => (
            <option key={channel} value={String(channel)}>CH {channel}</option>
          ))}
        </select>

        <button
          type="button"
          className="btn btn-secondary lyric-tools-btn"
          onClick={handleInsertGmCue}
          disabled={disabled}
          title="Sisipkan baris cue keyboard di posisi kursor"
        >
          Sisipkan
        </button>
      </div>

      <div className="lyric-tools-right">
        {showPianoControls && (
          <button
            type="button"
            className="btn btn-secondary lyric-tools-btn"
            onClick={onOpenPiano}
            disabled={disabled}
            title="Buka Virtual Piano untuk memasukkan not ke lirik"
          >
            <span aria-hidden="true">🎹</span>
            Piano
            <span className={`lyric-tools-insert-flag${insertNotesEnabled ? ' is-on' : ''}`}>
              {insertNotesEnabled ? 'ON' : 'OFF'}
            </span>
          </button>
        )}

        {showSaveCancelButtons && (
          <>
            <button
              type="button"
              onClick={handleSaveLyrics}
              disabled={disabled}
              className="btn lyric-tools-btn"
              title={savingLyrics ? 'Menyimpan...' : 'Simpan'}
              aria-label={savingLyrics ? 'Menyimpan' : 'Simpan'}
            >
              {savingLyrics ? '⏳' : '✓'}
            </button>
            <button
              type="button"
              onClick={handleCancelEditLyrics}
              disabled={disabled}
              className="btn btn-secondary lyric-tools-btn"
              title="Batal"
              aria-label="Batal"
            >
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  );
}
