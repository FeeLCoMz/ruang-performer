import React from 'react';
import YouTubeViewer from './YouTubeViewer.jsx';
import TimeMarkers from './TimeMarkers.jsx';
/**
 * SongStudioTopbar
 *
 * The sticky command bar from the studio layout: a way out on the left, what you
 * are editing in the middle, and the save action on the right - so the primary
 * action is reachable without scrolling to the bottom of a long form.
 *
 * Status (dirty / saving / blocked) rides along the middle instead of taking a
 * row of its own, and the field-error blocker stays clickable because a disabled
 * save button with no explanation is the one thing a user cannot recover from.
 */
export default function SongStudioTopbar({
  modeLabel,
  title,
  eyebrowIcon,
  isEditMode,
  newVersionMode,
  loading,
  hasFieldErrors,
  hasUnsavedChanges,
  statusText,
  onCancel,
  onFixFields,
}) {
  const saveLabel = loading
    ? '⏳ Menyimpan...'
    : isEditMode
      ? '💾 Simpan'
      : newVersionMode
        ? '🧬 Simpan Versi'
        : '💾 Simpan';

  return (
    <div className="studio-topbar">
      <button type="button" onClick={onCancel} className="btn btn-secondary studio-topbar-back">
        ← Batal
      </button>

      <div className="studio-topbar-title">
        <span className="studio-topbar-icon" aria-hidden="true">{eyebrowIcon}</span>
        <div className="studio-topbar-title-text">
          <span className="studio-topbar-heading">{modeLabel}</span>
          <span className="studio-topbar-subject">{title}</span>
        </div>
      </div>

      <div className="studio-topbar-status">
        <span
          className={`song-editor-status-dot${loading ? ' is-saving' : hasUnsavedChanges ? ' is-dirty' : ' is-clean'}`}
          aria-hidden="true"
        />
        <span className={`song-editor-status${loading ? ' is-saving' : hasUnsavedChanges ? ' is-dirty' : ' is-clean'}`}>
          {statusText}
        </span>
        {hasFieldErrors && !loading && (
          <button
            type="button"
            className="song-editor-status-blocker"
            onClick={onFixFields}
            title="Perbaiki Key / Tempo / Time Signature"
          >
            ⚠ Perbaiki
          </button>
        )}
      </div>

      <div className="studio-topbar-actions">
        <button
          type="submit"
          disabled={loading || hasFieldErrors}
          className="btn btn-primary studio-topbar-save"
          title={hasFieldErrors ? 'Perbaiki Key, Tempo, atau Time Signature dulu' : undefined}
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}

/**
 * StudioMediaColumn
 *
 * Left column of the studio layout: the reference video, the same time markers
 * the practice panel uses, and the player controls. All of it already existed -
 * this only arranges it beside the editor instead of in a separate sidebar.
 */
export function StudioMediaColumn({
  youtubeId,
  youtubeRef,
  timeMarkers,
  secondsToLabel,
  isPlaying,
  onTogglePlay,
  onSeek,
  onUpdateMarkers,
  currentTime,
  duration,
  getCurrentYouTubeTime,
  onTimeUpdate,
  /** Peta seksi lagu → detik, untuk tombol "marker otomatis". */
  onAddAutoMarkers,
  autoMarkersDisabled = false,
}) {
  const format = typeof secondsToLabel === 'function' ? secondsToLabel : (v) => String(v);

  return (
    <div className="studio-media">
      <div className="studio-panel-head">
        <span className="studio-panel-title">🎬 Media &amp; Kontrol</span>
      </div>

      {youtubeId ? (
        <>
          <div className="song-practice-video studio-video">
            <YouTubeViewer
              videoId={youtubeId}
              ref={youtubeRef}
              onTimeUpdate={onTimeUpdate}
            />
          </div>

          <div className="song-practice-controls">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onTogglePlay?.()}
              title={isPlaying ? 'Jeda video' : 'Putar video'}
              aria-label={isPlaying ? 'Jeda video' : 'Putar video'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => youtubeRef.current?.handleSeek?.(0)}
              title="Putar dari awal"
              aria-label="Putar dari awal"
            >
              ⏮
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                // Seek relatif: hitung dari posisi live player (bukan state
                // currentTime yang bisa stale → lompat ke 0 / 5 detik awal).
                youtubeRef.current?.handleSeekOffset?.(-5);
              }}
              title="Mundur 5 detik"
              aria-label="Mundur 5 detik"
            >
              «5s
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                youtubeRef.current?.handleSeekOffset?.(5);
              }}
              title="Maju 5 detik"
              aria-label="Maju 5 detik"
            >
              5s»
            </button>
            <span className="song-practice-time" title="Posisi video saat ini">
              {format(Math.floor(currentTime || 0))}
              {duration > 0 ? ` / ${format(Math.floor(duration))}` : ''}
            </span>
          </div>
        </>
      ) : (
        <div className="studio-media-empty">
          Belum ada video referensi. Isi <b>YouTube URL atau ID</b> di bagian Informasi
          untuk memuat player dan penanda waktu di sini.
        </div>
      )}

      <div className="studio-markers">
        <span className="studio-panel-subtitle">Kontrol Time Marker</span>
        {!youtubeId && (
          <TimeMarkers
            timeMarkers={timeMarkers}
            onSeek={onSeek}
            currentTime={currentTime}
            duration={duration}
            onUpdate={onUpdateMarkers}
            getCurrentYouTubeTime={getCurrentYouTubeTime}
            compactUI
          />
        )}
      </div>
    </div>
  );
}

/**
 * StudioMediaLayout
 *
 * Layout tab Media untuk layar lebar: video + kontrol playback di kiri,
 * daftar time marker di kanan (dua kolom sejajar); di layar sempit keduanya
 * kembali bertumpuk satu kolom. Marker otomatis dari seksi lagu ada di panel
 * marker, karena hasilnya juga tampil di daftar itu.
 */
export function StudioMediaLayout({
  children,
  timeMarkers,
  onSeek,
  currentTime,
  duration,
  onUpdateMarkers,
  getCurrentYouTubeTime,
  sections = [],
  onAddAutoMarkers,
  autoMarkersDisabled = false,
}) {
  return (
    <div className="studio-media-columns">
      <div className="studio-media-main">{children}</div>
      <div className="studio-media-side">
        <span className="studio-panel-subtitle">Kontrol Time Marker</span>
        {sections.length > 0 && (
          <button
            type="button"
            className="btn btn-secondary studio-auto-markers-btn"
            onClick={onAddAutoMarkers}
            disabled={autoMarkersDisabled}
            title="Buat marker otomatis dari setiap seksi lagu"
          >
            ✨ Marker Otomatis ({sections.length} seksi)
          </button>
        )}
        <TimeMarkers
          timeMarkers={timeMarkers}
          onSeek={onSeek}
          currentTime={currentTime}
          duration={duration}
          onUpdate={onUpdateMarkers}
          getCurrentYouTubeTime={getCurrentYouTubeTime}
          compactUI
        />
      </div>
    </div>
  );
}
