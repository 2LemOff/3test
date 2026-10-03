import { useEffect, useMemo, useRef, useState } from "react";
import {
  components,
  exactAt,
  flightTime,
  type Launch,
  maxHeight,
  range,
} from "../../physics/projectile";
import { CameraRig, Studio } from "../../studio/Studio";
import { fmt, Section, TeX } from "../../ui/controls";
import { DemoShell } from "../../ui/DemoShell";
import { LineChart } from "../../ui/LineChart";
import { type ScreenPt, SketchSurface } from "../../ui/sketch";
import { CliffScene, type Projector } from "../shared/CliffScene";
import { analyseGraph, analysePath, type Finding, type Pt } from "./analysis";

type Step = "path" | "graph" | "run" | "result";

function scenario(seed: number): Launch {
  let s = seed * 9301 + 49297;
  const r = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return {
    v0: Math.round(16 + r() * 12),
    angleDeg: Math.round((20 + r() * 35) / 5) * 5,
    h: Math.round((18 + r() * 24) / 2) * 2,
  };
}

export function framing(l: Launch, aspect: number) {
  const R = range(l);
  const H = maxHeight(l);
  const fov = 34;
  const tanH = Math.tan(((fov / 2) * Math.PI) / 180);
  const cx = R / 2 - 4;
  const cy = Math.max(H * 0.5, 8);
  const dist = Math.max((R / 2 + 22) / (tanH * Math.max(0.6, aspect)), (H / 2 + 14) / tanH);
  return {
    position: [cx, Math.max(cy, l.h * 0.85) + dist * 0.07, dist] as [number, number, number],
    target: [cx, cy, 0] as [number, number, number],
    fov,
  };
}

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setSize({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

const GRAPH = { w: 320, h: 220, l: 42, r: 10, t: 12, b: 30 };

export function Predict() {
  const [seed, setSeed] = useState(3);
  const launch = useMemo(() => scenario(seed), [seed]);
  const [step, setStep] = useState<Step>("path");
  const [pathPts, setPathPts] = useState<ScreenPt[]>([]);
  const [graphPts, setGraphPts] = useState<ScreenPt[]>([]);
  const [fireKey, setFireKey] = useState(0);
  const [ballX, setBallX] = useState<number | null>(null);
  const [reflection, setReflection] = useState("");
  const projector = useRef<Projector | null>(null);
  const [, force] = useState(0);
  const [wrap, size] = useSize<HTMLDivElement>();

  const T = flightTime(launch);
  const R = range(launch);
  const { vx, vy } = components(launch);
  const vEnd = vy - 9.81 * T;
  const tMax = Math.ceil(T * 1.25);
  const vMax = Math.ceil((Math.max(Math.abs(vy), Math.abs(vEnd)) * 1.25) / 10) * 10;
  const view = framing(launch, size.w / Math.max(1, size.h));

  // Graph pad coordinate helpers.
  const gx = (t: number) => GRAPH.l + (t / tMax) * (GRAPH.w - GRAPH.l - GRAPH.r);
  const gy = (v: number) => GRAPH.t + ((vMax - v) / (2 * vMax)) * (GRAPH.h - GRAPH.t - GRAPH.b);
  const graphData: Pt[] = graphPts.map(([x, y]) => [
    ((x - GRAPH.l) / (GRAPH.w - GRAPH.l - GRAPH.r)) * tMax,
    vMax - ((y - GRAPH.t) / (GRAPH.h - GRAPH.t - GRAPH.b)) * 2 * vMax,
  ]);

  // Path sketch in metres.
  const pathWorld: Pt[] = useMemo(() => {
    const p = projector.current;
    if (!p) return [];
    return pathPts
      .map(([x, y]) => p.toWorld((x / size.w) * p.width, (y / size.h) * p.height))
      .filter((v): v is Pt => !!v);
  }, [pathPts, size.w, size.h]);

  const pathResult = useMemo(
    () => (step === "result" ? analysePath(launch, pathWorld) : null),
    [step, launch, pathWorld],
  );
  const graphResult = useMemo(
    () => (step === "result" ? analyseGraph(launch, graphData) : null),
    [step, launch, graphData],
  );

  // Ghost ball on the student's path, at the same horizontal position as the real ball.
  const ghost = useMemo(() => {
    if (ballX === null || pathWorld.length < 2 || !projector.current) return null;
    for (let i = 1; i < pathWorld.length; i++) {
      const [x0, y0] = pathWorld[i - 1];
      const [x1, y1] = pathWorld[i];
      if ((x0 - ballX) * (x1 - ballX) <= 0 && x1 !== x0) {
        const f = (ballX - x0) / (x1 - x0);
        const [sx, sy] = projector.current.toScreen(ballX, y0 + f * (y1 - y0));
        return [(sx / projector.current.width) * size.w, (sy / projector.current.height) * size.h];
      }
    }
    return null;
  }, [ballX, pathWorld, size.w, size.h]);

  const muzzle = projector.current ? projector.current.toScreen(0, launch.h) : null;
  const muzzlePx =
    muzzle && projector.current
      ? [
          (muzzle[0] / projector.current.width) * size.w,
          (muzzle[1] / projector.current.height) * size.h,
        ]
      : null;

  const reset = (nextSeed?: number) => {
    if (nextSeed !== undefined) setSeed(nextSeed);
    setPathPts([]);
    setGraphPts([]);
    setBallX(null);
    setReflection("");
    setStep("path");
  };

  const actualVy: [number, number][] = Array.from({ length: 41 }, (_, i) => {
    const t = (i / 40) * T;
    return [t, exactAt(launch, t).vy];
  });

  return (
    <DemoShell
      title="Predict, then watch"
      photoSafe={false}
      viewport={() => (
        <div ref={wrap} style={{ position: "absolute", inset: 0 }}>
          <Studio
            look="outdoor"
            camera={{ position: view.position, target: view.target, fov: view.fov }}
            controls={{ enabled: false }}
            bloom={0.25}
            bloomThreshold={0.95}
            ao={false}
          >
            <CameraRig position={view.position} target={view.target} />
            <CliffScene
              launch={launch}
              fireKey={fireKey}
              showPath={step === "result"}
              onProjector={(p) => {
                projector.current = p;
                force((n) => n + 1);
              }}
              onTime={(_, s) => setBallX(s.x)}
              onLand={() => setStep("result")}
            />
          </Studio>
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              pointerEvents: step === "path" ? "auto" : "none",
            }}
          >
            <SketchSurface
              width={size.w}
              height={size.h}
              points={pathPts}
              onChange={setPathPts}
              active={step === "path"}
              ariaLabel="Sketch the cannonball's path"
            >
              {muzzlePx && step === "path" && pathPts.length === 0 && (
                <g>
                  <circle
                    cx={muzzlePx[0]}
                    cy={muzzlePx[1]}
                    r={9}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    <animate
                      attributeName="r"
                      values="7;13;7"
                      dur="1.6s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <text
                    x={muzzlePx[0] + 16}
                    y={muzzlePx[1] - 12}
                    fill="#ffffff"
                    fontSize="14"
                    fontWeight="600"
                    style={{ paintOrder: "stroke", stroke: "rgb(0 0 0 / 0.55)", strokeWidth: 3 }}
                  >
                    Start here and draw the path
                  </text>
                </g>
              )}
              {ghost && step !== "path" && (
                <circle
                  cx={ghost[0]}
                  cy={ghost[1]}
                  r={8}
                  fill="#ff7a2f"
                  stroke="#fff"
                  strokeWidth={2}
                  opacity={0.95}
                />
              )}
            </SketchSurface>
          </div>
        </div>
      )}
      panel={
        <>
          <Section
            eyebrow="Projectile motion · predict, then watch"
            title="Where will the cannonball go?"
          >
            <div className="prose">
              <p>
                The cannon fires at <strong>{launch.v0} m/s</strong>,{" "}
                <strong>{launch.angleDeg}°</strong> above the horizontal, from{" "}
                <strong>{launch.h} m</strong> above the sea. Ignore air resistance.
              </p>
              <p>
                Commit to a prediction first. Being wrong and seeing why is how the idea sticks.
              </p>
            </div>
          </Section>
          <ol className="steps" aria-label="Steps">
            {(["path", "graph", "run", "result"] as Step[]).map((s, i) => (
              <li
                key={s}
                aria-current={step === s ? "step" : undefined}
                data-done={["path", "graph", "run", "result"].indexOf(step) > i}
              >
                {["Sketch the path", "Sketch the vertical velocity", "Watch", "Compare"][i]}
              </li>
            ))}
          </ol>
          {step === "path" && (
            <div className="callout">
              <strong>1. Draw the path on the picture</strong>
              <span>
                Start at the cannon's mouth and finish where you think the ball hits the water.
              </span>
              <div className="seg">
                <button
                  type="button"
                  className="btn primary"
                  disabled={pathPts.length < 5}
                  onClick={() => setStep("graph")}
                >
                  Next: the graph
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={!pathPts.length}
                  onClick={() => setPathPts([])}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
          {step === "graph" && (
            <div className="callout">
              <strong>2. Sketch the vertical velocity against time</strong>
              <span>Up is positive. Draw from launch until the ball hits the water.</span>
              <div
                style={{
                  background: "var(--surface)",
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                }}
              >
                <SketchSurface
                  width={GRAPH.w}
                  height={GRAPH.h}
                  points={graphPts}
                  onChange={setGraphPts}
                  active
                  ariaLabel="Sketch vertical velocity against time"
                  color="var(--series-2)"
                >
                  <GraphAxes tMax={tMax} vMax={vMax} gx={gx} gy={gy} />
                </SketchSurface>
              </div>
              <div className="seg">
                <button
                  type="button"
                  className="btn primary"
                  disabled={graphPts.length < 5}
                  onClick={() => {
                    setStep("run");
                    setFireKey((k) => k + 1);
                  }}
                >
                  Fire the cannon
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={!graphPts.length}
                  onClick={() => setGraphPts([])}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
          {step === "run" && (
            <div className="callout" role="status">
              <strong>Watch the real ball against your path</strong>
              <span>
                Your prediction is the orange dot. The pale dots are snapshots every 0.25 s.
              </span>
            </div>
          )}
          {step === "result" && pathResult && graphResult && (
            <>
              <div className="readouts">
                <div className="readout">
                  <div className="eyebrow">Path match</div>
                  <div className="v">
                    {pathResult.score}
                    <span className="u">/100</span>
                  </div>
                </div>
                <div className="readout">
                  <div className="eyebrow">Graph match</div>
                  <div className="v">
                    {graphResult.score}
                    <span className="u">/100</span>
                  </div>
                </div>
                <div className="readout">
                  <div className="eyebrow">Landed at</div>
                  <div className="v">
                    {fmt(R, 1)}
                    <span className="u">m</span>
                  </div>
                </div>
              </div>
              <Findings items={pathResult.findings} />
              <LineChart
                title="Vertical velocity"
                series={[
                  { name: "Actual", color: "var(--series-1)", points: actualVy },
                  {
                    name: "Your sketch",
                    color: "var(--series-2)",
                    points: graphData.filter((p) => p[0] >= 0).sort((a, b) => a[0] - b[0]),
                    dashed: true,
                  },
                ]}
                xLabel="Time (s)"
                yLabel="vᵧ (m/s)"
                xDomain={[0, tMax]}
                yDomain={[-vMax, vMax]}
              />
              <Findings items={graphResult.findings} />
              <div className="callout">
                <strong>Why it moves like this</strong>
                <span>
                  Horizontally nothing pushes or pulls, so{" "}
                  <TeX>{`v_x = ${vx.toFixed(1)}\\text{ m/s}`}</TeX> the whole time: the snapshots
                  are evenly spaced sideways. Vertically, gravity changes the velocity by 9.8 m/s
                  every second.
                </span>
                <TeX
                  block
                >{`v_y = ${vy.toFixed(1)} - 9.8\\,t \\qquad y = ${launch.h} + ${vy.toFixed(1)}\\,t - 4.9\\,t^2`}</TeX>
              </div>
              <div className="control">
                <label htmlFor="reflect">What surprised you?</label>
                <textarea
                  id="reflect"
                  rows={3}
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="Explaining it in your own words helps it stick."
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid var(--line)",
                    background: "var(--surface-2)",
                    color: "var(--fg)",
                    font: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>
              <div className="seg">
                <button type="button" className="btn primary" onClick={() => reset(seed + 1)}>
                  Try another launch
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setStep("run");
                    setFireKey((k) => k + 1);
                  }}
                >
                  Watch again
                </button>
              </div>
            </>
          )}
          <p style={{ color: "var(--fg-3)", fontSize: "var(--step--1)" }}>
            The sketch is compared in metres against the exact path, and both are drawn to scale.
          </p>
        </>
      }
    />
  );
}

function GraphAxes({
  tMax,
  vMax,
  gx,
  gy,
}: {
  tMax: number;
  vMax: number;
  gx: (t: number) => number;
  gy: (v: number) => number;
}) {
  const tTicks = Array.from({ length: tMax + 1 }, (_, i) => i).filter(
    (t) => tMax <= 8 || t % 2 === 0,
  );
  const vStep = vMax > 30 ? 20 : 10;
  const vTicks: number[] = [];
  for (let v = -vMax; v <= vMax; v += vStep) vTicks.push(v);
  return (
    <g fontFamily="var(--font-mono)" fontSize="10" fill="var(--fg-3)">
      {vTicks.map((v) => (
        <g key={v}>
          <line
            x1={gx(0)}
            x2={gx(tMax)}
            y1={gy(v)}
            y2={gy(v)}
            stroke="var(--line)"
            strokeWidth={v === 0 ? 1.4 : 0.6}
          />
          <text x={gx(0) - 6} y={gy(v)} dy="0.32em" textAnchor="end">
            {v}
          </text>
        </g>
      ))}
      {tTicks.map((t) => (
        <text key={t} x={gx(t)} y={gy(-vMax) + 14} textAnchor="middle">
          {t}
        </text>
      ))}
      <text
        x={(gx(0) + gx(tMax)) / 2}
        y={GRAPH.h - 2}
        textAnchor="middle"
        fill="var(--fg-2)"
        fontFamily="var(--font-body)"
        fontSize="10.5"
      >
        Time (s)
      </text>
      <text
        x={10}
        y={gy(0)}
        transform={`rotate(-90 10 ${gy(0)})`}
        textAnchor="middle"
        fill="var(--fg-2)"
        fontFamily="var(--font-body)"
        fontSize="10.5"
      >
        vᵧ (m/s)
      </text>
    </g>
  );
}

export function Findings({ items }: { items: Finding[] }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {items.map((f) => (
        <div key={f.id} className={`callout ${f.kind}`}>
          <strong>
            <span
              className="status-dot"
              style={{ background: `var(--${f.kind})` }}
              aria-hidden="true"
            />
            {f.kind === "good" ? "Right: " : f.kind === "bad" ? "Common mistake: " : "Check: "}
            {f.title}
          </strong>
          <span style={{ color: "var(--fg-2)" }}>{f.detail}</span>
        </div>
      ))}
    </div>
  );
}
