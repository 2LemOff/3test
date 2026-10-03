// Checking typed answers.

/**
 * Parse a typed number. Accepts "9.81", "9,81", "3e8", "3×10^8", "3 x 10^8", "−4.2" and
 * ignores a trailing unit ("12.5 m/s").
 */
export function parseNumber(input: string): number | null {
  const s = input
    .trim()
    .replace(/[−–]/g, "-")
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/\s+/g, "");
  const sci = s.match(/^([-+]?\d*\.?\d+)(?:[x×*]10\^?([-+]?\d+))/i);
  if (sci) return Number.parseFloat(sci[1]) * 10 ** Number.parseInt(sci[2], 10);
  const plain = s.match(/^[-+]?\d*\.?\d+(?:e[-+]?\d+)?/i);
  return plain ? Number.parseFloat(plain[0]) : null;
}

/** True when the typed value is within a relative tolerance of the answer (default 2%). */
export function checkNumeric(input: string, answer: number, tolerance = 0.02): boolean {
  const v = parseNumber(input);
  if (v === null || !Number.isFinite(v)) return false;
  if (answer === 0) return Math.abs(v) < tolerance;
  return Math.abs(v - answer) / Math.abs(answer) <= tolerance;
}

/** Loose text match for short answers: case, spacing and punctuation are ignored. */
export function checkText(input: string, accepted: string[]): boolean {
  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "");
  const v = norm(input);
  return v.length > 0 && accepted.some((a) => norm(a) === v);
}
