import { describe, test, expect } from "vitest";
import {
  extractKeyRoot,
  isMinorKey,
  getNumericNotationKey,
  toNumberNotation,
} from "../utils/notationUtils.js";

describe("notationUtils", () => {
  test("extractKeyRoot normalizes major key root", () => {
    expect(extractKeyRoot("f#m")).toBe("F#");
    expect(extractKeyRoot("Bb major")).toBe("Bb");
  });

  test("isMinorKey detects minor but ignores major", () => {
    expect(isMinorKey("Am")).toBe(true);
    expect(isMinorKey("A")).toBe(false);
    expect(isMinorKey("Amaj7")).toBe(false);
  });

  test("getNumericNotationKey maps relative major for minor key", () => {
    expect(getNumericNotationKey("Am")).toBe("C");
    expect(getNumericNotationKey("Em")).toBe("G");
    expect(getNumericNotationKey("C")).toBe("C");
  });

  test("toNumberNotation converts note according to key", () => {
    expect(toNumberNotation("C", "C")).toBe("1");
    expect(toNumberNotation("D", "C")).toBe("2");
    expect(toNumberNotation("G", "Em")).toBe("1");
  });
});
