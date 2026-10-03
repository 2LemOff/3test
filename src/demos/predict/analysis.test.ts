import { describe, expect, it } from "vitest";
import { components, exactAt, flightTime, range } from "../../physics/projectile";
import { analyseGraph, analysePath, type Pt, trueY } from "./analysis";

const l = { v0: 22, angleDeg: 40, h: 30 };
const T = flightTime(l);
const R = range(l);

describe("path analysis", () => {
  it("rates a correct sketch highly with no misconceptions", () => {
    const sketch: Pt[] = Array.from({ length: 40 }, (_, i) => {
      const x = (i / 39) * R;
      return [x, Math.max(0, trueY(l, x))];
    });
    const r = analysePath(l, sketch);
    expect(r.score).toBeGreaterThan(90);
    expect(r.findings.every((f) => f.kind === "good")).toBe(true);
  });

  it("spots the cartoon 'straight then drop' path", () => {
    const sketch: Pt[] = [];
    for (let i = 0; i <= 20; i++) sketch.push([i * 2.5, l.h + i * 2.1]);
    for (let i = 1; i <= 15; i++) sketch.push([50 + i * 0.1, l.h + 42 - i * ((l.h + 42) / 15)]);
    const ids = analysePath(l, sketch).findings.map((f) => f.id);
    expect(ids).toContain("straight-then-drop");
  });

  it("spots a symmetric arc from a cliff", () => {
    const peakX = R * 0.55;
    const sketch: Pt[] = Array.from({ length: 40 }, (_, i) => {
      const x = (i / 39) * R;
      return [x, l.h + 20 * (1 - ((x - peakX) / peakX) ** 2)];
    });
    expect(analysePath(l, sketch).findings.map((f) => f.id)).toContain("symmetric");
  });
});

describe("graph analysis", () => {
  const vy0 = components(l).vy;
  it("accepts the straight line with slope −g", () => {
    const sketch: Pt[] = Array.from({ length: 30 }, (_, i) => {
      const t = (i / 29) * T;
      return [t, exactAt(l, t).vy];
    });
    const r = analyseGraph(l, sketch);
    expect(r.score).toBeGreaterThan(90);
    expect(r.findings.map((f) => f.id)).toEqual(["slope-good"]);
  });

  it("flags a pause at the top", () => {
    const tTop = vy0 / 9.81;
    const sketch: Pt[] = [];
    for (let i = 0; i <= 10; i++) sketch.push([(i / 10) * tTop, vy0 * (1 - i / 10)]);
    for (let i = 1; i <= 10; i++) sketch.push([tTop + i * 0.1, 0]);
    for (let i = 1; i <= 10; i++)
      sketch.push([tTop + 1 + (i / 10) * (T - tTop - 1), (-i / 10) * 30]);
    expect(analyseGraph(l, sketch).findings.map((f) => f.id)).toContain("pause-at-top");
  });

  it("flags a curved graph", () => {
    const sketch: Pt[] = Array.from({ length: 30 }, (_, i) => {
      const t = (i / 29) * T;
      return [t, vy0 * Math.cos((t / T) * Math.PI)];
    });
    const ids = analyseGraph(l, sketch).findings.map((f) => f.id);
    expect(ids).toContain("curved");
  });
});
