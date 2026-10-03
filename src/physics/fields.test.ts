import { describe, expect, it } from "vitest";
import { type Charge, electricField, fieldLines } from "./fields";

describe("electric field", () => {
  const dipole: Charge[] = [
    { pos: [-1, 0, 0], q: 1 },
    { pos: [1, 0, 0], q: -1 },
  ];

  it("follows the inverse-square law", () => {
    const one: Charge[] = [{ pos: [0, 0, 0], q: 2 }];
    expect(electricField(one, [1, 0, 0])[0]).toBeCloseTo(2, 12);
    expect(electricField(one, [2, 0, 0])[0]).toBeCloseTo(0.5, 12);
  });

  it("is mirror-symmetric for a symmetric dipole", () => {
    const a = electricField(dipole, [0.3, 0.7, 0.2]);
    const b = electricField(dipole, [0.3, -0.7, 0.2]);
    expect(a[0]).toBeCloseTo(b[0], 12);
    expect(a[1]).toBeCloseTo(-b[1], 12);
    // On the perpendicular bisector the field points from + to −.
    const mid = electricField(dipole, [0, 1, 0]);
    expect(mid[0]).toBeGreaterThan(0);
    expect(Math.abs(mid[1])).toBeLessThan(1e-12);
  });

  it("lines start on the positive charge and end on the negative one", () => {
    const lines = fieldLines(dipole, 20);
    expect(lines.length).toBe(20);
    const ended = lines.filter((l) => l.endCharge === 1);
    // Lines leaving straight away from the pair escape the bounds; most close on the − charge.
    expect(ended.length).toBeGreaterThan(lines.length * 0.6);
    for (const l of ended) {
      const last = l.points[l.points.length - 1];
      expect(last).toEqual([1, 0, 0]);
    }
  });
});
