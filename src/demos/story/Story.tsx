// Story mode: one guided sequence through every demonstration, told as a single thread:
// predict a cannonball, understand it, remember it, then follow forces through fields,
// magnets, electron beams and light, and back to the cannonball as an orbit.

import { type ReactNode, useEffect, useRef, useState } from "react";
import { components } from "../../physics/projectile";
import { go } from "../../router";
import { STILL, useSimFrame } from "../../studio/clock";
import { CameraRig, Studio } from "../../studio/Studio";
import { TeX } from "../../ui/controls";
import { BeamScene } from "../fields/BeamScene";
import { ElectricScene } from "../fields/ElectricScene";
import { MagnetScene } from "../fields/MagnetScene";
import { OrbitScene } from "../fields/OrbitScene";
import { bestSlingshot, simulate } from "../fields/orbitSim";
import { DoubleSlitScene } from "../fields/WavesScene";
import { DeckScene } from "../flashcards/DeckScene";
import { CliffScene } from "../shared/CliffScene";

const LAUNCH = { v0: 24, angleDeg: 38, h: 30 };
const VX = components(LAUNCH).vx;

interface Chapter {
  id: string;
  eyebrow: string;
  title: string;
  body: ReactNode;
  /** Seconds before autoplay moves on. */
  dur: number;
  tryIt?: { label: string; route: string };
}

const CHAPTERS: Chapter[] = [
  {
    id: "prologue",
    eyebrow: "Prologue",
    title: "Why does anything move the way it does?",
    dur: 9,
    body: (
      <p>
        Every demonstration in this lab answers one question:{" "}
        <strong>how do forces change motion?</strong> Follow a cannonball, an electron, a beam of
        light and a space probe, and the same few ideas keep coming back.
      </p>
    ),
  },
  {
    id: "predict",
    eyebrow: "Chapter 1 · Predict",
    title: "Where will the cannonball land?",
    dur: 14,
    tryIt: { label: "Sketch your own prediction", route: "predict" },
    body: (
      <>
        <p>
          Before anything else, make a guess. The cannon fires at <strong>24 m/s</strong>, 38° above
          the horizontal, from a <strong>30 m</strong> cliff. Picture the path.
        </p>
        <p>
          Many people imagine the ball flying straight out and then dropping. Committing to a guess,
          then seeing it tested, is one of the strongest ways to learn. Fire when you're ready.
        </p>
      </>
    ),
  },
  {
    id: "understand",
    eyebrow: "Chapter 2 · Understand",
    title: "Two motions at once",
    dur: 15,
    tryIt: { label: "Open the lesson", route: "lesson" },
    body: (
      <>
        <p>
          The pale snapshots are a quarter of a second apart. Sideways they are evenly spaced:
          nothing pushes the ball sideways, so <TeX>{`v_x = ${VX.toFixed(1)}\\ \\text{m/s}`}</TeX>{" "}
          the whole way.
        </p>
        <p>
          Vertically, gravity adds 9.8 m/s of downward speed every second. Together the two motions
          make a parabola:
        </p>
        <TeX block>{"x = v_x t \\qquad y = h + v_y t - \\tfrac12 g t^2"}</TeX>
      </>
    ),
  },
  {
    id: "remember",
    eyebrow: "Chapter 3 · Remember",
    title: "Recall it tomorrow, and next month",
    dur: 12,
    tryIt: { label: "Review the flashcards", route: "flashcards" },
    body: (
      <p>
        Understanding fades quickly unless you pull it back out of memory. A flashcard asks you to
        answer before you look. Then the scheduler brings each card back just before you'd forget
        it: first after minutes, then days, then months.
      </p>
    ),
  },
  {
    id: "electric",
    eyebrow: "Chapter 4 · Fields",
    title: "Forces without touching",
    dur: 12,
    tryIt: { label: "Drag the charges", route: "fields-electric" },
    body: (
      <>
        <p>
          Gravity pulled the cannonball without touching it. Electric charges do the same. Each
          glowing line shows the direction a small positive charge would be pushed.
        </p>
        <p>
          Lines leave positive charges and end on negative ones. They crowd together where the force
          is strongest, and the force weakens with the square of the distance,{" "}
          <TeX>{"E \\propto 1/r^2"}</TeX>.
        </p>
      </>
    ),
  },
  {
    id: "magnet",
    eyebrow: "Chapter 5 · Magnetism",
    title: "A field you can see",
    dur: 12,
    tryIt: { label: "Sprinkle your own filings", route: "fields-magnet" },
    body: (
      <p>
        Each iron filing becomes a tiny compass needle. Tap the paper and they swing into line,
        tracing the magnetic field from the north pole round to the south.
      </p>
    ),
  },
  {
    id: "beam",
    eyebrow: "Chapter 6 · Lorentz force",
    title: "When a field steers a moving charge",
    dur: 13,
    tryIt: { label: "Bend the beam yourself", route: "fields-beam" },
    body: (
      <>
        <p>
          A magnetic field pushes a moving electron sideways, always at right angles to its motion.
          A sideways force changes direction but not speed, so the beam curls into a circle.
        </p>
        <TeX block>{"r = \\frac{m v}{e B}"}</TeX>
        <p>Watch the coil current rise: a stronger field makes a tighter circle.</p>
      </>
    ),
  },
  {
    id: "light",
    eyebrow: "Chapter 7 · Waves",
    title: "Light behaves like a wave",
    dur: 13,
    tryIt: { label: "Try other wavelengths", route: "fields-waves" },
    body: (
      <>
        <p>
          Shine one laser through two narrow slits. Where waves from the two slits arrive in step
          they add into a bright fringe; where they arrive half a wavelength apart they cancel.
        </p>
        <TeX block>{"\\Delta y = \\frac{\\lambda L}{d}"}</TeX>
        <p>
          As the colour shifts from red to blue, the shorter wavelength packs the fringes closer
          together.
        </p>
      </>
    ),
  },
  {
    id: "orbit",
    eyebrow: "Chapter 8 · Gravity",
    title: "Back to the cannonball, in orbit",
    dur: 15,
    tryIt: { label: "Plan a slingshot", route: "fields-orbits" },
    body: (
      <>
        <p>
          Fire the cannonball faster and it lands further away. Fast enough, and the ground curves
          away beneath it as quickly as it falls. That's an orbit: the same two motions as Chapter
          2.
        </p>
        <p>
          Here a probe passes just behind a moving planet and leaves faster than it arrived,
          borrowing speed from the planet's orbit. That is a gravitational slingshot.
        </p>
      </>
    ),
  },
  {
    id: "epilogue",
    eyebrow: "Epilogue",
    title: "Your turn",
    dur: 999,
    body: (
      <p>
        Predict, understand, remember, explore. Every scene runs on the same tested physics, so
        change the numbers and see what happens.
      </p>
    ),
  },
];

const ORBIT = (() => {
  let cache: ReturnType<typeof simulate> | null = null;
  return () => {
    cache ??= simulate(bestSlingshot(1.2), 1.2);
    return cache;
  };
})();

/** Reports shot-local time to React, so scenes can be animated from it. */
function Ticker({ onTime }: { onTime: (t: number) => void }) {
  const t = useRef(0);
  useSimFrame((dt) => {
    t.current += dt;
    onTime(t.current);
  });
  return null;
}

export function Story() {
  const startAt = Math.max(
    0,
    CHAPTERS.findIndex((c) => c.id === new URLSearchParams(window.location.search).get("chapter")),
  );
  const [index, setIndex] = useState(startAt);
  const [local, setLocal] = useState(STILL ? 8 : 0);
  const [playing, setPlaying] = useState(!STILL);
  const [fired, setFired] = useState(false);
  const chapter = CHAPTERS[index];

  const goTo = (i: number) => {
    setIndex(Math.max(0, Math.min(CHAPTERS.length - 1, i)));
    setLocal(0);
    setFired(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight") goTo(index + 1);
      if (e.key === "ArrowLeft") goTo(index - 1);
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onTime = (t: number) => {
    setLocal(t);
    if (playing && t >= chapter.dur && index < CHAPTERS.length - 1) goTo(index + 1);
  };

  return (
    <div className="story">
      <div className="story-stage">
        <StoryScene
          key={chapter.id}
          id={chapter.id}
          local={local}
          fired={fired || (playing && local > 6)}
          onTime={onTime}
        />
      </div>
      <div className="story-top">
        <button type="button" className="chip" onClick={() => go("home")}>
          ← Gallery
        </button>
        <ol className="story-progress" aria-label="Chapters">
          {CHAPTERS.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                aria-label={`${c.eyebrow}: ${c.title}`}
                aria-current={i === index ? "step" : undefined}
                onClick={() => goTo(i)}
              >
                <span
                  className="story-fill"
                  style={{
                    width:
                      i < index
                        ? "100%"
                        : i === index
                          ? `${Math.min(100, (local / chapter.dur) * 100)}%`
                          : "0%",
                  }}
                />
              </button>
            </li>
          ))}
        </ol>
      </div>
      <article className="story-card" aria-live="polite">
        <div className="eyebrow">{chapter.eyebrow}</div>
        <h1>{chapter.title}</h1>
        <div className="prose">{chapter.body}</div>
        {chapter.id === "predict" && (
          <button
            type="button"
            className="btn primary"
            disabled={fired}
            onClick={() => setFired(true)}
          >
            {fired ? "Fired" : "Fire the cannon"}
          </button>
        )}
        {chapter.id === "epilogue" && (
          <div className="seg">
            {[
              ["Predict, then watch", "predict"],
              ["Lesson", "lesson"],
              ["Flashcards", "flashcards"],
              ["3D fields", "fields-electric"],
              ["Gallery", "home"],
            ].map(([label, route]) => (
              <button key={route} type="button" className="btn" onClick={() => go(route)}>
                {label}
              </button>
            ))}
          </div>
        )}
        <div className="story-nav">
          <button
            type="button"
            className="btn"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
          >
            Back
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setPlaying((p) => !p)}
            aria-pressed={playing}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => goTo(index + 1)}
            disabled={index === CHAPTERS.length - 1}
          >
            Next
          </button>
          {chapter.tryIt && (
            <button
              type="button"
              className="story-try"
              onClick={() => go(chapter.tryIt?.route ?? "home")}
            >
              {chapter.tryIt.label} →
            </button>
          )}
        </div>
        <p className="story-count mono">
          {index + 1} / {CHAPTERS.length}
        </p>
      </article>
    </div>
  );
}

const ease = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));

function StoryScene({
  id,
  local,
  fired,
  onTime,
}: {
  id: string;
  local: number;
  fired: boolean;
  onTime: (t: number) => void;
}) {
  const orbitTime = useRef(STILL ? 3.2 : 0);
  const outdoor = { look: "outdoor" as const, bloom: 0.25, bloomThreshold: 0.95, ao: false };
  switch (id) {
    case "prologue":
    case "predict":
    case "understand": {
      const view =
        id === "prologue"
          ? {
              position: [84, 24, 140] as [number, number, number],
              target: [30, 10, 0] as [number, number, number],
            }
          : {
              position: [64, 31, 122] as [number, number, number],
              target: [36, 17, 0] as [number, number, number],
            };
      return (
        <Studio
          {...outdoor}
          camera={{ position: view.position, target: view.target, fov: 34 }}
          controls={{ enabled: id !== "prologue" }}
        >
          <CameraRig position={view.position} target={view.target} />
          <Ticker onTime={onTime} />
          <CliffScene
            launch={LAUNCH}
            fireKey={id === "understand" ? 1 : fired ? 1 : 0}
            showPath={id === "understand" && local > 7}
            markers={id !== "prologue"}
          />
        </Studio>
      );
    }
    case "remember":
      return (
        <Studio
          camera={{ position: [0.25, 2.95, 2.35], target: [0.2, 0.72, 0.12], fov: 34 }}
          bloom={0.15}
          bloomThreshold={1.4}
        >
          <Ticker onTime={onTime} />
          <DeckScene
            front="Why does a cannonball follow a parabola?"
            back="Constant sideways speed plus steadily increasing downward speed."
            tag="Why · Projectiles"
            revealed={local > 5}
            remaining={9}
          />
        </Studio>
      );
    case "electric": {
      const a = local * 0.6;
      return (
        <Studio camera={{ position: [0.4, 2.1, 4.9], target: [0, 0.72, 0], fov: 36 }} bloom={0.7}>
          <Ticker onTime={onTime} />
          <ElectricScene
            state={{
              charges: [
                { x: -0.75, z: 0, q: 2 },
                { x: 0.75, z: 0, q: -2 },
              ],
              probe: { x: Math.cos(a) * 0.45, z: 0.55 + Math.sin(a) * 0.25 },
            }}
            onChange={() => {}}
          />
        </Studio>
      );
    }
    case "magnet":
      return (
        <Studio
          camera={{ position: [0, 2.35, 1.75], target: [0, 0.72, 0], fov: 38 }}
          ao={false}
          bloom={0.3}
        >
          <Ticker onTime={onTime} />
          <MagnetScene
            layout="single"
            angleDeg={0}
            tapSignal={local > 4 ? 1 : 0}
            sprinkleSignal={0}
          />
        </Studio>
      );
    case "beam":
      return (
        <Studio
          camera={{ position: [1.7, 2.3, 3.9], target: [0, 1.5, 0], fov: 36 }}
          look="lab"
          backdrop="#141518"
          bloom={1.1}
          bloomThreshold={0.7}
        >
          <Ticker onTime={onTime} />
          <BeamScene U={250} I={1.3 + ease((local - 5) / 5) * 1.0} showVectors />
        </Studio>
      );
    case "light":
      return (
        <Studio
          camera={{ position: [-0.75, 1.9, 3.1], target: [0.25, 1.08, 0], fov: 40 }}
          look="lab"
          backdrop="#121315"
          bloom={0.9}
          bloomThreshold={0.6}
        >
          <Ticker onTime={onTime} />
          <DoubleSlitScene
            p={{ lambdaNm: 650 - ease((local - 5) / 5) * 210, dMm: 0.25, aMm: 0.04, L: 2 }}
          />
        </Studio>
      );
    default:
      return (
        <Studio
          camera={{ position: [0, 7.4, 5.6], target: [0, 0, -0.2], fov: 42 }}
          look="space"
          bloom={1.2}
          bloomThreshold={0.5}
          ao={false}
          controls={{ maxDistance: 18 }}
        >
          <Ticker onTime={onTime} />
          <OrbitScene track={ORBIT()} playing timeRef={orbitTime} onTime={() => {}} />
        </Studio>
      );
  }
}
