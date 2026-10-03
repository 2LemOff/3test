// Questions generated from a launch, one family per skill, with worked solutions.

import { components, flightTime, type Launch, maxHeight, range } from "../../physics/projectile";

export type Skill = "components" | "time" | "range" | "height";

export const SKILLS: { id: Skill; label: string }[] = [
  { id: "components", label: "Velocity components" },
  { id: "time", label: "Time of flight" },
  { id: "range", label: "Range" },
  { id: "height", label: "Maximum height" },
];

export interface Question {
  skill: Skill;
  launch: Launch;
  prompt: string;
  answer: number;
  unit: string;
  /** Worked solution, one LaTeX line per step. */
  steps: string[];
  hint: string;
}

export function makeLaunch(seed: number): Launch {
  let s = (seed * 7919 + 104729) % 2147483647;
  const r = () => {
    s = (s * 48271) % 2147483647;
    return s / 2147483647;
  };
  return {
    v0: Math.round(14 + r() * 16),
    angleDeg: Math.round((15 + r() * 50) / 5) * 5,
    h: Math.round((12 + r() * 36) / 2) * 2,
  };
}

const f1 = (v: number) => v.toFixed(1);

export function makeQuestion(skill: Skill, launch: Launch, variant = 0): Question {
  const { v0, angleDeg: a, h } = launch;
  const { vx, vy } = components(launch);
  const T = flightTime(launch);
  const R = range(launch);
  const H = maxHeight(launch);
  const setup = `A cannon fires at ${v0} m/s, ${a}° above the horizontal, from ${h} m above the sea.`;
  switch (skill) {
    case "components":
      return variant % 2 === 0
        ? {
            skill,
            launch,
            prompt: `${setup} What is the horizontal component of the launch velocity?`,
            answer: vx,
            unit: "m/s",
            steps: [
              `v_x = v_0 \\cos\\theta`,
              `v_x = ${v0} \\times \\cos ${a}^\\circ`,
              `v_x = ${f1(vx)}\\ \\text{m/s}`,
            ],
            hint: "The horizontal side of the velocity triangle is next to the angle: use cosine.",
          }
        : {
            skill,
            launch,
            prompt: `${setup} What is the vertical component of the launch velocity?`,
            answer: vy,
            unit: "m/s",
            steps: [
              `v_y = v_0 \\sin\\theta`,
              `v_y = ${v0} \\times \\sin ${a}^\\circ`,
              `v_y = ${f1(vy)}\\ \\text{m/s}`,
            ],
            hint: "The vertical side of the velocity triangle is opposite the angle: use sine.",
          };
    case "time":
      return {
        skill,
        launch,
        prompt: `${setup} How long is the ball in the air before it hits the water?`,
        answer: T,
        unit: "s",
        steps: [
          `0 = h + v_y t - \\tfrac12 g t^2 \\quad\\text{with } v_y = ${f1(vy)}`,
          `4.9\\,t^2 - ${f1(vy)}\\,t - ${h} = 0`,
          `t = \\dfrac{${f1(vy)} + \\sqrt{${f1(vy)}^2 + 2 \\times 9.8 \\times ${h}}}{9.8}`,
          `t = ${T.toFixed(2)}\\ \\text{s}`,
        ],
        hint: "Set the height to zero and solve the quadratic in t. Take the positive root.",
      };
    case "range":
      return {
        skill,
        launch,
        prompt: `${setup} How far from the cannon does the ball hit the water?`,
        answer: R,
        unit: "m",
        steps: [
          `t = ${T.toFixed(2)}\\ \\text{s} \\quad\\text{(time of flight)}`,
          `x = v_x\\, t = ${f1(vx)} \\times ${T.toFixed(2)}`,
          `x = ${f1(R)}\\ \\text{m}`,
        ],
        hint: "Find the time of flight first. Horizontally the ball moves at constant speed for that whole time.",
      };
    case "height":
      return {
        skill,
        launch,
        prompt: `${setup} What is the greatest height of the ball above the sea?`,
        answer: H,
        unit: "m",
        steps: [
          `\\text{At the top } v_y = 0: \\quad v_y^2 = 2 g\\,\\Delta y`,
          `\\Delta y = \\dfrac{${f1(vy)}^2}{2 \\times 9.8} = ${f1(H - h)}\\ \\text{m}`,
          `y_{\\max} = ${h} + ${f1(H - h)} = ${f1(H)}\\ \\text{m}`,
        ],
        hint: "At the highest point the vertical velocity is zero. Don't forget to add the cliff height.",
      };
  }
}

/** Simple knowledge tracing: estimated probability the skill is mastered. */
export function updateMastery(p: number, correct: boolean): number {
  return correct ? p + (1 - p) * 0.4 : p * 0.55;
}

export type MasteryStatus = "mastered" | "developing" | "missing" | "new";

export function masteryStatus(p: number, attempts: number): MasteryStatus {
  if (attempts === 0) return "new";
  if (p >= 0.8) return "mastered";
  if (p >= 0.45) return "developing";
  return "missing";
}

/** Pick the weakest skill to practise next. */
export function nextSkill(
  mastery: Record<Skill, { p: number; n: number }>,
  previous?: Skill,
): Skill {
  const order = SKILLS.map((s) => s.id).sort(
    (a, b) => mastery[a].p - mastery[b].p || mastery[a].n - mastery[b].n,
  );
  return order[0] === previous && mastery[order[1]].p - mastery[order[0]].p < 0.15
    ? order[1]
    : order[0];
}
