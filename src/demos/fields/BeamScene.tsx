// Fine-beam tube between Helmholtz coils: the classic e/m experiment.
// Real dimensions (16 cm bulb, 15 cm coils) scaled ×5 into the scene.

import { useMemo } from "react";
import * as THREE from "three";
import { beamRadius, electronSpeed, helmholtzField } from "../../physics/lorentz";
import { Arrow, BENCH_Y, Bench, Label } from "../../studio/props";
import { brushedRoughness, smudgeRoughness, windingBump } from "../../studio/textures";

const S = 5; // scene units per metre
export const BULB_R = 0.08; // m
export const COIL_R = 0.15; // m
const GUN_DROP = 0.055; // gun sits 5.5 cm below the bulb centre, m
const CENTER_Y = BENCH_Y + 1.05;

export function beamGeometry(U: number, I: number) {
  const r = beamRadius(U, I); // m
  // Electrons leave the gun along +x; B points along +z, so the force on them is upwards at first.
  const pts: THREE.Vector3[] = [];
  let hitsGlass = false;
  const steps = 240;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const x = r * Math.sin(a);
    const y = -GUN_DROP + r * (1 - Math.cos(a));
    if (Math.hypot(x, y) > BULB_R - 0.002 && i > 2) {
      hitsGlass = true;
      pts.push(new THREE.Vector3(x * S, y * S + CENTER_Y, 0));
      break;
    }
    pts.push(new THREE.Vector3(x * S, y * S + CENTER_Y, 0));
  }
  return { r, pts, hitsGlass, B: helmholtzField(130, I, COIL_R), v: electronSpeed(U) };
}

export function BeamScene({ U, I, showVectors }: { U: number; I: number; showVectors: boolean }) {
  const beam = useMemo(() => beamGeometry(U, I), [U, I]);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(beam.pts), [beam]);
  const tube = useMemo(
    () => new THREE.TubeGeometry(curve, Math.max(16, beam.pts.length), 0.012, 10, false),
    [curve, beam],
  );
  const halo = useMemo(
    () => new THREE.TubeGeometry(curve, Math.max(16, beam.pts.length), 0.03, 10, false),
    [curve, beam],
  );

  // Vectors at the point a quarter of the way round (or the last point before the glass).
  const at = useMemo(() => {
    const u = beam.hitsGlass ? 0.5 : 0.25;
    const p = curve.getPointAt(u);
    const tangent = curve.getTangentAt(u);
    const center = new THREE.Vector3(0, (-GUN_DROP + beam.r) * S + CENTER_Y, 0);
    const toCenter = center.clone().sub(p).normalize();
    return { p, tangent, toCenter };
  }, [curve, beam]);

  return (
    <>
      <Bench width={2.8} depth={1.6} />
      <group position={[0, BENCH_Y, 0]}>
        <Base />
      </group>
      {/* Helmholtz coils, separated by their radius, axis along z */}
      {[-1, 1].map((side) => (
        <Coil key={side} z={(side * COIL_R * S) / 2} />
      ))}
      {/* Bulb */}
      <mesh position={[0, CENTER_Y, 0]}>
        <sphereGeometry args={[BULB_R * S, 96, 64]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transmission={1}
          thickness={0.02}
          roughness={0.02}
          ior={1.47}
          clearcoat={1}
          clearcoatRoughness={0.02}
          specularIntensity={1}
          attenuationColor="#eef6ff"
          attenuationDistance={4}
          envMapIntensity={1.3}
        />
      </mesh>
      {/* Glass neck down into the socket */}
      <mesh position={[0, CENTER_Y - BULB_R * S - 0.12, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 0.32, 48, 1, true]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transmission={1}
          thickness={0.02}
          roughness={0.03}
          ior={1.47}
          side={THREE.DoubleSide}
        />
      </mesh>
      <ElectronGun />
      {/* The glowing beam: electrons exciting the low-pressure hydrogen inside */}
      <mesh geometry={tube}>
        <meshStandardMaterial
          color="#7fe3ff"
          emissive="#56c8ff"
          emissiveIntensity={3.2}
          toneMapped={false}
        />
      </mesh>
      <mesh geometry={halo}>
        <meshBasicMaterial
          color="#4fb6ff"
          transparent
          opacity={0.12}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        position={[0, CENTER_Y, 0.05]}
        color="#69c9ff"
        intensity={0.9}
        distance={1.6}
        decay={2}
      />
      {beam.hitsGlass && (
        <mesh position={beam.pts[beam.pts.length - 1]}>
          <sphereGeometry args={[0.03, 16, 12]} />
          <meshStandardMaterial
            color="#c6f0ff"
            emissive="#9be3ff"
            emissiveIntensity={5}
            toneMapped={false}
          />
        </mesh>
      )}
      {showVectors && (
        <>
          <Arrow
            dir={at.tangent}
            length={0.32}
            color="#e9f4ff"
            radius={0.009}
            position={at.p}
            glow={1.2}
          />
          <Arrow dir={at.toCenter} length={0.26} color="#ff9b3d" radius={0.009} position={at.p} />
          <Arrow
            dir={new THREE.Vector3(0, 0, 1)}
            length={0.45}
            color="#ff5fa2"
            radius={0.009}
            position={[-0.62, CENTER_Y + 0.25, -0.2]}
          />
          <Label position={at.p.clone().add(at.tangent.clone().multiplyScalar(0.38))} text="v" />
          <Label
            position={at.p.clone().add(at.toCenter.clone().multiplyScalar(0.33))}
            text="F = −e v × B"
          />
          <Label position={[-0.62, CENTER_Y + 0.25, 0.32]} text="B" />
        </>
      )}
    </>
  );
}

function Coil({ z }: { z: number }) {
  const geometry = useMemo(() => {
    const R = COIL_R * S;
    const w = 0.07;
    const h = 0.05;
    const prof = [
      new THREE.Vector2(R - w, -h),
      new THREE.Vector2(R + w, -h),
      new THREE.Vector2(R + w, h),
      new THREE.Vector2(R - w, h),
      new THREE.Vector2(R - w, -h),
    ];
    return new THREE.LatheGeometry(prof, 160);
  }, []);
  const bump = windingBump(120);
  return (
    <group position={[0, CENTER_Y, z]} rotation-x={Math.PI / 2}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#b8673a"
          metalness={1}
          roughness={0.28}
          bumpMap={bump}
          bumpScale={0.6}
          clearcoat={0.8}
          clearcoatRoughness={0.15}
        />
      </mesh>
      {/* Black frame ring and foot */}
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[COIL_R * S + 0.085, 0.012, 12, 160]} />
        <meshStandardMaterial color="#141517" roughness={0.45} />
      </mesh>
      {/* Foot: from the ring down to the top of the base (local +z points down here) */}
      <mesh position={[0, 0, (COIL_R * S + 0.07 + CENTER_Y - BENCH_Y - 0.1) / 2]} castShadow>
        <boxGeometry args={[0.06, 0.06, CENTER_Y - BENCH_Y - 0.1 - COIL_R * S - 0.07]} />
        <meshStandardMaterial color="#141517" roughness={0.4} metalness={0.4} />
      </mesh>
    </group>
  );
}

function ElectronGun() {
  const y = CENTER_Y - GUN_DROP * S;
  return (
    <group position={[-0.03, y, 0]}>
      <mesh rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.028, 0.028, 0.1, 32]} />
        <meshStandardMaterial
          color="#b9bcc0"
          metalness={1}
          roughness={0.3}
          roughnessMap={brushedRoughness(0.3, 0.15)}
        />
      </mesh>
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.26, 12]} />
        <meshStandardMaterial color="#8d8f92" metalness={1} roughness={0.4} />
      </mesh>
      <mesh position={[0.052, 0, 0]}>
        <sphereGeometry args={[0.012, 16, 12]} />
        <meshStandardMaterial
          color="#ffd9a0"
          emissive="#ff9a3c"
          emissiveIntensity={2.5}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function Base() {
  return (
    <group>
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.1, 0.9]} />
        <meshStandardMaterial
          color="#1a1b1d"
          roughness={0.5}
          roughnessMap={smudgeRoughness(0.5, 0.15, 2, 21)}
          metalness={0.3}
        />
      </mesh>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.15, 0.2, 48]} />
        <meshStandardMaterial color="#121314" roughness={0.35} metalness={0.2} />
      </mesh>
      {[-0.55, -0.4, 0.4, 0.55].map((x, i) => (
        <mesh key={x} position={[x, 0.12, 0.38]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.05, 24]} />
          <meshStandardMaterial color={i % 2 ? "#b3261e" : "#141414"} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}
