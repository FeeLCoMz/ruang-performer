import { describe, test, expect } from 'vitest';
import { add } from "../utils/chordUtils";

describe("chordUtils", () => {
  test("add returns correct sum", () => {
    expect(add(2, 3)).toBe(5);
  });
});
