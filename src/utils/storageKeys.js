/**
 * Centralised localStorage keys.
 *
 * Every key the app persists lives here so a rename happens in one place
 * instead of being scattered across components as raw strings.
 */
export const STORAGE_KEYS = {
  FLOATING_PLAYER_POSITION: 'ruangperformer_floating_youtube_player_position_v1',
  PRACTICE_VIDEO_HEIGHT: 'ruangperformer_practice_video_height_v1',
  PRACTICE_VIDEO_DETACHED: 'ruangperformer_practice_video_detached_v1',
  LYRICS_PREVIEW_MODE: 'ruangperformer_lyrics_preview_mode',
  SONG_LIST_PAGE_STATE: 'songListPageState',
  // Preferensi switch "sembunyikan lagu selesai" di halaman setlist songs.
  SETLIST_HIDE_COMPLETED_SONGS: 'ruangperformer_setlist_hide_completed_songs_v1',
  // Preferensi panel lirik (dipakai lintas sesi): ukuran font lirik,
  // mode panggung (kontras tinggi), mode fokus, dan lock layar.
  LYRICS_FONT_SCALE: 'ruangperformer_lyrics_font_scale_v1',
  LYRICS_FOCUS_MODE: 'ruangperformer_lyrics_focus_mode_v1',
  LYRICS_LOCK: 'ruangperformer_lyrics_lock_v1',
  // Switch tampilan chord di panel lirik ('1' = tampil, '0' = sembunyikan).
  LYRICS_SHOW_CHORDS: 'ruangperformer_lyrics_show_chords_v1',
  // Stage Mode: tema kontras tinggi untuk panggung (toggle di app header).
  STAGE_MODE: 'ruangperformer_stage_mode_v1',
  // Stage Mode: pilihan band, setlist, dan lagu aktif (persist lintas sesi).
  STAGE_BAND: 'ruangperformer_stage_band_v1',
  STAGE_SETLIST: 'ruangperformer_stage_setlist_v1',
  STAGE_SONG: 'ruangperformer_stage_song_v1',
  // Stage Mode: preferensi lirik (font zoom & mode autoscroll).
  STAGE_FONT_SCALE: 'ruangperformer_stage_font_scale_v1',
  STAGE_AUTOSCROLL_MODE: 'ruangperformer_stage_autoscroll_mode_v1',
};

export default STORAGE_KEYS;
