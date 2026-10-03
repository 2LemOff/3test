// Electric fields of point charges and magnetic fields of a bar magnet, in scene units.
// Coulomb's constant is folded into the charge values (k = 1), which keeps line tracing well scaled.

export type Vec3 = [number, number, number];

export interface Charge {
  pos: Vec3;
  q: number;
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);

/** Sum of inverse-square fields from point sources: E = Σ q r̂ / r². */
export function pointField(sources: Charge[], p: Vec3): Vec3 {
  const e: Vec3 = [0, 0, 0];
  for (const c of sources) {
    const r = sub(p, c.pos);
    const d = len(r);
    if (d < 1e-9) continue;
    const s = c.q / (d * d * d);
    e[0] += s * r[0];
    e[1] += s * r[1];
    e[2] += s * r[2];
  }
  return e;
}

export const electricField = pointField;

export interface FieldLine {
  points: Vec3[];
  /** Index of the charge the line ended on, or -1 if it left the bounds. */
  endCharge: number;
}

/**
 * Trace a field line from `start` by integrating the unit field direction with RK4.
 * `direction` = +1 follows E (away from + charges), −1 goes against it.
 */
export function traceLine(
  sources: Charge[],
  start: Vec3,
  direction: 1 | -1,
  { step = 0.02, maxSteps = 1500, bound = 6, captureRadius = 0.08 } = {},
): FieldLine {
  const dir = (p: Vec3): Vec3 => {
    const e = pointField(sources, p);
    const m = len(e) || 1;
    return [(direction * e[0]) / m, (direction * e[1]) / m, (direction * e[2]) / m];
  };
  const at = (p: Vec3, d: Vec3, h: number): Vec3 => [
    p[0] + d[0] * h,
    p[1] + d[1] * h,
    p[2] + d[2] * h,
  ];
  let p = start;
  const points: Vec3[] = [p];
  for (let i = 0; i < maxSteps; i++) {
    const k1 = dir(p);
    const k2 = dir(at(p, k1, step / 2));
    const k3 = dir(at(p, k2, step / 2));
    const k4 = dir(at(p, k3, step));
    p = [
      p[0] + ((k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]) * step) / 6,
      p[1] + ((k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]) * step) / 6,
      p[2] + ((k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]) * step) / 6,
    ];
    points.push(p);
    for (let j = 0; j < sources.length; j++) {
      const c = sources[j];
      if (Math.sign(c.q) === -direction && len(sub(p, c.pos)) < captureRadius) {
        points.push(c.pos);
        return { points, endCharge: j };
      }
    }
    if (len(p) > bound) break;
  }
  return { points, endCharge: -1 };
}

/** Evenly spread unit vectors on a sphere (Fibonacci lattice). */
export function fibonacciSphere(n: number): Vec3[] {
  const out: Vec3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    out.push([Math.cos(golden * i) * r, y, Math.sin(golden * i) * r]);
  }
  return out;
}

/** Field lines seeded around each positive charge, with a count proportional to its charge. */
export function fieldLines(sources: Charge[], perUnitCharge = 14, seedRadius = 0.12): FieldLine[] {
  const lines: FieldLine[] = [];
  const positive = sources.filter((c) => c.q > 0);
  const negative = sources.filter((c) => c.q < 0);
  const seedFrom = positive.length ? positive : negative;
  const direction: 1 | -1 = positive.length ? 1 : -1;
  for (const c of seedFrom) {
    const n = Math.max(4, Math.round(Math.abs(c.q) * perUnitCharge));
    for (const u of fibonacciSphere(n)) {
      const start: Vec3 = [
        c.pos[0] + u[0] * seedRadius,
        c.pos[1] + u[1] * seedRadius,
        c.pos[2] + u[2] * seedRadius,
      ];
      lines.push(traceLine(sources, start, direction));
    }
  }
  return lines;
}

/**
 * Bar magnet as two magnetic poles (Gilbert model), good outside the magnet.
 * The north pole sits at +x.
 */
export function barMagnetPoles(length: number, strength = 1): Charge[] {
  return [
    { pos: [length / 2, 0, 0], q: strength },
    { pos: [-length / 2, 0, 0], q: -strength },
  ];
}
