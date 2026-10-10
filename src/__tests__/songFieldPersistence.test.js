import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Regression guard for song field persistence.
 *
 * These read the API source rather than issuing HTTP requests on purpose: the
 * API runs against a mocked database client under NODE_ENV=test, so a wrong
 * column name or a shortened column list is invisible to an HTTP assertion —
 * the request still returns 200 while the data is silently dropped. Two bugs of
 * exactly that shape shipped, so the contract is asserted directly.
 */

const here = dirname(fileURLToPath(import.meta.url));
const read = (relPath) => readFileSync(join(here, '..', '..', 'api', relPath), 'utf8');

const createSrc = read('songs/index.js');
const updateSrc = read('songs/[id].js');
const toolsSrc = read('tools/index.js');

/**
 * Strip comments so assertions cannot be satisfied (or broken) by prose.
 *
 * Split on a CRLF-aware pattern: these files use \r\n, and a trailing \r stops
 * `/\/\/.*$/` from matching, because `.` does not match \r and a non-multiline
 * `$` does not match the position in front of it. Without this, every line
 * comment survives the strip and the assertions read prose instead of code.
 */
const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/[^\r\n]*/g, ''))
    .join('\n');

const createCode = stripComments(createSrc);
const updateCode = stripComments(updateSrc);
const toolsCode = stripComments(toolsSrc);

const SQL_COLUMNS = [
  'title', 'artist', 'youtubeId', 'lyrics', 'key', 'tempo', 'genre',
  'time_markers', 'time_signature', 'arrangement_style', 'keyboard_patch',
  'sheet_music_xml',
];

describe('song field persistence contract', () => {
  test('create reads time_markers, not the legacy timestamps key', () => {
    // The bug: create read `item.timestamps` while the client sends
    // `time_markers`, so markers were always null on a newly created song.
    expect(createCode).toContain('item.time_markers');
    expect(createCode).not.toContain('item.timestamps');
  });

  test('update reads time_markers', () => {
    expect(updateCode).toContain('body.time_markers');
  });

  test('create and update agree on the time marker key', () => {
    expect(createCode.includes('item.time_markers')).toBe(
      updateCode.includes('body.time_markers')
    );
  });

  test('create inserts every persisted column', () => {
    const insert = createCode.slice(
      createCode.indexOf('INSERT INTO songs'),
      createCode.indexOf('ON CONFLICT(id) DO UPDATE')
    );
    for (const column of SQL_COLUMNS) {
      expect(insert, `create INSERT is missing ${column}`).toContain(column);
    }
  });

  test('update writes every persisted column', () => {
    const update = updateCode.slice(
      updateCode.indexOf('UPDATE songs SET'),
      updateCode.indexOf('WHERE id = ?')
    );
    for (const column of SQL_COLUMNS) {
      expect(update, `update statement is missing ${column}`).toContain(column);
    }
  });

  test('import round-trips all song columns, not a subset', () => {
    // The bug: export used SELECT *, import wrote only 6 columns, so an
    // export/import cycle destroyed lyrics, key, tempo and more.
    expect(toolsCode).toContain('SELECT * FROM songs');
    for (const column of SQL_COLUMNS) {
      expect(toolsCode, `import is missing ${column}`).toContain(`'${column}'`);
    }
  });

  test('import no longer hardcodes the old 6-column list', () => {
    expect(toolsCode).not.toContain(
      'INSERT INTO songs (id, title, artist, userId, bandId, time_markers, createdAt, updatedAt)'
    );
  });
});
