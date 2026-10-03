// Projectile motion from a raised launch point. SI units throughout.

export const G_EARTH = 9.81;

export interface Launch {
  /** Launch speed, m/s */
  v0: number;
  /** Launch angle above horizontal, degrees */
  angleDeg: number;
  /** Launch height above the landing ground, m */
  h: number;
  /** Gravitational acceleration, m/s² */
  g?: number;
  /** Quadratic drag coefficient per unit mass, 1/m (0 = vacuum) */
  k?: number;
}

export interface State {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const rad = (deg: number) => (deg * Math.PI) / 180;

export function components(l: Launch) {
  const a = rad(l.angleDeg);
  return { vx: l.v0 * Math.cos(a), vy: l.v0 * Math.sin(a) };
}

/** Exact state at time t (no drag). */
export function exactAt(l: Launch, t: number): State {
  const g = l.g ?? G_EARTH;
  const { vx, vy } = components(l);
  return { t, x: vx * t, y: l.h + vy * t - 0.5 * g * t * t, vx, vy: vy - g * t };
}

/** Time until the projectile returns to y = 0 (no drag). */
export function flightTime(l: Launch): number {
  const g = l.g ?? G_EARTH;
  const { vy } = components(l);
  return (vy + Math.sqrt(vy * vy + 2 * g * l.h)) / g;
}

export function range(l: Launch): number {
  return components(l).vx * flightTime(l);
}

export function maxHeight(l: Launch): number {
  const g = l.g ?? G_EARTH;
  const { vy } = components(l);
  return l.h + (vy > 0 ? (vy * vy) / (2 * g) : 0);
}

export function timeToApex(l: Launch): number {
  const { vy } = components(l);
  return Math.max(0, vy / (l.g ?? G_EARTH));
}

function deriv(s: State, g: number, k: number): [number, number, number, number] {
  const speed = Math.hypot(s.vx, s.vy);
  return [s.vx, s.vy, -k * speed * s.vx, -g - k * speed * s.vy];
}

/** One classical Runge–Kutta 4 step. */
export function rk4Step(s: State, dt: number, g: number, k: number): State {
  const add = (a: State, d: number[], h: number): State => ({
    t: a.t + h,
    x: a.x + d[0] * h,
    y: a.y + d[1] * h,
    vx: a.vx + d[2] * h,
    vy: a.vy + d[3] * h,
  });
  const k1 = deriv(s, g, k);
  const k2 = deriv(add(s, k1, dt / 2), g, k);
  const k3 = deriv(add(s, k2, dt / 2), g, k);
  const k4 = deriv(add(s, k3, dt), g, k);
  const c = (i: number) => (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6;
  return {
    t: s.t + dt,
    x: s.x + c(0) * dt,
    y: s.y + c(1) * dt,
    vx: s.vx + c(2) * dt,
    vy: s.vy + c(3) * dt,
  };
}

/** Integrate until the projectile lands (y = 0). The last sample is interpolated onto the ground. */
export function simulate(l: Launch, dt = 1 / 240): State[] {
  const g = l.g ?? G_EARTH;
  const k = l.k ?? 0;
  const { vx, vy } = components(l);
  let s: State = { t: 0, x: 0, y: l.h, vx, vy };
  const out = [s];
  for (let i = 0; i < 1e6; i++) {
    const n = rk4Step(s, dt, g, k);
    if (n.y <= 0 && n.t > 0) {
      // Integrate a partial step onto the ground, refining its length with Newton's method.
      let h = (dt * s.y) / (s.y - n.y);
      let land = rk4Step(s, h, g, k);
      for (let j = 0; j < 4 && Math.abs(land.y) > 1e-12; j++) {
        h -= land.y / land.vy;
        land = rk4Step(s, h, g, k);
      }
      out.push(land);
      break;
    }
    out.push(n);
    s = n;
  }
  return out;
}

/** Mechanical energy per unit mass, J/kg. */
export function energyPerMass(s: State, g = G_EARTH): number {
  return 0.5 * (s.vx * s.vx + s.vy * s.vy) + g * s.y;
}

/** Linear interpolation of a sampled trajectory at time t. */
export function sampleAt(path: State[], t: number): State {
  if (t <= path[0].t) return path[0];
  const last = path[path.length - 1];
  if (t >= last.t) return last;
  let lo = 0;
  let hi = path.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (path[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = path[lo];
  const b = path[hi];
  const f = (t - a.t) / (b.t - a.t);
  return {
    t,
    x: a.x + f * (b.x - a.x),
    y: a.y + f * (b.y - a.y),
    vx: a.vx + f * (b.vx - a.vx),
    vy: a.vy + f * (b.vy - a.vy),
  };
}
