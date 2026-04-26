/**
 * Copyright (c) 2026 Custom Agile LLC. All rights reserved.
 */

import { describe, it, expect } from 'vitest';
import { calcWsjfScore } from './types';

// ── calcWsjfScore ──────────────────────────────────────────────────────────────

describe('calcWsjfScore', () => {
  it('returns null when jobSize is null', () => {
    expect(calcWsjfScore(8, 9, 7, null)).toBeNull();
  });

  it('returns null when jobSize is 0 (divide-by-zero guard)', () => {
    expect(calcWsjfScore(8, 9, 7, 0)).toBeNull();
  });

  it('treats null numerator components as 0', () => {
    // (0 + 0 + 0) / 5 = 0
    expect(calcWsjfScore(null, null, null, 5)).toBe(0);
  });

  it('treats individual null numerator components as 0', () => {
    // rroe=null → 0, ubv=8, tc=null → 0 → (0+8+0)/4 = 2.00
    expect(calcWsjfScore(null, 8, null, 4)).toBe(2);
  });

  it('computes a basic happy-path score correctly', () => {
    // (8 + 9 + 7) / 3 = 8.00
    expect(calcWsjfScore(8, 9, 7, 3)).toBe(8);
  });

  it('rounds to 2 decimal places', () => {
    // (1 + 1 + 1) / 3 = 1.0, but let's hit a non-terminating decimal:
    // (7 + 8 + 6) / 5 = 4.2 exactly — try something that needs rounding
    // (1 + 0 + 0) / 3 = 0.3333... → rounds to 0.33
    expect(calcWsjfScore(1, null, null, 3)).toBe(0.33);
  });

  it('handles fractional jobSize', () => {
    // (2 + 2 + 2) / 1.5 = 4.00
    expect(calcWsjfScore(2, 2, 2, 1.5)).toBe(4);
  });

  it('produces the expected score for F1001 mock row (8+9+7)/3', () => {
    // Matches the makeItem call in mock-data.ts for F1001
    expect(calcWsjfScore(8, 9, 7, 3)).toBe(8);
  });

  it('produces the expected score for F1002 mock row (7+8+6)/5', () => {
    expect(calcWsjfScore(7, 8, 6, 5)).toBe(4.2);
  });

  it('returns null for F1013 where all inputs are null', () => {
    // F1013 in mock-data: all null → jobSize null → null
    expect(calcWsjfScore(null, null, null, null)).toBeNull();
  });
});
