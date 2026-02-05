import { describe, test, expect } from '@jest/globals';
import { add } from "../utils/chordUtils";

describe("chordUtils", () => {
  test("add returns correct sum", () => {
    expect(add(2, 3)).toBe(5);
  });
});
