import { describe, expect, it } from "vitest";
import type { Vec3 } from "./fields";
import {
  beamRadius,
  borisStep,
  cyclotronRadius,
  ELECTRON_CHARGE,
  ELECTRON_MASS,
  electronSpeed,
  helmholtzField,
} from "./lorentz";

describe("Lorentz force", () => {
  it("keeps speed constant in a pure magnetic field, with radius m v / qB", () => {
    const q = 2;
    const m = 0.5;
    const B: Vec3 = [0, 0, 1.5];
    let x: Vec3 = [0, 0, 0];
    let v: Vec3 = [3, 0, 0];
    const r = cyclotronRadius(m, 3, q, 1.5);
    const dt = 1e-3;
    let maxY = 0;
    let minY = 0;
    for (let i = 0; i < 20000; i++) {
      ({ x, v } = borisStep(x, v, q / m, [0, 0, 0], B, dt));
      expect(Math.hypot(...v)).toBeCloseTo(3, 10);
      maxY = Math.max(maxY, x[1]);
      minY = Math.min(minY, x[1]);
    }
    expect(maxY - minY).toBeCloseTo(2 * r, 3);
  });

  it("gives a realistic fine-beam tube radius", () => {
    // 250 V, 1.5 A, 130 turns, 15 cm coils gives roughly a 4.6 cm beam radius.
    const B = helmholtzField(130, 1.5, 0.15);
    expect(B * 1e3).toBeCloseTo(1.169, 2);
    const v = electronSpeed(250);
    expect(v / 1e6).toBeCloseTo(9.38, 1);
    expect(beamRadius(250, 1.5)).toBeCloseTo((ELECTRON_MASS * v) / (ELECTRON_CHARGE * B), 12);
    expect(beamRadius(250, 1.5) * 100).toBeCloseTo(4.56, 1);
  });
});
