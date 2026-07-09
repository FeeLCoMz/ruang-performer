import { chordToNumber } from "./chordUtils.js";

const NOTE_NAMES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

export function extractKeyRoot(inputKey) {
  const match = String(inputKey || "").trim().match(/^([A-G](?:#|b)?)/i);
  if (!match) return "C";
  const root = match[1];
  return root[0].toUpperCase() + (root[1] || "");
}

export function isMinorKey(inputKey) {
  const normalized = String(inputKey || "").trim().toLowerCase();
  return normalized.endsWith("m") && !normalized.includes("maj");
}

export function getNumericNotationKey(inputKey) {
  const keyRoot = extractKeyRoot(inputKey);
  if (!isMinorKey(inputKey)) return keyRoot;

  const index = NOTE_NAMES_FLAT.indexOf(keyRoot);
  if (index === -1) return keyRoot;
  return NOTE_NAMES_FLAT[(index + 3) % 12];
}

export function toNumberNotation(note, inputKey) {
  const baseKey = getNumericNotationKey(inputKey);
  return chordToNumber(note, baseKey) || note;
}
