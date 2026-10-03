import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  energyPerMass,
  exactAt,
  flightTime,
  type Launch,
  maxHeight,
  range,
  simulate,
} from "./projectile";

const launchArb = fc.record({
  v0: fc.double({ min: 2, max: 60, noNaN: true }),
  angleDeg: fc.double({ min: 5, max: 85, noNaN: true }),
  h: fc.double({ min: 0, max: 80, noNaN: true }),
});

describe("projectile", () => {
  it("RK4 matches the exact solution without drag", () => {
    fc.assert(
      fc.property(launchArb, (l: Launch) => {
        const path = simulate(l, 1 / 200);
        for (const s of path.slice(0, -1)) {
          const e = exactAt(l, s.t);
          expect(Math.abs(s.x - e.x)).toBeLessThan(1e-6);
          expect(Math.abs(s.y - e.y)).toBeLessThan(1e-6);
        }
        const land = path[path.length - 1];
        expect(land.t).toBeCloseTo(flightTime(l), 6);
        expect(land.x).toBeCloseTo(range(l), 4);
      }),
      { numRuns: 40 },
    );
  });

  it("range from flat ground peaks at 45° and complementary angles tie", () => {
    const r = (a: number) => range({ v0: 20, angleDeg: a, h: 0 });
    for (const a of [10, 20, 30, 40, 44, 46, 50, 70]) expect(r(45)).toBeGreaterThan(r(a));
    expect(r(30)).toBeCloseTo(r(60), 9);
    expect(r(45)).toBeCloseTo((20 * 20) / 9.81, 9);
  });

  it("energy is conserved without drag and lost with drag", () => {
    fc.assert(
      fc.property(launchArb, (l: Launch) => {
        const path = simulate(l);
        const e0 = energyPerMass(path[0]);
        for (const s of path) expect(Math.abs(energyPerMass(s) - e0)).toBeLessThan(1e-6 * e0);
        const dragged = simulate({ ...l, k: 0.02 });
        for (let i = 1; i < dragged.length; i++) {
          expect(energyPerMass(dragged[i])).toBeLessThanOrEqual(
            energyPerMass(dragged[i - 1]) + 1e-9,
          );
        }
      }),
      { numRuns: 25 },
    );
  });

  it("max height matches the apex of the simulated path", () => {
    const l = { v0: 25, angleDeg: 50, h: 12 };
    const top = Math.max(...simulate(l, 1 / 2000).map((s) => s.y));
    expect(top).toBeCloseTo(maxHeight(l), 4);
  });
});
