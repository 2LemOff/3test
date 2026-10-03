import { useMemo, useRef } from "react";
import * as THREE from "three";
import { type Charge, electricField, fieldLines } from "../../physics/fields";
import { useSimFrame } from "../../studio/clock";
import {
  Arrow,
  ChromeSphere,
  Draggable,
  GLOW_LAYER,
  GlowLines,
  Label,
  LabStand,
} from "../../studio/props";

export const SPHERE_HEIGHT = 0.95;

export interface ElectricState {
  charges: { x: number; z: number; q: number }[];
  probe: { x: number; z: number };
}

const toCharges = (s: ElectricState): Charge[] =>
  s.charges.map((c) => ({ pos: [c.x, 0, c.z], q: c.q }));

export function probeField(s: ElectricState) {
  const e = electricField(toCharges(s), [s.probe.x, 0, s.probe.z]);
  return new THREE.Vector3(e[0], e[1], e[2]);
}

export function ElectricScene({
  state,
  onChange,
}: {
  state: ElectricState;
  onChange: (s: ElectricState) => void;
}) {
  const charges = toCharges(state);
  const key = JSON.stringify(state.charges.map((c) => [c.x.toFixed(2), c.z.toFixed(2), c.q]));
  // biome-ignore lint/correctness/useExhaustiveDependencies: lines depend only on the rounded charge layout
  const lines = useMemo(() => {
    const traced = fieldLines(charges, 8, 0.24);
    return traced.map((l) => {
      // Stop a line where it would pass into the floor.
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < l.points.length; i++) {
        const p = l.points[i];
        if (p[1] + SPHERE_HEIGHT < 0.03) break;
        if (i % 3 === 0 || i === l.points.length - 1)
          pts.push(new THREE.Vector3(p[0], p[1] + SPHERE_HEIGHT, p[2]));
      }
      return pts;
    });
  }, [key]);

  const E = probeField(state);
  const mag = E.length();

  return (
    <group>
      {state.charges.map((c, i) => (
        <group key={i} position={[c.x, 0, c.z]}>
          <LabStand height={SPHERE_HEIGHT - 0.22} collar={c.q > 0 ? "#b3302a" : "#2a5bb3"} />
          <Draggable
            y={SPHERE_HEIGHT}
            onDrag={(x, z) => {
              const next = structuredClone(state);
              next.charges[i] = { ...next.charges[i], x, z };
              onChange(next);
            }}
          >
            <group position={[0, SPHERE_HEIGHT, 0]}>
              <ChromeSphere radius={0.22} />
            </group>
          </Draggable>
          <Label
            text={`${c.q > 0 ? "+" : "−"}${Math.abs(c.q)} q`}
            position={[0, SPHERE_HEIGHT + 0.34, 0]}
          />
        </group>
      ))}
      <GlowLines lines={lines} />
      <FlowBeads lines={lines} />
      {/* Test charge: a small gold bead you can drag; the arrow is the force on it. */}
      <Draggable y={SPHERE_HEIGHT} onDrag={(x, z) => onChange({ ...state, probe: { x, z } })}>
        <group position={[state.probe.x, SPHERE_HEIGHT, state.probe.z]}>
          <mesh castShadow>
            <sphereGeometry args={[0.055, 48, 32]} />
            <meshStandardMaterial color="#e2b24a" metalness={1} roughness={0.18} />
          </mesh>
          <mesh visible={false}>
            <sphereGeometry args={[0.16, 12, 8]} />
          </mesh>
          {mag > 1e-6 && (
            <Arrow
              dir={E}
              length={Math.min(0.9, 0.12 + Math.log1p(mag * 6) * 0.22)}
              position={[0, 0, 0]}
            />
          )}
        </group>
      </Draggable>
    </group>
  );
}

/** Small glowing beads drifting along the field lines show the direction of E. */
function FlowBeads({ lines }: { lines: THREE.Vector3[][] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const curves = useMemo(
    () =>
      lines
        .filter((l) => l.length > 3)
        .map((l) => {
          const c = new THREE.CatmullRomCurve3(l);
          return { c, len: c.getLength() };
        }),
    [lines],
  );
  const perLine = 3;
  const count = curves.length * perLine;
  const m = useMemo(() => new THREE.Matrix4(), []);
  const p = useMemo(() => new THREE.Vector3(), []);
  const t = useRef(0);
  useSimFrame((dt) => {
    t.current += dt;
    const mesh = ref.current;
    if (!mesh) return;
    let k = 0;
    for (const { c, len } of curves) {
      for (let j = 0; j < perLine; j++) {
        const u = (((t.current * 0.35) / Math.max(0.5, len)) * 2 + j / perLine) % 1;
        c.getPointAt(u, p);
        m.makeTranslation(p.x, p.y, p.z);
        mesh.setMatrixAt(k++, m);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  if (!count) return null;
  return (
    <instancedMesh key={count} ref={ref} args={[undefined, undefined, count]} layers={GLOW_LAYER}>
      <sphereGeometry args={[0.01, 12, 8]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive="#d8f0ff"
        emissiveIntensity={4}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
