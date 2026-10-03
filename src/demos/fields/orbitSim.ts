// Gravitational slingshot set-up: a star, a giant planet on a circular orbit, and a probe
// launched from an inner orbit. Scaled units with G = 1. Masses and sizes are exaggerated so
// the encounter is visible; the mechanics are exact for those masses.

import { type Body, circularSpeed, verletStep } from "../../physics/orbits";

export const STAR_M = 1000;
export const PLANET_M = 3;
export const PLANET_R = 8;
export const HOME_R = 3;
export const SIM_T = 9;
const DT = 0.002;
const STRIDE = 10;

export interface Track {
  t: Float32Array;
  probe: Float32Array; // x,y pairs
  planet: Float32Array;
  speed: Float32Array;
  closest: number;
  closestT: number;
  crashed: boolean;
  finalSpeed: number;
  /** Change in orbital energy per unit mass (only the planet encounter can change it). */
  energyGain: number;
}

export function simulate(planetDeg: number, boost: number): Track {
  const phi = (planetDeg * Math.PI) / 180;
  const vp = circularSpeed(STAR_M, PLANET_R);
  const v0 = circularSpeed(STAR_M, HOME_R) * boost;
  const bodies: Body[] = [
    { x: 0, y: 0, vx: 0, vy: 0, m: STAR_M, fixed: true },
    {
      x: PLANET_R * Math.cos(phi),
      y: PLANET_R * Math.sin(phi),
      vx: -vp * Math.sin(phi),
      vy: vp * Math.cos(phi),
      m: PLANET_M,
    },
    { x: HOME_R, y: 0, vx: 0, vy: v0, m: 1e-9 },
  ];
  const n = Math.floor(SIM_T / DT / STRIDE) + 1;
  const tr: Track = {
    t: new Float32Array(n),
    probe: new Float32Array(n * 2),
    planet: new Float32Array(n * 2),
    speed: new Float32Array(n),
    closest: Number.POSITIVE_INFINITY,
    closestT: 0,
    crashed: false,
    finalSpeed: 0,
    energyGain: 0,
  };
  let acc: [number, number][] | undefined;
  let k = 0;
  for (let i = 0; k < n; i++) {
    const [, pl, pr] = bodies;
    const d = Math.hypot(pr.x - pl.x, pr.y - pl.y);
    if (d < tr.closest) {
      tr.closest = d;
      tr.closestT = i * DT;
    }
    if (d < 0.18) tr.crashed = true;
    if (i % STRIDE === 0) {
      tr.t[k] = i * DT;
      tr.probe.set([pr.x, pr.y], k * 2);
      tr.planet.set([pl.x, pl.y], k * 2);
      tr.speed[k] = Math.hypot(pr.vx, pr.vy);
      k++;
    }
    if (tr.crashed) {
      // Freeze the probe on the planet's surface for the rest of the run.
      pr.vx = pl.vx;
      pr.vy = pl.vy;
      pr.x = pl.x;
      pr.y = pl.y;
    }
    acc = verletStep(bodies, DT, 1, acc);
  }
  tr.finalSpeed = tr.speed[n - 1];
  const [, , pr] = bodies;
  tr.energyGain =
    0.5 * (pr.vx ** 2 + pr.vy ** 2) -
    STAR_M / Math.hypot(pr.x, pr.y) -
    (0.5 * v0 * v0 - STAR_M / HOME_R);
  return tr;
}

/** Search the planet's starting angle for the encounter that adds the most orbital energy. */
export function bestSlingshot(boost: number): number {
  let best = 0;
  let bestE = Number.NEGATIVE_INFINITY;
  for (let deg = 0; deg < 360; deg += 2) {
    const tr = simulate(deg, boost);
    if (tr.crashed || tr.closest < 0.45) continue;
    if (tr.energyGain > bestE) {
      bestE = tr.energyGain;
      best = deg;
    }
  }
  return best;
}
