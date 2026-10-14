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
  PERFORMANCE_MODE: 'ruangperformer_performance_mode',
};

export default STORAGE_KEYS;
