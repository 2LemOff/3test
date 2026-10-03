// Wave optics and mechanical waves on an optical bench.

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { doubleSlitIntensity, drivenResponse, wavelengthToRGB } from "../../physics/waves";
import { useSimFrame } from "../../studio/clock";
import { BENCH_Y, Bench } from "../../studio/props";
import { brushedRoughness, smudgeRoughness } from "../../studio/textures";

const RAIL_Y = BENCH_Y + 0.06;
const BEAM_Y = RAIL_Y + 0.42;
const LASER_X = -1.25;
const SLIT_X = -0.45;
const SCREEN_X = 1.2;
/** Real width shown across the screen card, m. */
export const SCREEN_SPAN = 0.06;

export interface SlitParams {
  lambdaNm: number;
  dMm: number;
  aMm: number;
  L: number;
}

export function DoubleSlitScene({ p }: { p: SlitParams }) {
  const [r, g, b] = wavelengthToRGB(p.lambdaNm);
  const color = useMemo(() => new THREE.Color(r, g, b), [r, g, b]);
  const pattern = useMemo(() => {
    const W = 1024;
    const H = 256;
    const data = new Uint8Array(W * H * 4);
    const row = new Float32Array(W);
    for (let i = 0; i < W; i++) {
      const y = (i / (W - 1) - 0.5) * SCREEN_SPAN;
      row[i] = doubleSlitIntensity(y, p.lambdaNm * 1e-9, p.dMm * 1e-3, p.aMm * 1e-3, p.L);
    }
    for (let j = 0; j < H; j++) {
      const v = (j / (H - 1) - 0.5) * 2;
      const env = Math.exp(-v * v * 5.5);
      for (let i = 0; i < W; i++) {
        const I = row[i] * env;
        data.set([255 * I, 255 * I, 255 * I, 255], (j * W + i) * 4);
      }
    }
    const t = new THREE.DataTexture(data, W, H);
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipMapLinearFilter;
    t.generateMipmaps = true;
    return t;
  }, [p.lambdaNm, p.dMm, p.aMm, p.L]);
  const ruler = useMemo(() => rulerTexture(), []);

  return (
    <>
      <Bench width={3.2} depth={1.4} />
      <Rail />
      {/* Laser module */}
      <Carrier x={LASER_X} />
      <group position={[LASER_X, BEAM_Y, 0]}>
        <mesh rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.42, 48]} />
          <meshStandardMaterial
            color="#141517"
            roughness={0.32}
            metalness={0.5}
            roughnessMap={brushedRoughness(0.3, 0.12)}
          />
        </mesh>
        <mesh position={[0.215, 0, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.045, 0.06, 0.03, 48]} />
          <meshStandardMaterial color="#c4c7cb" roughness={0.25} metalness={1} />
        </mesh>
        <mesh position={[0.05, 0.0705, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.12, 0.05]} />
          <meshStandardMaterial color="#f2c230" roughness={0.6} />
        </mesh>
      </group>
      {/* Beam to the slits */}
      <mesh position={[(LASER_X + 0.23 + SLIT_X) / 2, BEAM_Y, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.004, 0.004, SLIT_X - LASER_X - 0.23, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={6}
          toneMapped={false}
        />
      </mesh>
      {/* Slit plate */}
      <Carrier x={SLIT_X} />
      <group position={[SLIT_X, BEAM_Y, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.012, 0.32, 0.32]} />
          <meshStandardMaterial
            color="#1b1c1e"
            roughness={0.42}
            metalness={0.7}
            roughnessMap={brushedRoughness(0.42, 0.1)}
          />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh
            key={s}
            position={[0.007, 0, (s * Math.max(0.006, p.dMm * 0.04)) / 2]}
            rotation-y={Math.PI / 2}
          >
            <planeGeometry args={[0.001, 0.12]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={5}
              toneMapped={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>
      {/* Light spreading from the slits to the screen */}
      <SpreadFan color={color} />
      {/* Screen card with a millimetre ruler */}
      <Carrier x={SCREEN_X} />
      <group position={[SCREEN_X, BEAM_Y, 0]} rotation-y={-Math.PI / 2}>
        <mesh castShadow receiveShadow position={[0, 0, -0.006]}>
          <boxGeometry args={[1.0, 0.56, 0.01]} />
          <meshStandardMaterial
            color="#efeeea"
            roughness={0.9}
            roughnessMap={smudgeRoughness(0.9, 0.05, 2, 31)}
          />
        </mesh>
        <mesh position={[0, 0, 0.0002]}>
          <planeGeometry args={[1.0, 0.36]} />
          <meshStandardMaterial
            color="#000000"
            emissive={color}
            emissiveMap={pattern}
            emissiveIntensity={3.2}
            transparent
            opacity={1}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, -0.22, 0.0003]}>
          <planeGeometry args={[1.0, 0.08]} />
          <meshStandardMaterial map={ruler} transparent roughness={0.8} />
        </mesh>
      </group>
    </>
  );
}

function SpreadFan({ color }: { color: THREE.Color }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const L = SCREEN_X - SLIT_X;
    const w = 0.5;
    const h = 0.18;
    const v = new Float32Array([
      0,
      0,
      0,
      L,
      -h,
      -w,
      L,
      -h,
      w,
      0,
      0,
      0,
      L,
      h,
      w,
      L,
      h,
      -w,
      0,
      0,
      0,
      L,
      -h,
      w,
      L,
      h,
      w,
      0,
      0,
      0,
      L,
      h,
      -w,
      L,
      -h,
      -w,
    ]);
    g.setAttribute("position", new THREE.BufferAttribute(v, 3));
    return g;
  }, []);
  return (
    <mesh geometry={geo} position={[SLIT_X, BEAM_Y, 0]}>
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.035}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

function rulerTexture() {
  const c = document.createElement("canvas");
  c.width = 2048;
  c.height = 160;
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#1c1c1c";
  const mm = SCREEN_SPAN * 1000;
  for (let i = 0; i <= mm; i++) {
    const x = (i / mm) * (c.width - 40) + 20;
    const long = i % 10 === 0;
    const mid = i % 5 === 0;
    ctx.fillRect(x - 1.5, 0, 3, long ? 70 : mid ? 48 : 30);
    if (long) {
      ctx.font = "600 44px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${i - mm / 2}`, x, 128);
    }
  }
  ctx.font = "600 34px Archivo, Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("mm", c.width - 24, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function Rail() {
  return (
    <mesh position={[0, RAIL_Y - 0.02, 0]} castShadow receiveShadow>
      <boxGeometry args={[2.9, 0.08, 0.16]} />
      <meshStandardMaterial
        color="#b9bdc2"
        metalness={1}
        roughness={0.33}
        roughnessMap={brushedRoughness(0.33, 0.14, 2)}
      />
    </mesh>
  );
}

function Carrier({ x }: { x: number }) {
  return (
    <group position={[x, RAIL_Y, 0]}>
      <mesh position={[0, 0.04, 0]} castShadow>
        <boxGeometry args={[0.16, 0.06, 0.22]} />
        <meshStandardMaterial color="#202226" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, (BEAM_Y - RAIL_Y) / 2, 0]} castShadow>
        <cylinderGeometry args={[0.016, 0.016, BEAM_Y - RAIL_Y - 0.05, 24]} />
        <meshStandardMaterial color="#d7dadd" metalness={1} roughness={0.18} />
      </mesh>
    </group>
  );
}

// ---------- Standing waves on a string ----------

export const STRING = { L: 1.2, f1: 20 };
const STR_Y = RAIL_Y + 0.38;
const X0 = -0.95;
/** Displayed oscillation rate: real 10–120 Hz is slowed to a visible strobe-like rate. */
const DISPLAY_HZ = 1.1;

export function stringModes(fHz: number) {
  const raw = drivenResponse(fHz, STRING.f1, 8, 30);
  return raw.map((a) => a / 30);
}

export function StandingWaveScene({ fHz }: { fHz: number }) {
  const segs = 220;
  const modes = useMemo(() => stringModes(fHz), [fHz]);
  const tube = useMemo(() => {
    const path = new THREE.LineCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(STRING.L * 2, 0, 0),
    );
    return new THREE.TubeGeometry(path, segs, 0.007, 8, false);
  }, []);
  const base = useMemo(
    () => Float32Array.from(tube.attributes.position.array as Float32Array),
    [tube],
  );
  const envelopes = useMemo(() => {
    const pts = (sign: number) =>
      Array.from({ length: 160 }, (_, i) => {
        const u = i / 159;
        let y = 0;
        modes.forEach((a, n) => {
          y += a * Math.sin((n + 1) * Math.PI * u);
        });
        return new THREE.Vector3(u * STRING.L * 2, sign * y * 0.16, 0);
      });
    const mat = new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.18 });
    return [pts(1), pts(-1)].map(
      (p) => new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), mat),
    );
  }, [modes]);
  const phase = useRef(0);
  useSimFrame((dt) => {
    phase.current += dt * DISPLAY_HZ * Math.PI * 2;
    const pos = tube.attributes.position as THREE.BufferAttribute;
    const c = Math.cos(phase.current);
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const u = x / (STRING.L * 2);
      let y = 0;
      for (let n = 0; n < modes.length; n++) y += modes[n] * Math.sin((n + 1) * Math.PI * u);
      pos.setY(i, base[i * 3 + 1] + y * 0.16 * c);
    }
    pos.needsUpdate = true;
    tube.computeBoundingSphere();
  });
  const drive = useRef<THREE.Mesh>(null);
  useSimFrame(() => {
    if (drive.current) drive.current.position.y = 0.012 * Math.cos(phase.current);
  });

  return (
    <>
      <Bench width={3.2} depth={1.4} />
      <Rail />
      {/* Mechanical driver */}
      <group position={[X0 - 0.12, RAIL_Y, 0]}>
        <mesh position={[0, 0.17, 0]} castShadow>
          <boxGeometry args={[0.26, 0.3, 0.24]} />
          <meshStandardMaterial
            color="#1a1b1e"
            roughness={0.45}
            roughnessMap={smudgeRoughness(0.45, 0.15, 1, 41)}
          />
        </mesh>
        <mesh position={[0.06, 0.322, 0.121]}>
          <circleGeometry args={[0.03, 32]} />
          <meshStandardMaterial
            color="#b3261e"
            emissive="#ff3b2f"
            emissiveIntensity={1.4}
            toneMapped={false}
          />
        </mesh>
        <mesh ref={drive} position={[0.12, 0, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.06, 16]} />
          <meshStandardMaterial color="#d7dadd" metalness={1} roughness={0.2} />
        </mesh>
      </group>
      <group position={[X0, STR_Y, 0]}>
        <mesh geometry={tube} castShadow>
          <meshPhysicalMaterial color="#f4f1ea" roughness={0.55} sheen={1} sheenColor="#ffffff" />
        </mesh>
        {envelopes.map((line) => (
          <primitive key={line.uuid} object={line} />
        ))}
      </group>
      {/* Pulley and hanging mass set the tension */}
      <group position={[X0 + STRING.L * 2, STR_Y - 0.05, 0]}>
        <mesh rotation-x={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.03, 48]} />
          <meshStandardMaterial
            color="#c9ccd0"
            metalness={1}
            roughness={0.25}
            roughnessMap={brushedRoughness(0.25, 0.1)}
          />
        </mesh>
        <mesh position={[0.05, -0.2, 0]}>
          <cylinderGeometry args={[0.0035, 0.0035, 0.4, 8]} />
          <meshPhysicalMaterial color="#f4f1ea" roughness={0.55} />
        </mesh>
        <mesh position={[0.05, -0.43, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 0.09, 48]} />
          <meshStandardMaterial
            color="#9a7a3c"
            metalness={1}
            roughness={0.3}
            roughnessMap={brushedRoughness(0.3, 0.12)}
          />
        </mesh>
        <mesh position={[0, -0.18, -0.03]}>
          <boxGeometry args={[0.03, 0.42, 0.02]} />
          <meshStandardMaterial color="#1a1b1e" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>
    </>
  );
}
