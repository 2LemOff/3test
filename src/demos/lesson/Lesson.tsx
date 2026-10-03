import { useMemo, useState } from "react";
import { components, flightTime, type Launch, maxHeight, range } from "../../physics/projectile";
import { checkNumeric } from "../../srs/check";
import { STILL } from "../../studio/clock";
import { CameraRig, Studio } from "../../studio/Studio";
import { fmt, Section, TeX } from "../../ui/controls";
import { DemoShell } from "../../ui/DemoShell";
import { CliffScene } from "../shared/CliffScene";
import {
  makeLaunch,
  makeQuestion,
  masteryStatus,
  nextSkill,
  type Question,
  SKILLS,
  type Skill,
  updateMastery,
} from "./questions";
import { offerWorksheet, worksheetQuestions } from "./worksheet";

type Mastery = Record<Skill, { p: number; n: number }>;
const KEY = "physics-lab:lesson-mastery";

function loadMastery(): Mastery {
  const blank = Object.fromEntries(SKILLS.map((s) => [s.id, { p: 0.25, n: 0 }])) as Mastery;
  if (STILL) {
    return {
      components: { p: 0.86, n: 4 },
      time: { p: 0.3, n: 3 },
      range: { p: 0.55, n: 2 },
      height: { p: 0.25, n: 0 },
    };
  }
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...blank, ...JSON.parse(raw) } : blank;
  } catch {
    return blank;
  }
}

function framingFor(l: Launch) {
  const R = range(l);
  const H = maxHeight(l);
  return {
    position: [R * 0.55 - 30, Math.max(H, l.h) * 0.9 + 14, R * 0.55 + 70] as [
      number,
      number,
      number,
    ],
    target: [R * 0.45, H * 0.45, 0] as [number, number, number],
  };
}

const STATUS_TEXT = {
  mastered: "Mastered",
  developing: "Developing",
  missing: "Missing",
  new: "Not started",
} as const;
const STATUS_COLOR = {
  mastered: "var(--good)",
  developing: "var(--warn)",
  missing: "var(--bad)",
  new: "var(--fg-3)",
} as const;

export function Lesson() {
  const [tab, setTab] = useState<"learn" | "practice" | "worksheet">(STILL ? "practice" : "learn");
  const [mastery, setMastery] = useState<Mastery>(loadMastery);
  const [qSeed, setQSeed] = useState(11);
  const [skill, setSkill] = useState<Skill>(() => nextSkill(loadMastery()));
  const question: Question = useMemo(
    () => makeQuestion(skill, makeLaunch(qSeed), qSeed),
    [skill, qSeed],
  );
  const [answer, setAnswer] = useState(STILL ? "41" : "");
  const [checked, setChecked] = useState<null | boolean>(null);
  const [fireKey, setFireKey] = useState(0);
  const [demoLaunch, setDemoLaunch] = useState<Launch>({ v0: 22, angleDeg: 40, h: 30 });
  const [wsSeed, setWsSeed] = useState(7);
  const [wsStatus, setWsStatus] = useState("");

  const launch = tab === "practice" ? question.launch : demoLaunch;
  const view = framingFor(launch);
  const save = (m: Mastery) => {
    setMastery(m);
    try {
      localStorage.setItem(KEY, JSON.stringify(m));
    } catch {
      /* storage unavailable: progress lasts for this visit only */
    }
  };

  const check = () => {
    const ok = checkNumeric(answer, question.answer, 0.03);
    setChecked(ok);
    const prev = mastery[skill];
    save({ ...mastery, [skill]: { p: updateMastery(prev.p, ok), n: prev.n + 1 } });
    setFireKey((k) => k + 1);
  };
  const next = () => {
    setSkill(nextSkill(mastery, skill));
    setQSeed((s) => s + 1);
    setAnswer("");
    setChecked(null);
  };

  const missing = SKILLS.filter(
    (s) => masteryStatus(mastery[s.id].p, mastery[s.id].n) === "missing",
  );
  const predictedX =
    tab === "practice" && skill === "range" && checked !== null
      ? Number.parseFloat(answer) || null
      : null;

  return (
    <DemoShell
      title="Lesson · Projectile motion"
      photoSafe={false}
      viewport={() => (
        <Studio
          look="outdoor"
          camera={{ position: view.position, target: view.target, fov: 36 }}
          bloom={0.25}
          bloomThreshold={0.95}
          ao={false}
          controls={{ maxPolarAngle: Math.PI * 0.47 }}
        >
          <CameraRig position={view.position} target={view.target} />
          <CliffScene
            launch={launch}
            fireKey={fireKey}
            showPath={STILL || (tab === "practice" && checked !== null)}
            predictedX={predictedX}
            predictedLabel={
              predictedX !== null ? `Your answer: ${predictedX.toFixed(0)} m` : undefined
            }
          />
        </Studio>
      )}
      panel={
        <>
          <Section
            eyebrow="Mechanics · Lesson 3 of 8"
            title="Projectile motion: two motions at once"
          />
          <MasteryStrip mastery={mastery} />
          {missing.length > 0 && (
            <div className="callout bad" role="status">
              <strong>Missing: {missing.map((m) => m.label.toLowerCase()).join(", ")}</strong>
              <span>Practice picks these first until they reach "developing".</span>
            </div>
          )}
          <div className="seg" role="tablist" aria-label="Lesson sections">
            {(
              [
                ["learn", "Learn"],
                ["practice", "Practice"],
                ["worksheet", "Worksheet"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                className="btn"
                onClick={() => setTab(k)}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "learn" && (
            <LearnSteps
              launch={demoLaunch}
              onShow={(l) => {
                setDemoLaunch(l);
                setFireKey((k) => k + 1);
              }}
            />
          )}

          {tab === "practice" && (
            <div style={{ display: "grid", gap: 14 }}>
              <div className="callout">
                <div className="eyebrow">
                  {SKILLS.find((s) => s.id === skill)?.label} · generated from the scene
                </div>
                <span style={{ color: "var(--fg)" }}>{question.prompt}</span>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (checked === null && answer.trim()) check();
                  }}
                  style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
                >
                  <label htmlFor="lesson-answer" className="eyebrow" style={{ width: "100%" }}>
                    Your answer ({question.unit})
                  </label>
                  <input
                    id="lesson-answer"
                    inputMode="decimal"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    disabled={checked !== null}
                    className="mono"
                    style={{
                      flex: "1 1 120px",
                      minHeight: 40,
                      padding: "0 12px",
                      borderRadius: 8,
                      border: "1px solid var(--line)",
                      background: "var(--surface)",
                    }}
                  />
                  {checked === null ? (
                    <button type="submit" className="btn primary" disabled={!answer.trim()}>
                      Check and fire
                    </button>
                  ) : (
                    <button type="button" className="btn primary" onClick={next}>
                      Next question
                    </button>
                  )}
                </form>
                {checked === null && (
                  <details>
                    <summary style={{ cursor: "pointer", color: "var(--fg-2)" }}>Hint</summary>
                    <p style={{ color: "var(--fg-2)", marginTop: 6 }}>{question.hint}</p>
                  </details>
                )}
              </div>
              {checked !== null && (
                <div className={`callout ${checked ? "good" : "bad"}`} role="status">
                  <strong>
                    {checked ? "Correct" : "Not quite"}:{" "}
                    {question.answer.toFixed(question.unit === "s" ? 2 : 1)} {question.unit}
                  </strong>
                  {question.steps.map((s) => (
                    <TeX key={s} block>
                      {s}
                    </TeX>
                  ))}
                  {!checked && <span style={{ color: "var(--fg-2)" }}>{question.hint}</span>}
                </div>
              )}
            </div>
          )}

          {tab === "worksheet" && (
            <div style={{ display: "grid", gap: 12 }}>
              <div className="prose">
                <p>
                  Six questions mixing all four skills, each with its own diagram, plus an answer
                  key on the second page. Every worksheet number gives a different set.
                </p>
              </div>
              <ol
                style={{
                  margin: 0,
                  paddingLeft: 20,
                  display: "grid",
                  gap: 8,
                  color: "var(--fg-2)",
                }}
              >
                {worksheetQuestions(wsSeed).map((q) => (
                  <li key={q.prompt}>{q.prompt}</li>
                ))}
              </ol>
              <div className="seg">
                <button
                  type="button"
                  className="btn primary"
                  onClick={async () => {
                    setWsStatus("Preparing…");
                    setWsStatus(await offerWorksheet(wsSeed));
                  }}
                >
                  Download worksheet (PDF)
                </button>
                <button type="button" className="btn" onClick={() => setWsSeed((s) => s + 1)}>
                  New set
                </button>
              </div>
              {wsStatus && (
                <p role="status" style={{ color: "var(--fg-2)" }}>
                  {wsStatus}
                </p>
              )}
            </div>
          )}
        </>
      }
    />
  );
}

function MasteryStrip({ mastery }: { mastery: Mastery }) {
  return (
    <div role="group" style={{ display: "grid", gap: 8 }} aria-label="Mastery by skill">
      {SKILLS.map((s) => {
        const m = mastery[s.id];
        const st = masteryStatus(m.p, m.n);
        return (
          <div
            key={s.id}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) auto",
              gap: "2px 10px",
              alignItems: "center",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: "var(--step--1)" }}>{s.label}</span>
            <span
              style={{
                fontSize: 12,
                color: STATUS_COLOR[st],
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <span
                className="status-dot"
                style={{ background: STATUS_COLOR[st] }}
                aria-hidden="true"
              />
              {STATUS_TEXT[st]}
            </span>
            <div
              style={{
                gridColumn: "1 / -1",
                height: 6,
                borderRadius: 3,
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.round(m.p * 100)}%`,
                  height: "100%",
                  background: STATUS_COLOR[st],
                  borderRadius: 3,
                  transition: "width .4s",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LearnSteps({ launch, onShow }: { launch: Launch; onShow: (l: Launch) => void }) {
  const { vx, vy } = components(launch);
  const T = flightTime(launch);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Section eyebrow="1 · Split the launch velocity">
        <div className="prose">
          <p>
            Any launch velocity can be split into a horizontal part and a vertical part. The two
            parts then behave completely independently.
          </p>
          <TeX
            block
          >{`v_x = v_0\\cos\\theta = ${fmt(vx, 1)}\\ \\text{m/s} \\qquad v_y = v_0\\sin\\theta = ${fmt(vy, 1)}\\ \\text{m/s}`}</TeX>
        </div>
      </Section>
      <Section eyebrow="2 · Sideways: constant speed">
        <div className="prose">
          <p>
            Nothing pushes the ball sideways once it leaves the barrel, so <TeX>{"v_x"}</TeX> never
            changes. Fire the cannon and look at the pale snapshots taken every 0.25 s: they are{" "}
            <strong>evenly spaced</strong> left to right.
          </p>
          <div className="seg">
            <button
              type="button"
              className="btn"
              onClick={() => onShow({ v0: 22, angleDeg: 40, h: 30 })}
            >
              Fire at 40°
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => onShow({ v0: 22, angleDeg: 0, h: 30 })}
            >
              Fire horizontally
            </button>
          </div>
        </div>
      </Section>
      <Section eyebrow="3 · Up and down: free fall">
        <div className="prose">
          <p>
            Vertically the ball is in free fall the whole time, rising, stopping for an instant and
            falling:
          </p>
          <TeX block>{"y = h + v_y t - \\tfrac12 g t^2"}</TeX>
          <p>
            It hits the water when <TeX>{"y = 0"}</TeX>. For the launch in the scene that takes{" "}
            <strong>{fmt(T, 2)} s</strong>.
          </p>
        </div>
      </Section>
      <Section eyebrow="4 · Put them together">
        <div className="prose">
          <p>
            Range is horizontal speed times flight time, <TeX>{"x = v_x t"}</TeX>. Maximum height is
            where <TeX>{"v_y = 0"}</TeX>. Try the Practice tab: every question is generated from a
            new launch, and the cannon fires your answer.
          </p>
        </div>
      </Section>
    </div>
  );
}
