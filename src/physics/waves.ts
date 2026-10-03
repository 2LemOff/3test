// Interference and standing waves.

/**
 * Relative double-slit intensity at screen position y (0..1).
 * Two-slit interference (cos²) times single-slit diffraction (sinc²).
 * @param y position on screen, m
 * @param lambda wavelength, m
 * @param d slit separation (centre to centre), m
 * @param a slit width, m
 * @param L slit-to-screen distance, m
 */
export function doubleSlitIntensity(y: number, lambda: number, d: number, a: number, L: number) {
  const sinT = y / Math.hypot(y, L);
  const beta = (Math.PI * a * sinT) / lambda;
  const alpha = (Math.PI * d * sinT) / lambda;
  const sinc = beta === 0 ? 1 : Math.sin(beta) / beta;
  return Math.cos(alpha) ** 2 * sinc * sinc;
}

/** Small-angle bright-fringe spacing Δy = λL/d, m. */
export function fringeSpacing(lambda: number, d: number, L: number): number {
  return (lambda * L) / d;
}

/** Frequency of the n-th harmonic on a string fixed at both ends: f = n v / 2L, Hz. */
export function harmonicFrequency(n: number, waveSpeed: number, L: number): number {
  return (n * waveSpeed) / (2 * L);
}

/** Displacement of the n-th standing-wave mode. */
export function standingWave(x: number, t: number, n: number, L: number, A: number, f: number) {
  return A * Math.sin((n * Math.PI * x) / L) * Math.cos(2 * Math.PI * f * t);
}

/**
 * Response of a string driven at frequency f: each mode is a damped resonance, so the
 * nearest harmonic dominates. Returns per-mode amplitudes for modes 1..nModes.
 */
export function drivenModeAmplitudes(f: number, f1: number, nModes = 8, q = 25): number[] {
  const out = drivenResponse(f, f1, nModes, q);
  const max = Math.max(...out);
  return out.map((v) => v / max);
}

/** Unnormalised mode amplitudes; a mode driven exactly at resonance reaches q / n. */
export function drivenResponse(f: number, f1: number, nModes = 8, q = 25): number[] {
  const out: number[] = [];
  for (let n = 1; n <= nModes; n++) {
    const r = f / (n * f1);
    out.push(1 / Math.sqrt((1 - r * r) ** 2 + (r / q) ** 2) / n);
  }
  return out;
}

/** Approximate sRGB colour of visible light (380–750 nm), components 0..1. */
export function wavelengthToRGB(nm: number): [number, number, number] {
  let r = 0;
  let g = 0;
  let b = 0;
  if (nm < 440) [r, g, b] = [-(nm - 440) / 60, 0, 1];
  else if (nm < 490) [r, g, b] = [0, (nm - 440) / 50, 1];
  else if (nm < 510) [r, g, b] = [0, 1, -(nm - 510) / 20];
  else if (nm < 580) [r, g, b] = [(nm - 510) / 70, 1, 0];
  else if (nm < 645) [r, g, b] = [1, -(nm - 645) / 65, 0];
  else [r, g, b] = [1, 0, 0];
  let f = 1;
  if (nm < 420) f = 0.3 + (0.7 * (nm - 380)) / 40;
  else if (nm > 700) f = 0.3 + (0.7 * (750 - nm)) / 50;
  return [r * f, g * f, b * f].map((c) => Math.max(0, Math.min(1, c))) as [number, number, number];
}
