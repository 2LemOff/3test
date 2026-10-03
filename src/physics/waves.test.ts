import { describe, expect, it } from "vitest";
import {
  doubleSlitIntensity,
  drivenModeAmplitudes,
  fringeSpacing,
  harmonicFrequency,
  standingWave,
} from "./waves";

describe("waves", () => {
  it("double-slit fringes are spaced λL/d apart", () => {
    const lambda = 532e-9;
    const d = 0.25e-3;
    const a = 0.04e-3;
    const L = 2;
    const dy = fringeSpacing(lambda, d, L);
    expect(doubleSlitIntensity(0, lambda, d, a, L)).toBeCloseTo(1, 12);
    // Dark fringes sit at (m + ½) λL/d. (Bright peaks shift slightly inwards under the
    // single-slit envelope, so the zeros are the clean test.)
    for (const m of [0, 1, 2, 3]) {
      expect(doubleSlitIntensity((m + 0.5) * dy, lambda, d, a, L)).toBeLessThan(1e-6); // small-angle positions
    }
    expect(doubleSlitIntensity(0.25 * dy, lambda, d, a, L)).toBeGreaterThan(0.4);
  });

  it("harmonics are n v / 2L with nodes at the ends", () => {
    expect(harmonicFrequency(3, 120, 1.5)).toBeCloseTo(120, 12);
    for (const n of [1, 2, 5]) {
      expect(Math.abs(standingWave(0, 0.3, n, 1.5, 1, 40))).toBeLessThan(1e-12);
      expect(Math.abs(standingWave(1.5, 0.3, n, 1.5, 1, 40))).toBeLessThan(1e-12);
    }
  });

  it("driving at a harmonic makes that mode dominate", () => {
    const amps = drivenModeAmplitudes(3 * 20, 20);
    expect(amps.indexOf(Math.max(...amps))).toBe(2);
  });
});
