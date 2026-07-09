import { describe, test, expect } from "vitest";
import { buildInsertNoteToken, replaceSelectionWithToken } from "../utils/lyricsEditorUtils.js";

describe("lyricsEditorUtils", () => {
  test("buildInsertNoteToken returns bracket token with trailing space", () => {
    expect(buildInsertNoteToken({ note: "C" })).toBe("[C] ");
  });

  test("buildInsertNoteToken supports plain and number format", () => {
    expect(buildInsertNoteToken({ note: "C#", insertNoteFormat: "plain", insertTrailingSpace: false })).toBe("C#");
    expect(buildInsertNoteToken({ note: "G", insertNoteFormat: "number", keySignature: "G" })).toBe("1 ");
  });

  test("replaceSelectionWithToken replaces selected text and returns cursor", () => {
    const result = replaceSelectionWithToken({
      text: "Hello World",
      selectionStart: 6,
      selectionEnd: 11,
      token: "[C] ",
    });

    expect(result.nextText).toBe("Hello [C] ");
    expect(result.nextCursor).toBe(10);
  });

  test("replaceSelectionWithToken appends token when selection is missing", () => {
    const result = replaceSelectionWithToken({
      text: "Lyric",
      selectionStart: undefined,
      selectionEnd: undefined,
      token: "Am",
    });

    expect(result.nextText).toBe("LyricAm");
    expect(result.nextCursor).toBe(7);
  });
});
