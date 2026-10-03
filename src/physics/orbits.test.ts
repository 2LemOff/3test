import { describe, expect, it } from "vitest";
import { type Body, circularSpeed, keplerPeriod, totalEnergy, verletStep } from "./orbits";

describe("orbits", () => {
  it("conserves energy and follows Kepler's third law", () => {
    const M = 1000;
    const r = 10;
    const bodies: Body[] = [
      { x: 0, y: 0, vx: 0, vy: 0, m: M, fixed: true },
      { x: r, y: 0, vx: 0, vy: circularSpeed(M, r), m: 1e-6 },
    ];
    const T = keplerPeriod(M, r);
    const dt = T / 4000;
    const e0 = totalEnergy(bodies);
    let acc: [number, number][] | undefined;
    let crossings = 0;
    let lastY = 0;
    let crossT = 0;
    for (let i = 1; i <= 4400; i++) {
      acc = verletStep(bodies, dt, 1, acc);
      const y = bodies[1].y;
      if (lastY < 0 && y >= 0 && crossings === 0) {
        crossings++;
        crossT = i * dt;
      }
      lastY = y;
    }
    expect(Math.abs(totalEnergy(bodies) - e0) / Math.abs(e0)).toBeLessThan(1e-6);
    expect(crossT / T).toBeCloseTo(1, 3);
    expect(Math.hypot(bodies[1].x, bodies[1].y)).toBeCloseTo(r, 3);
  });

  it("a slingshot past a moving planet raises the probe's speed relative to the star", () => {
    const planet: Body = { x: 0, y: 0, vx: -3, vy: 0, m: 50 };
    const probe: Body = { x: 2, y: -40, vx: -3, vy: 6, m: 1e-6 };
    const v0 = Math.hypot(probe.vx, probe.vy);
    const bodies = [planet, probe];
    // In the planet's frame the encounter is elastic: ½v² − Gm/r is conserved.
    const relEnergy = () =>
      0.5 * ((probe.vx - planet.vx) ** 2 + (probe.vy - planet.vy) ** 2) -
      planet.m / Math.hypot(probe.x - planet.x, probe.y - planet.y);
    const e0 = relEnergy();
    let acc: [number, number][] | undefined;
    for (let i = 0; i < 40000; i++) acc = verletStep(bodies, 4e-4, 1, acc);
    expect(relEnergy()).toBeCloseTo(e0, 3);
    // Well past the planet: same speed relative to the planet, more speed relative to the star.
    expect(Math.hypot(probe.x - planet.x, probe.y - planet.y)).toBeGreaterThan(30);
    expect(Math.hypot(probe.vx, probe.vy)).toBeGreaterThan(v0 * 1.2);
  });
});
