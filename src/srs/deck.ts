// A mechanics deck that uses every card style from docs/active-recall.md.

export type CardStyle =
  | "basic"
  | "reverse"
  | "cloze"
  | "symbol"
  | "formula"
  | "graph"
  | "occlusion"
  | "numeric"
  | "why"
  | "minisim";

export const STYLE_LABEL: Record<CardStyle, string> = {
  basic: "Basic",
  reverse: "Reverse",
  cloze: "Cloze",
  symbol: "Symbol",
  formula: "When it applies",
  graph: "Graph shape",
  occlusion: "Hidden label",
  numeric: "Numbers change",
  why: "Why",
  minisim: "Predict, then flip",
};

export interface CardFace {
  /** Text with inline maths in $…$. */
  front: string;
  back: string;
  /** Typed answer checking. */
  check?:
    | { kind: "numeric"; answer: number; unit: string; tolerance?: number }
    | { kind: "text"; accepted: string[] };
}

export interface CardDef {
  id: string;
  style: CardStyle;
  topic: string;
  /** A visual drawn on the card (front or back). */
  visual?: "vt-throw-up" | "xt-constant" | "fbd-incline" | "two-balls";
  make: (seed: number) => CardFace;
}

const rnd = (seed: number, k: number) => {
  const x = Math.sin(seed * 9301 + k * 49297) * 233280;
  return x - Math.floor(x);
};

export const DECK: CardDef[] = [
  {
    id: "unit-force",
    style: "basic",
    topic: "Units",
    make: () => ({
      front: "What is the SI unit of force?",
      back: "The newton (N). $1\\ \\text{N} = 1\\ \\text{kg·m/s}^2$",
      check: { kind: "text", accepted: ["newton", "newtons", "N"] },
    }),
  },
  {
    id: "unit-energy-rev",
    style: "reverse",
    topic: "Units",
    make: () => ({
      front: "Which quantity is measured in joules?",
      back: "Energy (and work). $1\\ \\text{J} = 1\\ \\text{N·m}$",
    }),
  },
  {
    id: "suvat-cloze",
    style: "cloze",
    topic: "Kinematics",
    make: () => ({
      front: "Fill the gap: $v^2 = u^2 + 2\\,\\boxed{\\;?\\;}\\,s$",
      back: "$v^2 = u^2 + 2\\,a\\,s$, where $a$ is the acceleration.",
      check: { kind: "text", accepted: ["a", "acceleration"] },
    }),
  },
  {
    id: "newton2-cloze",
    style: "cloze",
    topic: "Dynamics",
    make: () => ({
      front: "Fill the gap: $F_{\\text{net}} = m\\,\\boxed{\\;?\\;}$",
      back: "$F_{\\text{net}} = m\\,a$",
      check: { kind: "text", accepted: ["a", "acceleration"] },
    }),
  },
  {
    id: "sym-lambda",
    style: "symbol",
    topic: "Waves",
    make: () => ({
      front: "What does $\\lambda$ stand for, and what is its SI unit?",
      back: "Wavelength, measured in metres (m).",
    }),
  },
  {
    id: "sym-omega",
    style: "symbol",
    topic: "Circular motion",
    make: () => ({
      front: "What does $\\omega$ stand for, and what is its SI unit?",
      back: "Angular velocity, in radians per second (rad/s).",
    }),
  },
  {
    id: "suvat-when",
    style: "formula",
    topic: "Kinematics",
    make: () => ({
      front: "When can you use $v = u + at$?",
      back: "Only when the acceleration is **constant**. If it changes, you need calculus or a graph.",
    }),
  },
  {
    id: "vt-up",
    style: "graph",
    topic: "Kinematics",
    visual: "vt-throw-up",
    make: () => ({
      front:
        "Sketch $v$ against $t$ for a ball thrown straight up and caught again (up is positive).",
      back: "A straight line with slope $-g$, crossing zero at the top. No flat part: it is at rest for only an instant.",
    }),
  },
  {
    id: "xt-const",
    style: "graph",
    topic: "Kinematics",
    visual: "xt-constant",
    make: () => ({
      front: "What does $x$ against $t$ look like for constant velocity?",
      back: "A straight line. Its slope is the velocity.",
    }),
  },
  {
    id: "fbd-hidden",
    style: "occlusion",
    topic: "Forces",
    visual: "fbd-incline",
    make: () => ({
      front: "A block rests on a rough slope. Name the hidden force.",
      back: "The normal reaction force, perpendicular to the surface.",
      check: {
        kind: "text",
        accepted: [
          "normal",
          "normal force",
          "normal reaction",
          "reaction",
          "normal reaction force",
        ],
      },
    }),
  },
  {
    id: "car-accel",
    style: "numeric",
    topic: "Kinematics",
    make: (seed) => {
      const a = Math.round((1.5 + rnd(seed, 1) * 3) * 10) / 10;
      const t = Math.round(4 + rnd(seed, 2) * 8);
      return {
        front: `A car accelerates from rest at ${a} m/s² for ${t} s. What is its final speed?`,
        back: `$v = u + at = 0 + ${a} \\times ${t} = ${(a * t).toFixed(1)}\\ \\text{m/s}$`,
        check: { kind: "numeric", answer: a * t, unit: "m/s" },
      };
    },
  },
  {
    id: "weight",
    style: "numeric",
    topic: "Forces",
    make: (seed) => {
      const m = Math.round(2 + rnd(seed, 3) * 70);
      return {
        front: `What is the weight of a ${m} kg mass on Earth? ($g = 9.8\\ \\text{m/s}^2$)`,
        back: `$W = mg = ${m} \\times 9.8 = ${(m * 9.8).toFixed(0)}\\ \\text{N}$`,
        check: { kind: "numeric", answer: m * 9.8, unit: "N" },
      };
    },
  },
  {
    id: "orbit-why",
    style: "why",
    topic: "Gravity",
    make: () => ({
      front: "Why doesn't a satellite in orbit fall to Earth?",
      back: "It **is** falling, all the time. It also moves sideways so fast that the ground curves away as quickly as it falls.",
    }),
  },
  {
    id: "same-fall-why",
    style: "why",
    topic: "Gravity",
    make: () => ({
      front: "Without air, why do heavy and light objects fall with the same acceleration?",
      back: "Weight is proportional to mass, so $a = F/m = mg/m = g$ for every object.",
    }),
  },
  {
    id: "two-balls",
    style: "minisim",
    topic: "Projectiles",
    visual: "two-balls",
    make: () => ({
      front:
        "Two balls leave a table at the same moment: one is dropped, one is pushed sideways. Which lands first? Decide, then flip.",
      back: "They land **together**. Sideways motion doesn't change how fast you fall.",
    }),
  },
];

/** Plain-text version of a face for the printed index card (no KaTeX on a canvas). */
export function plainText(s: string): string {
  return s
    .replace(/\$([^$]*)\$/g, (_, m: string) =>
      m
        .replace(/\\boxed\{\\;\?\\;\}/g, "[ ? ]")
        .replace(/\\text\{([^}]*)\}/g, "$1")
        .replace(/_\{\\text\{net\}\}/g, "net")
        .replace(/\\lambda/g, "λ")
        .replace(/\\omega/g, "ω")
        .replace(/\\times/g, "×")
        .replace(/\^2/g, "²")
        .replace(/\\[,;: ]/g, " ")
        .replace(/\\ /g, " ")
        .replace(/[{}]/g, "")
        .replace(/\\/g, ""),
    )
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
