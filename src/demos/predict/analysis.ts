// Compare a student's sketches with the true motion and name the likely misconception.

import {
  components,
  flightTime,
  type Launch,
  maxHeight,
  range,
  timeToApex,
} from "../../physics/projectile";

export type Pt = [number, number];

export interface Finding {
  id: string;
  kind: "good" | "warn" | "bad";
  title: string;
  detail: string;
}

function linearFit(pts: Pt[]) {
  const n = pts.length;
  const mx = pts.reduce((a, p) => a + p[0], 0) / n;
  const my = pts.reduce((a, p) => a + p[1], 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const [x, y] of pts) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
  }
  const slope = sxx ? sxy / sxx : 0;
  const r2 = sxx && syy ? (sxy * sxy) / (sxx * syy) : 1;
  return { slope, intercept: my - slope * mx, r2 };
}

/** True height of the path at horizontal distance x (no drag). */
export function trueY(l: Launch, x: number): number {
  const { vx, vy } = components(l);
  const t = x / vx;
  return l.h + vy * t - 0.5 * (l.g ?? 9.81) * t * t;
}

export interface PathResult {
  meanError: number;
  landingX: number;
  score: number;
  findings: Finding[];
}

/** `sketch` is in metres (x from the muzzle, y above the sea), in drawing order. */
export function analysePath(l: Launch, sketch: Pt[]): PathResult {
  const R = range(l);
  const H = maxHeight(l);
  const pts = sketch.filter((p) => p[0] >= -2);
  const findings: Finding[] = [];
  if (pts.length < 4) {
    return {
      meanError: Number.NaN,
      landingX: Number.NaN,
      score: 0,
      findings: [
        {
          id: "empty",
          kind: "warn",
          title: "No path drawn",
          detail: "Draw from the cannon's mouth to where you think the ball hits the water.",
        },
      ],
    };
  }
  const inRange = pts.filter((p) => p[0] >= 0 && p[0] <= R);
  const meanError = inRange.length
    ? inRange.reduce((a, p) => a + Math.abs(p[1] - Math.max(0, trueY(l, p[0]))), 0) / inRange.length
    : Number.NaN;

  // Landing: where the sketch reaches sea level (or its furthest point).
  let landingX = pts[pts.length - 1][0];
  for (let i = 1; i < pts.length; i++) {
    if (pts[i][1] <= 0.5 && pts[i - 1][1] > 0.5) {
      const f = (pts[i - 1][1] - 0.5) / (pts[i - 1][1] - pts[i][1]);
      landingX = pts[i - 1][0] + f * (pts[i][0] - pts[i - 1][0]);
      break;
    }
  }
  const landErr = (landingX - R) / R;
  const score = Math.max(
    0,
    Math.round(100 - (meanError / Math.max(H, 10)) * 160 - Math.abs(landErr) * 60),
  );

  const n = pts.length;
  const xSpan = Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0]));

  // 1. "Straight, then drop": the first part is a straight line and the end is much steeper.
  const head = pts.slice(0, Math.max(3, Math.floor(n * 0.45)));
  const tail = pts.slice(Math.floor(n * 0.75));
  const headFit = linearFit(head);
  const tailDx = tail[tail.length - 1][0] - tail[0][0];
  const tailDy = tail[tail.length - 1][1] - tail[0][1];
  const headStraight = headFit.r2 > 0.985 && head.length >= 4;
  const tailSteep = Math.abs(tailDy) > 3 * Math.abs(tailDx) && tailDy < 0;
  if (headStraight && tailSteep) {
    findings.push({
      id: "straight-then-drop",
      kind: "bad",
      title: "Straight out, then straight down",
      detail:
        "Like a cartoon character running off a cliff. In reality gravity pulls the ball down from the moment it leaves the barrel, so the path curves all the way.",
    });
  } else if (tailSteep && Math.abs(tailDx) < xSpan * 0.03) {
    findings.push({
      id: "vertical-drop",
      kind: "bad",
      title: "The ball doesn't drop straight down",
      detail:
        "Nothing slows the ball's sideways motion (ignoring air), so it keeps moving forward at the same speed all the way to the water.",
    });
  }

  // 2. Apex position: from a cliff the way down is longer than the way up.
  let apex = pts[0];
  for (const p of pts) if (p[1] > apex[1]) apex = p;
  const trueApexX = components(l).vx * timeToApex(l);
  if (l.h > 3 && apex[0] - trueApexX > R * 0.2 && apex[1] > l.h + 1) {
    findings.push({
      id: "symmetric",
      kind: "warn",
      title: "The arc is not symmetric",
      detail:
        "Launched from a cliff, the ball has further to fall than it rose, so the highest point comes early and the descent is longer and steeper.",
    });
  }

  // 3. Landing distance.
  if (Math.abs(landErr) <= 0.1) {
    findings.push({
      id: "landing-good",
      kind: "good",
      title: "Landing spot within 10%",
      detail: `You predicted ${landingX.toFixed(0)} m; it landed at ${R.toFixed(0)} m.`,
    });
  } else {
    findings.push({
      id: landErr < 0 ? "landing-short" : "landing-long",
      kind: "warn",
      title:
        landErr < 0 ? "Landed further than you predicted" : "Landed shorter than you predicted",
      detail: `You predicted ${landingX.toFixed(0)} m; it landed at ${R.toFixed(0)} m. The horizontal speed stays ${components(l).vx.toFixed(1)} m/s for the whole ${flightTime(l).toFixed(1)} s flight.`,
    });
  }
  if (findings.every((f) => f.kind === "good") && meanError < H * 0.15) {
    findings.unshift({
      id: "shape-good",
      kind: "good",
      title: "The shape is right",
      detail:
        "A parabola: steady sideways motion combined with steadily increasing downward speed.",
    });
  }
  return { meanError, landingX, score, findings };
}

function maxResidual(pts: Pt[], fit: { slope: number; intercept: number }) {
  return Math.max(...pts.map(([x, y]) => Math.abs(y - (fit.slope * x + fit.intercept))));
}

export interface GraphResult {
  score: number;
  findings: Finding[];
}

/** `sketch` is vertical velocity (m/s, up positive) against time (s). */
export function analyseGraph(l: Launch, sketch: Pt[]): GraphResult {
  const g = l.g ?? 9.81;
  const T = flightTime(l);
  const vy0 = components(l).vy;
  const pts = sketch.filter((p) => p[0] >= 0 && p[0] <= T * 1.05);
  const findings: Finding[] = [];
  if (pts.length < 4) {
    return {
      score: 0,
      findings: [
        {
          id: "empty",
          kind: "warn",
          title: "No graph drawn",
          detail:
            "Draw how the ball's vertical velocity changes from launch until it hits the water.",
        },
      ],
    };
  }
  const fit = linearFit(pts);
  const extent = Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1]));
  const meanErr = pts.reduce((a, [t, v]) => a + Math.abs(v - (vy0 - g * t)), 0) / pts.length;
  const span = vy0 + g * T;
  const score = Math.max(0, Math.round(100 - (meanErr / span) * 220));

  if (fit.slope >= 0) {
    findings.push({
      id: "slope-sign",
      kind: "bad",
      title: "Vertical velocity should go down, not up",
      detail:
        "Gravity reduces the upward velocity by 9.8 m/s every second, through zero and on into negative (downward) values.",
    });
  } else if (fit.r2 < 0.93 || maxResidual(pts, fit) > extent * 0.07) {
    findings.push({
      id: "curved",
      kind: "warn",
      title: "The graph should be a straight line",
      detail:
        "Gravity changes the vertical velocity by the same 9.8 m/s every second, so the velocity–time graph has a constant slope of −9.8 m/s².",
    });
  } else if (Math.abs(fit.slope + g) / g < 0.25) {
    findings.push({
      id: "slope-good",
      kind: "good",
      title: "Straight line with the right slope",
      detail: `Your slope is ${fit.slope.toFixed(1)} m/s²; gravity gives −9.8 m/s².`,
    });
  } else {
    findings.push({
      id: "slope-off",
      kind: "warn",
      title: `Slope ${fit.slope.toFixed(1)} m/s²`,
      detail:
        "The slope of this graph is the acceleration, which is −9.8 m/s² throughout the flight.",
    });
  }

  // Lingering at zero at the top.
  const nearZero = pts.filter(([, v]) => Math.abs(v) < span * 0.06);
  if (nearZero.length > 2) {
    const dur = Math.max(...nearZero.map((p) => p[0])) - Math.min(...nearZero.map((p) => p[0]));
    if (dur > T * 0.18) {
      findings.push({
        id: "pause-at-top",
        kind: "bad",
        title: "No pause at the top",
        detail:
          "At the highest point the vertical velocity is zero for only an instant. The acceleration is still −9.8 m/s² there, so it keeps changing.",
      });
    }
  }
  const first = pts[0][1];
  if (vy0 > 2 && Math.abs(first - vy0) > Math.max(3, vy0 * 0.35)) {
    findings.push({
      id: "start",
      kind: "warn",
      title: `It starts at +${vy0.toFixed(1)} m/s`,
      detail:
        "At launch the vertical velocity is v₀ sin θ, the upward part of the launch velocity.",
    });
  }
  const last = pts[pts.length - 1][1];
  const vEnd = vy0 - g * T;
  if (Math.abs(last) < Math.abs(vEnd) * 0.3) {
    findings.push({
      id: "ends-at-zero",
      kind: "warn",
      title: "It hits the water moving fast",
      detail: `Just before splashdown it is moving downward at ${Math.abs(vEnd).toFixed(1)} m/s. Hitting the water is what stops it, not the end of the graph.`,
    });
  }
  return { score, findings };
}
