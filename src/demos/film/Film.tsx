// "Physics you can see": a captioned film composed from the showcase's own scenes.
// Open #film to watch it live; scripts/record.mjs renders it frame by frame to MP4.

import { useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useSimFrame } from "../../studio/clock";
import { Studio } from "../../studio/Studio";
import { BeamScene } from "../fields/BeamScene";
import { ElectricScene, type ElectricState } from "../fields/ElectricScene";
import { MagnetScene } from "../fields/MagnetScene";
import { OrbitScene } from "../fields/OrbitScene";
import { bestSlingshot, simulate } from "../fields/orbitSim";
import { DoubleSlitScene } from "../fields/WavesScene";
import { CliffScene } from "../shared/CliffScene";

type V3 = [number, number, number];
interface Shot {
  id: string;
  dur: number;
  captions: [number, string][];
}

export const SHOTS: Shot[] = [
  {
    id: "cliff",
    dur: 14,
    captions: [
      [0, "A cannonball leaves a 30 m cliff at 24 m/s."],
      [
        4.5,
        "Snapshots every quarter second are evenly spaced sideways: nothing pushes the ball sideways.",
      ],
      [
        9.5,
        "Vertically it is in free fall the whole time. Together, the two motions make a parabola.",
      ],
    ],
  },
  {
    id: "electric",
    dur: 10,
    captions: [
      [0, "Electric field lines leave positive charges and end on negative ones."],
      [5, "The arrow is the force on a small test charge. It follows the field."],
    ],
  },
  {
    id: "magnet",
    dur: 10,
    captions: [
      [0, "Fifty thousand iron filings, sprinkled around a bar magnet."],
      [4, "Tap the paper and each filing turns along the magnetic field."],
    ],
  },
  {
    id: "beam",
    dur: 10,
    captions: [
      [
        0,
        "Electrons curve in a magnetic field. The force is always at right angles to their motion.",
      ],
      [5, "More coil current makes a stronger field and a tighter circle."],
    ],
  },
  {
    id: "slit",
    dur: 9,
    captions: [
      [0, "One laser, two slits: bright where the waves arrive in step, dark where they cancel."],
      [4.5, "Shorter wavelengths pack the fringes closer together."],
    ],
  },
  {
    id: "orbits",
    dur: 14,
    captions: [
      [0, "A probe coasts out towards a giant planet and passes just behind it."],
      [7, "It leaves faster than it arrived: a gravitational slingshot."],
      [11.5, "Every scene here runs on exact, tested physics."],
    ],
  },
];
export const FILM_LENGTH = SHOTS.reduce((a, s) => a + s.dur, 0);

const ease = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));

/** Moves the camera along a straight dolly between two framings over the shot. */
function CameraPath({
  from,
  to,
  target,
  targetTo,
  dur,
  onTime,
}: {
  from: V3;
  to: V3;
  target: V3;
  targetTo?: V3;
  dur: number;
  onTime: (t: number) => void;
}) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3 } | null;
  const t = useRef(0);
  const a = useMemo(() => new THREE.Vector3(), []);
  useSimFrame((dt) => {
    t.current += dt;
    const k = ease(t.current / dur);
    camera.position.set(...from).lerp(new THREE.Vector3(...to), k);
    a.set(...target).lerp(new THREE.Vector3(...(targetTo ?? target)), k);
    camera.lookAt(a);
    if (controls) controls.target.copy(a);
    onTime(t.current);
  }, -1);
  return null;
}

export function Film() {
  const [shotIndex, setShotIndex] = useState(0);
  const [local, setLocal] = useState(0);
  const shot = SHOTS[shotIndex];
  const onTime = (t: number) => {
    setLocal(t);
    if (t >= shot.dur && shotIndex < SHOTS.length - 1) {
      setShotIndex(shotIndex + 1);
      setLocal(0);
    }
    (window as unknown as { __filmDone?: boolean }).__filmDone =
      shotIndex === SHOTS.length - 1 && t >= shot.dur;
  };
  const caption = [...shot.captions].reverse().find(([at]) => local >= at)?.[1] ?? "";
  const captionFade = Math.min(
    1,
    ...shot.captions.map(([at]) => (local >= at ? (local - at) / 0.4 : 1)),
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000" }}>
      <ShotView key={shot.id} id={shot.id} dur={shot.dur} local={local} onTime={onTime} />
      <div className="film-caption" style={{ opacity: captionFade }} aria-live="polite">
        {caption}
      </div>
      <div className="film-mark">Physics Lab</div>
    </div>
  );
}

const ORBIT_TRACK = (() => {
  let cache: ReturnType<typeof simulate> | null = null;
  return () => {
    cache ??= simulate(bestSlingshot(1.2), 1.2);
    return cache;
  };
})();

function ShotView({
  id,
  dur,
  local,
  onTime,
}: {
  id: string;
  dur: number;
  local: number;
  onTime: (t: number) => void;
}) {
  const orbitTime = useRef(0);
  switch (id) {
    case "cliff":
      return (
        <Studio
          look="outdoor"
          camera={{ position: [70, 30, 118], target: [32, 14, 0], fov: 34 }}
          bloom={0.25}
          bloomThreshold={0.95}
          ao={false}
          controls={{ enabled: false }}
        >
          <CameraPath
            from={[70, 30, 118]}
            to={[52, 24, 96]}
            target={[32, 14, 0]}
            targetTo={[34, 12, 0]}
            dur={dur}
            onTime={onTime}
          />
          <CliffScene
            launch={{ v0: 24, angleDeg: 38, h: 30 }}
            fireKey={local >= 1 ? 1 : 0}
            showPath={local > 9.5}
          />
        </Studio>
      );
    case "electric": {
      const a = local * 0.6;
      const state: ElectricState = {
        charges: [
          { x: -0.75, z: 0, q: 2 },
          { x: 0.75, z: 0, q: -2 },
        ],
        probe: { x: Math.cos(a) * 0.45, z: 0.55 + Math.sin(a) * 0.25 },
      };
      return (
        <Studio
          camera={{ position: [-1.4, 2.2, 4.4], target: [0, 0.8, 0], fov: 36 }}
          bloom={0.7}
          controls={{ enabled: false }}
        >
          <CameraPath
            from={[-1.6, 2.1, 4.5]}
            to={[1.6, 1.9, 4.3]}
            target={[0, 0.85, 0]}
            dur={dur}
            onTime={onTime}
          />
          <ElectricScene state={state} onChange={() => {}} />
        </Studio>
      );
    }
    case "magnet":
      return (
        <Studio
          camera={{ position: [0, 2.6, 2.1], target: [0, 0.72, 0], fov: 38 }}
          ao={false}
          bloom={0.3}
          controls={{ enabled: false }}
        >
          <CameraPath
            from={[0.4, 2.7, 2.2]}
            to={[0.1, 1.9, 1.25]}
            target={[0, 0.72, 0]}
            dur={dur}
            onTime={onTime}
          />
          <MagnetScene
            layout="single"
            angleDeg={0}
            tapSignal={local >= 4 ? 1 : 0}
            sprinkleSignal={0}
          />
        </Studio>
      );
    case "beam": {
      const I = 1.0 + ease((local - 4.5) / 4) * 1.2;
      return (
        <Studio
          camera={{ position: [1.7, 2.3, 3.9], target: [0, 1.5, 0], fov: 36 }}
          look="lab"
          backdrop="#141518"
          bloom={1.1}
          bloomThreshold={0.7}
          controls={{ enabled: false }}
        >
          <CameraPath
            from={[2.2, 2.4, 3.8]}
            to={[0.6, 1.95, 2.6]}
            target={[0, 1.55, 0]}
            targetTo={[0, 1.75, 0]}
            dur={dur}
            onTime={onTime}
          />
          <BeamScene U={250} I={I} showVectors={local > 1.5} />
        </Studio>
      );
    }
    case "slit": {
      const lambda = 650 - ease((local - 4) / 4) * 210;
      return (
        <Studio
          camera={{ position: [-0.75, 1.9, 3.1], target: [0.25, 1.08, 0], fov: 40 }}
          look="lab"
          backdrop="#121315"
          bloom={0.9}
          bloomThreshold={0.6}
          controls={{ enabled: false }}
        >
          <CameraPath
            from={[-1.0, 1.95, 3.2]}
            to={[-0.3, 1.35, 1.6]}
            target={[0.2, 1.08, 0]}
            targetTo={[1.0, 1.1, 0]}
            dur={dur}
            onTime={onTime}
          />
          <DoubleSlitScene p={{ lambdaNm: lambda, dMm: 0.25, aMm: 0.04, L: 2 }} />
        </Studio>
      );
    }
    default:
      return (
        <Studio
          camera={{ position: [0, 7.4, 5.6], target: [0, 0, -0.2], fov: 42 }}
          look="space"
          bloom={1.2}
          bloomThreshold={0.5}
          ao={false}
          controls={{ enabled: false }}
        >
          <CameraPath
            from={[0.5, 8.2, 6.2]}
            to={[-0.5, 6.6, 5.2]}
            target={[0, 0, -0.2]}
            dur={dur}
            onTime={onTime}
          />
          <OrbitScene track={ORBIT_TRACK()} playing timeRef={orbitTime} onTime={() => {}} />
        </Studio>
      );
  }
}
