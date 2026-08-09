import { describe, test, expect } from "vitest";
import {
  autoAlignChordLyricPairs,
  autoTagSongSections,
  buildInsertNoteToken,
  detectSectionBadges,
  removeExtraSpacesAndBrokenLines,
  replaceSelectionWithToken,
  standardizeChordNotation,
  transposeLyricsText,
} from "../utils/lyricsEditorUtils.js";

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

  test("removeExtraSpacesAndBrokenLines cleans copied lyrics noise", () => {
    const input = "Verse 1   \n\n\n[C]Hello   world\t\t\nAm   F";
    expect(removeExtraSpacesAndBrokenLines(input)).toBe("Verse 1\n\n[C]Hello world\nAm F");
  });

  test("autoTagSongSections normalizes common song section labels", () => {
    const input = "Intro:\nVerse 1\nPre Chorus\nPost Chorus\nReff\nBridge";
    expect(autoTagSongSections(input)).toBe("[Intro]\n[Verse 1]\n[Pre-Chorus]\n[Post-Chorus]\n[Chorus]\n[Bridge]");
  });

  test("detectSectionBadges returns section labels with line numbers", () => {
    expect(detectSectionBadges("[Intro]\nAm F\nPost Chorus:\nChorus:")).toEqual([
      { lineNumber: 1, label: "Intro", tone: "intro" },
      { lineNumber: 3, label: "Post-Chorus", tone: "post-chorus" },
      { lineNumber: 4, label: "Chorus", tone: "chorus" },
    ]);
  });

  test("standardizeChordNotation normalizes chord quality spellings", () => {
    const input = "[cmajor7] line\nAminor DMajor7/F#\nModulation: bbminor";
    expect(standardizeChordNotation(input)).toBe("[Cmaj7] line\n| Am | Dmaj7/F# |\nModulation: Bbm");
  });

  test("standardizeChordNotation converts compact section chords into bar grid", () => {
    const input = "Intro: c..g..aminor..fmaj7..";
    expect(standardizeChordNotation(input)).toBe("Intro: | C | G | Am | Fmaj7 |");
  });

  test("standardizeChordNotation normalizes spacing inside existing grid bars", () => {
    const input = "|cmajor7| g | aminor |f|";
    expect(standardizeChordNotation(input)).toBe("| Cmaj7 | G | Am | F |");
  });

  test("transposeLyricsText transposes inline, chord-line, and modulation chords", () => {
    const input = "[C]Hello\nAm F G\nModulation: Bb";
    expect(transposeLyricsText(input, 2)).toBe("[D]Hello\nBm G A\nModulation: C");
  });

  test("autoAlignChordLyricPairs nudges chord positions toward lyric syllables", () => {
    const input = "C G\nHi world";
    expect(autoAlignChordLyricPairs(input)).toBe("C  G\nHi world");
  });
});
