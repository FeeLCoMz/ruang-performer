import { toNumberNotation } from "./notationUtils.js";

export function buildInsertNoteToken({
  note,
  keySignature = "C",
  insertNoteFormat = "bracket",
  insertTrailingSpace = true,
}) {
  const formattedNote = insertNoteFormat === "number"
    ? toNumberNotation(note, keySignature)
    : note;
  const noteToken = insertNoteFormat === "bracket" ? `[${formattedNote}]` : formattedNote;
  return insertTrailingSpace ? `${noteToken} ` : noteToken;
}

export function replaceSelectionWithToken({
  text,
  selectionStart,
  selectionEnd,
  token,
}) {
  const safeStart = Number.isInteger(selectionStart) ? selectionStart : text.length;
  const safeEnd = Number.isInteger(selectionEnd) ? selectionEnd : safeStart;
  const nextText = `${text.slice(0, safeStart)}${token}${text.slice(safeEnd)}`;
  const nextCursor = safeStart + token.length;

  return {
    nextText,
    nextCursor,
  };
}
