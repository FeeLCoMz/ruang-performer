import { describe, test, expect } from 'vitest';
import {
  AUTO_SCROLL_MODES,
  normalizeAutoScrollMode,
  computeMusicalLineDuration,
  computeMusicalScrollSpeed,
  computeManualScrollSpeed,
  estimateBarCount,
  estimateChordCount,
  clampManualSpeedLevel,
} from '../utils/autoscrollSpeedUtils.js';

describe('normalizeAutoScrollMode', () => {
  test('Given lowercase or invalid mode, Then it normalizes', () => {
    expect(normalizeAutoScrollMode('manual')).toBe(AUTO_SCROLL_MODES.MANUAL);
    expect(normalizeAutoScrollMode('MANUAL')).toBe(AUTO_SCROLL_MODES.MANUAL);
    expect(normalizeAutoScrollMode('musical')).toBe(AUTO_SCROLL_MODES.MUSICAL);
    expect(normalizeAutoScrollMode(undefined)).toBe(AUTO_SCROLL_MODES.MUSICAL);
  });
});

describe('computeMusicalLineDuration', () => {
  test('Given barCount is present, Then T = barCount * (60/BPM) * numerator', () => {
    // 4 bar, 120 BPM, 4/4 -> 4 * 0.5 * 4 = 8 detik
    const duration = computeMusicalLineDuration({ barCount: 4, bpm: 120, timeSignatureNumerator: 4 });
    expect(duration).toBeCloseTo(8, 5);
  });

  test('Given no barCount, Then T = chordCount * (60/BPM) * beatsPerChord', () => {
    // 2 chord, 120 BPM, 4 beat per chord -> 2 * 0.5 * 4 = 4 detik
    const duration = computeMusicalLineDuration({ chordCount: 2, bpm: 120, beatsPerChord: 4 });
    expect(duration).toBeCloseTo(4, 5);
  });

  test('Given nothing, Then it falls back to one 4/4 bar', () => {
    const duration = computeMusicalLineDuration({ bpm: 120 });
    expect(duration).toBeCloseTo(2, 5);
  });
});

describe('computeMusicalScrollSpeed', () => {
  test('Given line height and musical params, Then V = lineHeightsPx / T', () => {
    // 1 bar 4/4 @120BPM = 2 detik, tinggi baris 40px -> 20 px/s
    const speed = computeMusicalScrollSpeed({
      lineHeightsPx: 40,
      barCount: 1,
      bpm: 120,
      timeSignatureNumerator: 4,
    });
    expect(speed).toBeCloseTo(20, 5);
  });
});

describe('computeManualScrollSpeed', () => {
  test('Given level 1-10, Then V scales progressively (slow at low levels)', () => {
    // Skala progresif: level rendah sangat lambat, level tinggi tetap wajar.
    const speedAt1 = computeManualScrollSpeed({ userSpeedLevel: 1 });
    const speedAt5 = computeManualScrollSpeed({ userSpeedLevel: 5 });
    const speedAt10 = computeManualScrollSpeed({ userSpeedLevel: 10 });

    expect(speedAt1).toBeGreaterThan(0);
    expect(speedAt1).toBeLessThan(speedAt5);
    expect(speedAt5).toBeLessThan(speedAt10);
    // Level 1 harus benar-benar lambat (jauh di bawah kecepatan level 10).
    expect(speedAt1).toBeLessThan(speedAt10 / 10);
    expect(speedAt10).toBeLessThanOrEqual(150);
  });

  test('Given out-of-range level, Then it is clamped', () => {
    expect(computeManualScrollSpeed({ userSpeedLevel: 99 }))
      .toBe(computeManualScrollSpeed({ userSpeedLevel: 10 }));
    expect(computeManualScrollSpeed({ userSpeedLevel: 0 }))
      .toBe(computeManualScrollSpeed({ userSpeedLevel: 1 }));
  });
});

describe('clampManualSpeedLevel', () => {
  test('Given values outside 1-10, Then it clamps', () => {
    expect(clampManualSpeedLevel(-3)).toBe(1);
    expect(clampManualSpeedLevel(3.7)).toBe(4);
    expect(clampManualSpeedLevel(55)).toBe(10);
    expect(clampManualSpeedLevel(undefined)).toBe(5);
  });
});

describe('estimateBarCount / estimateChordCount', () => {
  test('Given barlines, Then bar count is segment count', () => {
    expect(estimateBarCount('C | G | F |')).toBe(3);
    expect(estimateBarCount('C G Am')).toBe(0);
  });

  test('Given a chord line, Then chord tokens are counted', () => {
    expect(estimateChordCount('C | G |')).toBe(2);
    expect(estimateChordCount('C G Am F')).toBe(4);
  });
});
