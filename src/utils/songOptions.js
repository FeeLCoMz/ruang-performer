/**
 * Shared option lists for the song editor.
 *
 * These used to be duplicated: the form defined a 30-entry list and the lyrics
 * toolbar a 20-entry list, so a key added in one place silently did not appear
 * in the other. Keep them here and import from both.
 */

/** Notes and relative-minor chords, minors written as "Am" rather than "A-". */
export const SONG_KEY_OPTIONS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
  'Cm', 'C#m', 'Dbm', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gbm', 'Gm', 'G#m', 'Abm', 'Am', 'A#m', 'Bbm', 'Bm',
];

/** Time signatures offered in the form. */
export const TIME_SIGNATURE_OPTIONS = ['4/4', '3/4', '2/4', '6/8', '12/8', '5/4', '7/8'];

/** Genre suggestions for the datalist. */
export const GENRE_OPTIONS = [
  'Pop', 'Rock', 'Jazz', 'Blues', 'Country', 'Reggae', 'Funk', 'Soul', 'R&B',
  'Dangdut', 'Keroncong', 'Campursari', 'Pop Indonesia', 'Metal', 'Punk',
  'Folk', 'Acoustic', 'Gospel', 'Worship', 'Latin', 'Electronic',
];

/**
 * Keys offered when inserting numeric notation. A focused subset of
 * SONG_KEY_OPTIONS: the keys people actually play from, without the enharmonic
 * duplicates that would just clutter the dropdown.
 */
export const NUMBER_NOTATION_KEY_OPTIONS = [
  'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
];
