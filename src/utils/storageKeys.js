/**
 * Centralised localStorage keys.
 *
 * Every key the app persists lives here so a rename happens in one place
 * instead of being scattered across components as raw strings.
 */
export const STORAGE_KEYS = {
  THEME: 'ruangperformer_theme',
  PERFORMANCE_MODE: 'ruangperformer_performance_mode',
  MIDI_OUTPUT_ID: 'ruangperformer_midi_output_id',
  MIDI_ENABLE_PROGRAM_CHANGE: 'ruangperformer_midi_enable_program_change',
  LAST_MIDI_CHANNEL: 'ruangperformer_last_midi_channel',
  FLOATING_PLAYER_POSITION: 'ruangperformer_floating_youtube_player_position_v1',
  PRACTICE_VIDEO_HEIGHT: 'ruangperformer_practice_video_height_v1',
  PRACTICE_VIDEO_DETACHED: 'ruangperformer_practice_video_detached_v1',
  LYRICS_PREVIEW_MODE: 'ruangperformer_lyrics_preview_mode',
  SONG_LIST_PAGE_STATE: 'songListPageState',
};

export default STORAGE_KEYS;
