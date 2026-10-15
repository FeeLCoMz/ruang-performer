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
  // Preferensi panel lirik (dipakai lintas sesi): ukuran font lirik,
  // mode panggung (kontras tinggi), mode fokus, dan lock layar.
  LYRICS_FONT_SCALE: 'ruangperformer_lyrics_font_scale_v1',
  LYRICS_FOCUS_MODE: 'ruangperformer_lyrics_focus_mode_v1',
  LYRICS_LOCK: 'ruangperformer_lyrics_lock_v1',
  // Mode overlay lirik: layer fullscreen di atas seluruh UI.
  LYRICS_OVERLAY: 'ruangperformer_lyrics_overlay_v1',
};

export default STORAGE_KEYS;
