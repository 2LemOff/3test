// N-body gravity with velocity Verlet (symplectic, so energy stays bounded over long runs).
// Units are scaled: G = 1, distances in scene units.

export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  m: number;
  /** Bodies with fixed = true do not move (e.g. a heavy star). */
  fixed?: boolean;
}

const SOFTENING = 1e-4;

export function accelerations(bodies: Body[], G = 1): [number, number][] {
  const acc: [number, number][] = bodies.map(() => [0, 0]);
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const dx = bodies[j].x - bodies[i].x;
      const dy = bodies[j].y - bodies[i].y;
      const r2 = dx * dx + dy * dy + SOFTENING;
      const inv = G / (r2 * Math.sqrt(r2));
      acc[i][0] += dx * inv * bodies[j].m;
      acc[i][1] += dy * inv * bodies[j].m;
      acc[j][0] -= dx * inv * bodies[i].m;
      acc[j][1] -= dy * inv * bodies[i].m;
    }
  }
  return acc;
}

/** Advance all bodies by dt in place. Pass the previous accelerations to save a force evaluation. */
export function verletStep(bodies: Body[], dt: number, G = 1, prev?: [number, number][]) {
  const a0 = prev ?? accelerations(bodies, G);
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b.fixed) continue;
    b.x += b.vx * dt + 0.5 * a0[i][0] * dt * dt;
    b.y += b.vy * dt + 0.5 * a0[i][1] * dt * dt;
  }
  const a1 = accelerations(bodies, G);
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b.fixed) continue;
    b.vx += 0.5 * (a0[i][0] + a1[i][0]) * dt;
    b.vy += 0.5 * (a0[i][1] + a1[i][1]) * dt;
  }
  return a1;
}

export function totalEnergy(bodies: Body[], G = 1): number {
  let e = 0;
  for (const b of bodies) if (!b.fixed) e += 0.5 * b.m * (b.vx * b.vx + b.vy * b.vy);
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const r = Math.hypot(bodies[j].x - bodies[i].x, bodies[j].y - bodies[i].y);
      e -= (G * bodies[i].m * bodies[j].m) / Math.sqrt(r * r + SOFTENING);
    }
  }
  return e;
}

/** Speed for a circular orbit of radius r around mass M. */
export function circularSpeed(M: number, r: number, G = 1): number {
  return Math.sqrt((G * M) / r);
}

/** Kepler's third law: period of an orbit with semi-major axis a around mass M. */
export function keplerPeriod(M: number, a: number, G = 1): number {
  return 2 * Math.PI * Math.sqrt((a * a * a) / (G * M));
}
