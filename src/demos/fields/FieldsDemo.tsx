import { useMemo, useRef, useState } from "react";
import { fringeSpacing, wavelengthToRGB } from "../../physics/waves";
import { go } from "../../router";
import { STILL } from "../../studio/clock";
import { Studio } from "../../studio/Studio";
import { fmt, Readout, Readouts, Section, Slider, TeX } from "../../ui/controls";
import { DemoShell } from "../../ui/DemoShell";
import { LineChart } from "../../ui/LineChart";
import { BeamScene, BULB_R, beamGeometry } from "./BeamScene";
import { ElectricScene, type ElectricState, probeField } from "./ElectricScene";
import { FILING_COUNT, type MagnetLayout, MagnetScene } from "./MagnetScene";
import { OrbitScene } from "./OrbitScene";
import { bestSlingshot, simulate } from "./orbitSim";
import { DoubleSlitScene, STRING, StandingWaveScene, stringModes } from "./WavesScene";

export const FIELD_SCENES = [
  { id: "electric", label: "Electric field" },
  { id: "magnet", label: "Magnetic field" },
  { id: "beam", label: "Lorentz force" },
  { id: "waves", label: "Waves" },
  { id: "orbits", label: "Orbits" },
] as const;
type SceneId = (typeof FIELD_SCENES)[number]["id"];

export function FieldsDemo({ scene }: { scene: SceneId }) {
  const tabs = (
    <nav className="scene-tabs" aria-label="Scenes">
      {FIELD_SCENES.map((s) => (
        <button
          key={s.id}
          type="button"
          className="chip"
          aria-pressed={s.id === scene}
          onClick={() => go(`fields-${s.id}`)}
        >
          {s.label}
        </button>
      ))}
    </nav>
  );
  switch (scene) {
    case "electric":
      return <Electric tabs={tabs} />;
    case "magnet":
      return <Magnet tabs={tabs} />;
    case "beam":
      return <Beam tabs={tabs} />;
    case "waves":
      return <Waves tabs={tabs} />;
    case "orbits":
      return <Orbits tabs={tabs} />;
  }
}

// ---------------- Electric ----------------

const PRESETS: Record<string, ElectricState> = {
  Dipole: {
    charges: [
      { x: -0.75, z: 0, q: 2 },
      { x: 0.75, z: 0, q: -2 },
    ],
    probe: { x: 0, z: 0.75 },
  },
  "Like charges": {
    charges: [
      { x: -0.75, z: 0, q: 2 },
      { x: 0.75, z: 0, q: 2 },
    ],
    probe: { x: 0, z: 0.6 },
  },
  "Unequal (+3, −1)": {
    charges: [
      { x: -0.7, z: 0, q: 3 },
      { x: 0.7, z: 0, q: -1 },
    ],
    probe: { x: 0.2, z: 0.9 },
  },
  Single: { charges: [{ x: 0, z: 0, q: 2 }], probe: { x: 0.9, z: 0.4 } },
};

function Electric({ tabs }: { tabs: React.ReactNode }) {
  const [state, setState] = useState<ElectricState>(PRESETS.Dipole);
  const [preset, setPreset] = useState("Dipole");
  const E = probeField(state).length();
  const r = Math.min(
    ...state.charges.map((c) => Math.hypot(c.x - state.probe.x, c.z - state.probe.z)),
  );
  return (
    <DemoShell
      title="Electric field lines"
      overlay={tabs}
      viewport={(photo) => (
        <Studio
          camera={{ position: [0.4, 2.1, 4.9], target: [0, 0.72, 0], fov: 36 }}
          bloom={0.7}
          {...photo}
        >
          <ElectricScene state={state} onChange={setState} />
        </Studio>
      )}
      panel={
        <>
          <Section eyebrow="Fields · electrostatics" title="Drag the charged spheres">
            <div className="prose">
              <p>
                Each glowing line follows the direction of the electric field. Lines leave positive
                charges and end on negative ones, and they crowd together where the field is strong.
              </p>
              <p>
                The small gold bead is a <strong>test charge</strong>. Drag it around: the orange
                arrow is the force on it, <TeX>{"\\vec F = q\\vec E"}</TeX>.
              </p>
            </div>
          </Section>
          <div className="seg" role="group" aria-label="Charge layouts">
            {Object.keys(PRESETS).map((k) => (
              <button
                key={k}
                type="button"
                className="btn"
                aria-pressed={preset === k}
                onClick={() => {
                  setPreset(k);
                  setState(structuredClone(PRESETS[k]));
                }}
              >
                {k}
              </button>
            ))}
          </div>
          {state.charges.map((c, i) => (
            <Slider
              key={`q${i}-${preset}`}
              label={`Charge ${i + 1}`}
              value={c.q}
              min={-4}
              max={4}
              step={1}
              format={(v) => (v === 0 ? "0" : `${v > 0 ? "+" : "−"}${Math.abs(v)} q`)}
              onChange={(v) => {
                const next = structuredClone(state);
                next.charges[i].q = v === 0 ? (c.q > 0 ? 1 : -1) : v;
                setState(next);
              }}
            />
          ))}
          <Readouts>
            <Readout label="Field at bead" value={fmt(E, 2)} unit="kq/m²" />
            <Readout label="Nearest charge" value={fmt(r, 2)} unit="m" />
          </Readouts>
          <div className="callout">
            <strong>Try this</strong>
            <span>
              Move the bead twice as far from a single charge. The field drops to a quarter:{" "}
              <TeX>{"E = \\dfrac{kq}{r^2}"}</TeX>.
            </span>
          </div>
        </>
      }
    />
  );
}

// ---------------- Magnet ----------------

function Magnet({ tabs }: { tabs: React.ReactNode }) {
  const [layout, setLayout] = useState<MagnetLayout>("single");
  const [angle, setAngle] = useState(0);
  const [tap, setTap] = useState(0);
  const [sprinkle, setSprinkle] = useState(0);
  return (
    <DemoShell
      title="Iron filings"
      overlay={tabs}
      photoSafe={false}
      viewport={() => (
        <Studio
          camera={{ position: [0.0, 2.35, 1.75], target: [0, 0.72, 0.0], fov: 38 }}
          ao={false}
          bloom={0.3}
          controls={{ maxDistance: 5 }}
        >
          <MagnetScene layout={layout} angleDeg={angle} tapSignal={tap} sprinkleSignal={sprinkle} />
        </Studio>
      )}
      panel={
        <>
          <Section eyebrow="Fields · magnetism" title="Sprinkle filings, then tap the paper">
            <div className="prose">
              <p>
                Each iron filing becomes a tiny magnet and turns to line up with the field. Tapping
                the paper frees them to rotate, so the pattern of the field appears.
              </p>
              <p>
                There are {FILING_COUNT.toLocaleString("en-US")} filings. The graphics card works
                out the field at every one of them each frame.
              </p>
            </div>
          </Section>
          <div className="seg">
            <button type="button" className="btn primary" onClick={() => setTap((t) => t + 1)}>
              Tap the paper
            </button>
            <button type="button" className="btn" onClick={() => setSprinkle((s) => s + 1)}>
              Sprinkle again
            </button>
          </div>
          <div className="seg" role="group" aria-label="Magnet layout">
            {(
              [
                ["single", "One magnet"],
                ["attract", "N facing S"],
                ["repel", "N facing N"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                className="btn"
                aria-pressed={layout === k}
                onClick={() => {
                  setLayout(k);
                  setSprinkle((s) => s + 1);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {layout === "single" && (
            <Slider
              label="Turn the magnet"
              value={angle}
              min={0}
              max={180}
              step={5}
              format={(v) => `${v}°`}
              onChange={setAngle}
            />
          )}
          <div className="callout">
            <strong>Look for</strong>
            <span>
              {layout === "repel"
                ? "Between two north poles the lines push apart and leave a gap with no field: a neutral point."
                : layout === "attract"
                  ? "Between opposite poles the lines run straight across the gap: the field there is strong and nearly uniform."
                  : "Lines bunch up at the poles, where the field is strongest, and loop round from north to south."}
            </span>
          </div>
        </>
      }
    />
  );
}

// ---------------- Beam ----------------

function Beam({ tabs }: { tabs: React.ReactNode }) {
  const [U, setU] = useState(250);
  const [I, setI] = useState(1.5);
  const [vectors, setVectors] = useState(true);
  const b = beamGeometry(U, I);
  return (
    <DemoShell
      title="Fine-beam tube"
      overlay={tabs}
      viewport={(photo) => (
        <Studio
          camera={{ position: [1.7, 2.3, 3.9], target: [0, 1.5, 0], fov: 36 }}
          look="lab"
          backdrop="#141518"
          bloom={1.1}
          bloomThreshold={0.7}
          {...photo}
        >
          <BeamScene U={U} I={I} showVectors={vectors} />
        </Studio>
      )}
      panel={
        <>
          <Section eyebrow="Fields · Lorentz force" title="Bend an electron beam into a circle">
            <div className="prose">
              <p>
                Electrons from the hot filament are accelerated by the voltage <TeX>U</TeX>. The two
                copper coils make a uniform magnetic field, and the force{" "}
                <TeX>{"\\vec F = -e\\,\\vec v \\times \\vec B"}</TeX> is always at right angles to
                the motion, so the beam curves into a circle.
              </p>
              <p>
                The gas in the bulb glows where the electrons pass, which makes the beam visible.
              </p>
            </div>
          </Section>
          <Slider
            label="Accelerating voltage U"
            value={U}
            min={150}
            max={300}
            step={5}
            format={(v) => `${v} V`}
            onChange={setU}
          />
          <Slider
            label="Coil current I"
            value={I}
            min={0.8}
            max={2.6}
            step={0.05}
            format={(v) => `${v.toFixed(2)} A`}
            onChange={setI}
          />
          <Readouts>
            <Readout label="Electron speed" value={fmt(b.v / 1e6, 2)} unit="×10⁶ m/s" />
            <Readout label="Field B" value={fmt(b.B * 1e3, 3)} unit="mT" />
            <Readout label="Beam radius" value={fmt(b.r * 100, 2)} unit="cm" />
          </Readouts>
          {b.hitsGlass ? (
            <div className="callout warn">
              <strong>The beam hits the glass</strong>
              <span>
                The circle is too big for the {BULB_R * 200} cm bulb. Raise the coil current or
                lower the voltage to tighten it.
              </span>
            </div>
          ) : (
            <div className="callout">
              <strong>Why the radius changes</strong>
              <TeX block>{"r = \\frac{m v}{e B}, \\quad v = \\sqrt{\\frac{2 e U}{m}}"}</TeX>
              <span>
                Higher voltage means faster electrons and a bigger circle. More current means a
                stronger field and a smaller one.
              </span>
            </div>
          )}
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              id="beam-vectors"
              type="checkbox"
              checked={vectors}
              onChange={(e) => setVectors(e.target.checked)}
            />
            Show velocity, force and field arrows
          </label>
        </>
      }
    />
  );
}

// ---------------- Waves ----------------

function Waves({ tabs }: { tabs: React.ReactNode }) {
  const [mode, setMode] = useState<"slit" | "string">("slit");
  const [lambda, setLambda] = useState(532);
  const [d, setD] = useState(0.25);
  const [L, setL] = useState(2);
  const [f, setF] = useState(40);
  const spacing = fringeSpacing(lambda * 1e-9, d * 1e-3, L) * 1000;
  const [r, g, bl] = wavelengthToRGB(lambda);
  const swatch = `rgb(${r * 255} ${g * 255} ${bl * 255})`;
  const modes = stringModes(f);
  const n = Math.round(f / STRING.f1);
  const onHarmonic = n >= 1 && Math.abs(f - n * STRING.f1) / (n * STRING.f1) < 0.04;
  return (
    <DemoShell
      title={mode === "slit" ? "Double slit" : "Standing waves"}
      overlay={tabs}
      viewport={(photo) => (
        <Studio
          camera={
            mode === "slit"
              ? { position: [-0.75, 1.9, 3.1], target: [0.25, 1.08, 0], fov: 40 }
              : { position: [0, 1.5, 2.4], target: [0.2, 1.05, 0], fov: 38 }
          }
          look="lab"
          backdrop="#121315"
          bloom={0.9}
          bloomThreshold={0.6}
          {...photo}
        >
          {mode === "slit" ? (
            <DoubleSlitScene p={{ lambdaNm: lambda, dMm: d, aMm: 0.04, L }} />
          ) : (
            <StandingWaveScene fHz={f} />
          )}
        </Studio>
      )}
      panel={
        <>
          <div className="seg" role="group" aria-label="Experiment">
            <button
              type="button"
              className="btn"
              aria-pressed={mode === "slit"}
              onClick={() => setMode("slit")}
            >
              Double slit
            </button>
            <button
              type="button"
              className="btn"
              aria-pressed={mode === "string"}
              onClick={() => setMode("string")}
            >
              Standing waves
            </button>
          </div>
          {mode === "slit" ? (
            <>
              <Section eyebrow="Waves · interference" title="Light through two slits">
                <div className="prose">
                  <p>
                    Light from the two slits overlaps on the screen. Where the waves arrive in step
                    they add up to a bright fringe; where they arrive half a wavelength apart they
                    cancel.
                  </p>
                </div>
              </Section>
              <div className="control">
                <Slider
                  label="Wavelength λ"
                  value={lambda}
                  min={405}
                  max={680}
                  step={1}
                  format={(v) => `${v} nm`}
                  onChange={setLambda}
                />
                <div
                  aria-hidden="true"
                  style={{ height: 6, borderRadius: 3, background: swatch }}
                />
              </div>
              <Slider
                label="Slit separation d"
                value={d}
                min={0.1}
                max={0.5}
                step={0.01}
                format={(v) => `${v.toFixed(2)} mm`}
                onChange={setD}
              />
              <Slider
                label="Distance to screen L"
                value={L}
                min={1}
                max={3}
                step={0.1}
                format={(v) => `${v.toFixed(1)} m`}
                onChange={setL}
              />
              <Readouts>
                <Readout label="Fringe spacing" value={fmt(spacing, 2)} unit="mm" />
                <Readout label="Fringes on card" value={String(Math.floor(60 / spacing))} />
              </Readouts>
              <div className="callout">
                <TeX block>{"\\Delta y = \\frac{\\lambda L}{d}"}</TeX>
                <span>
                  Red light spreads the fringes wider than blue. Moving the slits closer together
                  does the same.
                </span>
              </div>
            </>
          ) : (
            <>
              <Section eyebrow="Waves · resonance" title="Find the harmonics">
                <div className="prose">
                  <p>
                    The driver shakes the end of the string. At most frequencies the reflected waves
                    interfere messily and the string barely moves. At the harmonics they reinforce
                    and a standing wave appears.
                  </p>
                  <p>The motion is shown slowed down, as if lit by a strobe lamp.</p>
                </div>
              </Section>
              <Slider
                label="Driving frequency"
                value={f}
                min={10}
                max={125}
                step={0.5}
                format={(v) => `${v.toFixed(1)} Hz`}
                onChange={setF}
              />
              <div className="seg">
                {[1, 2, 3, 4, 5].map((k) => (
                  <button key={k} type="button" className="btn" onClick={() => setF(k * STRING.f1)}>
                    n = {k}
                  </button>
                ))}
              </div>
              <Readouts>
                <Readout label="Harmonic" value={onHarmonic ? `n = ${n}` : "none"} />
                <Readout
                  label="Wavelength"
                  value={onHarmonic ? fmt((2 * STRING.L) / n, 2) : "—"}
                  unit={onHarmonic ? "m" : undefined}
                />
                <Readout label="Amplitude" value={fmt(Math.max(...modes) * 100, 0)} unit="%" />
              </Readouts>
              <div className="callout">
                <TeX block>{"f_n = \\frac{n v}{2L}"}</TeX>
                <span>
                  This string's fundamental is {STRING.f1} Hz. Each harmonic adds one more loop and
                  one more node, the points that never move.
                </span>
              </div>
            </>
          )}
        </>
      }
    />
  );
}

// ---------------- Orbits ----------------

function Orbits({ tabs }: { tabs: React.ReactNode }) {
  const [boost, setBoost] = useState(1.2);
  const [planetDeg, setPlanetDeg] = useState(() => bestSlingshot(1.2));
  const [playing, setPlaying] = useState(!STILL);
  const timeRef = useRef(STILL ? 3.2 : 0);
  const [t, setT] = useState(0);
  const track = useMemo(() => simulate(planetDeg, boost), [planetDeg, boost]);
  const speed = useMemo(
    () =>
      Array.from(track.t, (tt, i) => [tt, track.speed[i]] as [number, number]).filter(
        (_, i) => i % 4 === 0,
      ),
    [track],
  );
  const restart = () => {
    timeRef.current = 0;
    setPlaying(true);
  };
  const lastUpdate = useRef(0);
  // Compare speeds at the same distance from the star: the last return to the launch radius.
  const v0 = track.speed[0];
  const gain = Math.sqrt(Math.max(0, v0 * v0 + 2 * track.energyGain)) - v0;
  return (
    <DemoShell
      title="Gravitational slingshot"
      overlay={tabs}
      photoSafe={false}
      viewport={() => (
        <Studio
          camera={{ position: [0, 7.4, 5.6], target: [0, 0, -0.2], fov: 42 }}
          look="space"
          bloom={1.2}
          bloomThreshold={0.5}
          ao={false}
          controls={{ maxDistance: 18, maxPolarAngle: Math.PI * 0.48 }}
        >
          <OrbitScene
            track={track}
            playing={playing}
            timeRef={timeRef}
            onTime={(tt) => {
              const now = performance.now();
              if (now - lastUpdate.current > 90) {
                lastUpdate.current = now;
                setT(tt);
              }
            }}
          />
        </Studio>
      )}
      panel={
        <>
          <Section eyebrow="Gravity · orbits" title="Steal speed from a planet">
            <div className="prose">
              <p>
                The probe leaves the inner planet and coasts out towards the giant. If it passes{" "}
                <strong>behind</strong> the moving planet, gravity drags it along and it leaves
                faster than it arrived.
              </p>
              <p>
                Relative to the planet, the probe's speed is the same before and after. Relative to
                the star, it gains speed, which comes from the planet's orbital motion.
              </p>
            </div>
          </Section>
          <div className="seg">
            <button type="button" className="btn primary" onClick={restart}>
              Launch
            </button>
            <button type="button" className="btn" onClick={() => setPlaying((p) => !p)}>
              {playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setPlanetDeg(bestSlingshot(boost));
                restart();
              }}
            >
              Find a slingshot
            </button>
          </div>
          <Slider
            label="Planet's position at launch"
            value={planetDeg}
            min={0}
            max={358}
            step={2}
            format={(v) => `${v}°`}
            onChange={(v) => {
              setPlanetDeg(v);
              restart();
            }}
          />
          <Slider
            label="Launch speed (× circular speed)"
            value={boost}
            min={1.1}
            max={1.32}
            step={0.005}
            format={(v) => `${v.toFixed(3)}×`}
            onChange={(v) => {
              setBoost(v);
              restart();
            }}
          />
          <LineChart
            title="Probe speed relative to the star"
            series={[{ name: "Speed", color: "var(--series-1)", points: speed }]}
            xLabel="Time (scaled units)"
            yLabel="Speed"
            marker={t}
            height={170}
          />
          <Readouts>
            <Readout label="Closest pass" value={fmt(track.closest, 2)} unit="units" />
            <Readout
              label="Speed change"
              value={`${gain >= 0 ? "+" : "−"}${fmt(Math.abs(gain), 1)}`}
              unit="units"
            />
            <Readout
              label="Orbital energy"
              value={`${track.energyGain >= 0 ? "+" : "−"}${fmt(Math.abs(track.energyGain), 0)}`}
              unit="units"
            />
          </Readouts>
          {track.crashed && (
            <div className="callout bad">
              <strong>The probe hit the planet</strong>
              <span>Change the planet's position to pass a little further away.</span>
            </div>
          )}
          <p style={{ color: "var(--fg-3)", fontSize: "var(--step--1)" }}>
            Sizes and the planet's mass are exaggerated so the encounter is visible. The motion is
            computed exactly for those values.
          </p>
        </>
      }
    />
  );
}
