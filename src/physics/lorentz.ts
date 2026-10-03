// Charged particles in electric and magnetic fields, and the fine-beam tube apparatus.

import type { Vec3 } from "./fields";

export const ELECTRON_CHARGE = 1.602176634e-19;
export const ELECTRON_MASS = 9.1093837015e-31;
export const MU0 = 1.25663706212e-6;

const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/**
 * Boris pusher: the standard integrator for F = q(E + v × B).
 * It conserves speed exactly in a pure magnetic field.
 */
export function borisStep(
  x: Vec3,
  v: Vec3,
  qOverM: number,
  E: Vec3,
  B: Vec3,
  dt: number,
): { x: Vec3; v: Vec3 } {
  const h = (qOverM * dt) / 2;
  const vMinus: Vec3 = [v[0] + h * E[0], v[1] + h * E[1], v[2] + h * E[2]];
  const t: Vec3 = [h * B[0], h * B[1], h * B[2]];
  const t2 = t[0] * t[0] + t[1] * t[1] + t[2] * t[2];
  const s: Vec3 = [(2 * t[0]) / (1 + t2), (2 * t[1]) / (1 + t2), (2 * t[2]) / (1 + t2)];
  const c1 = cross(vMinus, t);
  const vPrime: Vec3 = [vMinus[0] + c1[0], vMinus[1] + c1[1], vMinus[2] + c1[2]];
  const c2 = cross(vPrime, s);
  const vPlus: Vec3 = [vMinus[0] + c2[0], vMinus[1] + c2[1], vMinus[2] + c2[2]];
  const nv: Vec3 = [vPlus[0] + h * E[0], vPlus[1] + h * E[1], vPlus[2] + h * E[2]];
  return { x: [x[0] + nv[0] * dt, x[1] + nv[1] * dt, x[2] + nv[2] * dt], v: nv };
}

/** Speed of an electron accelerated from rest through voltage U (non-relativistic), m/s. */
export function electronSpeed(U: number): number {
  return Math.sqrt((2 * ELECTRON_CHARGE * U) / ELECTRON_MASS);
}

/** Field at the centre of a Helmholtz pair: B = (4/5)^{3/2} μ0 n I / R, tesla. */
export function helmholtzField(turns: number, current: number, radius: number): number {
  return (4 / 5) ** 1.5 * ((MU0 * turns * current) / radius);
}

/** Radius of circular motion r = m v / (q B), m. */
export function cyclotronRadius(m: number, v: number, q: number, B: number): number {
  return (m * v) / (Math.abs(q) * B);
}

/** Fine-beam tube: beam radius for accelerating voltage U and coil current I. */
export function beamRadius(U: number, I: number, turns = 130, coilRadius = 0.15): number {
  return cyclotronRadius(
    ELECTRON_MASS,
    electronSpeed(U),
    ELECTRON_CHARGE,
    helmholtzField(turns, I, coilRadius),
  );
}
