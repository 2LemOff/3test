// Iron filings on paper around bar magnets. Each of the 50,000 filings is oriented by the
// magnetic field computed on the graphics card, inside the vertex shader of a physically
// based material, so the filings stay lit, shiny and shadowed like real metal.

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { STILL, useSimFrame } from "../../studio/clock";
import { BENCH_Y, Bench } from "../../studio/props";
import { paperTexture, smudgeRoughness } from "../../studio/textures";

export type MagnetLayout = "single" | "attract" | "repel";
export const FILING_COUNT = 50000;

const BAR = { length: 0.56, width: 0.11, height: 0.07 };
const PAPER = { w: 2.1, d: 1.45 };

interface Magnet {
  x: number;
  z: number;
  angle: number;
}

export function magnetsFor(layout: MagnetLayout, angleDeg: number): Magnet[] {
  const a = THREE.MathUtils.degToRad(angleDeg);
  if (layout === "single") return [{ x: 0, z: 0, angle: a }];
  const gap = 0.52;
  return [
    { x: -gap, z: 0, angle: 0 },
    { x: gap, z: 0, angle: layout === "attract" ? 0 : Math.PI },
  ];
}

/** Gilbert-model poles for each magnet: north at +x end of the bar's own frame. */
function polesFor(magnets: Magnet[]): THREE.Vector4[] {
  const out: THREE.Vector4[] = [];
  const d = BAR.length * 0.42;
  for (const m of magnets) {
    const cx = Math.cos(m.angle) * d;
    const cz = -Math.sin(m.angle) * d;
    out.push(new THREE.Vector4(m.x + cx, m.z + cz, 1, 1));
    out.push(new THREE.Vector4(m.x - cx, m.z - cz, -1, 1));
  }
  while (out.length < 4) out.push(new THREE.Vector4(0, 0, 0, 0));
  return out;
}

export function MagnetScene({
  layout,
  angleDeg,
  tapSignal,
  sprinkleSignal,
}: {
  layout: MagnetLayout;
  angleDeg: number;
  /** Increment to tap the paper (filings re-settle). */
  tapSignal: number;
  /** Increment to sprinkle fresh filings. */
  sprinkleSignal: number;
}) {
  const magnets = useMemo(() => magnetsFor(layout, angleDeg), [layout, angleDeg]);

  const geometry = useMemo(() => {
    const base = new THREE.BoxGeometry(0.016, 0.0016, 0.0019);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index;
    g.setAttribute("position", base.getAttribute("position"));
    g.setAttribute("normal", base.getAttribute("normal"));
    g.setAttribute("uv", base.getAttribute("uv"));
    const data = new Float32Array(FILING_COUNT * 4);
    let s = 12345;
    const rand = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    for (let i = 0; i < FILING_COUNT; i++) {
      const x = (rand() - 0.5) * (PAPER.w - 0.08);
      const z = (rand() - 0.5) * (PAPER.d - 0.08);
      data.set([x, z, rand() * Math.PI * 2, 0.6 + rand() * 0.8], i * 4);
    }
    g.setAttribute("aFiling", new THREE.InstancedBufferAttribute(data, 4));
    g.instanceCount = FILING_COUNT;
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 2);
    return g;
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: uniforms are created once and updated per frame
  const uniforms = useMemo(
    () => ({
      uPoles: { value: polesFor(magnets) },
      uSettle: { value: 0 },
      uDrop: { value: 0 },
      uMagnets: { value: [new THREE.Vector4(), new THREE.Vector4()] },
    }),
    [],
  );

  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: "#3a3b3d",
      metalness: 0.85,
      roughness: 0.42,
    });
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          attribute vec4 aFiling;
          uniform vec4 uPoles[4];
          uniform vec4 uMagnets[2];
          uniform float uSettle;
          uniform float uDrop;
          vec2 fieldAt(vec2 p) {
            vec2 B = vec2(0.0);
            for (int i = 0; i < 4; i++) {
              vec2 r = p - uPoles[i].xy;
              float d2 = dot(r, r) + 0.0016;
              B += uPoles[i].z * uPoles[i].w * r / (d2 * sqrt(d2));
            }
            return B;
          }
          float filingAngle() {
            vec2 B = fieldAt(aFiling.xy);
            float target = atan(-B.y, B.x);
            float start = aFiling.z;
            // Filings have no head or tail: turn the shortest way to the field axis.
            float diff = mod(target - start + 1.5707963, 3.1415926) - 1.5707963;
            float strength = clamp(length(B) * 0.9, 0.0, 1.0);
            float k = smoothstep(0.0, 1.0, clamp(uSettle * (0.6 + strength), 0.0, 1.0));
            return start + diff * k * (0.35 + 0.65 * strength);
          }
          mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
          bool hidden() {
            for (int i = 0; i < 2; i++) {
              if (uMagnets[i].w < 0.5) continue;
              vec2 d = aFiling.xy - uMagnets[i].xy;
              float a = uMagnets[i].z;
              vec2 l = vec2(d.x * cos(a) - d.y * sin(a), d.x * sin(a) + d.y * cos(a));
              if (abs(l.x) < ${(BAR.length / 2 + 0.01).toFixed(3)} && abs(l.y) < ${(BAR.width / 2 + 0.01).toFixed(3)}) return true;
            }
            return false;
          }`,
        )
        .replace(
          "#include <beginnormal_vertex>",
          `float fAngle = filingAngle();
          mat3 fRot = rotY(fAngle);
          vec3 objectNormal = fRot * vec3(normal);
          #ifdef USE_TANGENT
            vec3 objectTangent = vec3(tangent.xyz);
          #endif`,
        )
        .replace(
          "#include <begin_vertex>",
          `vec3 transformed = fRot * (vec3(position) * vec3(aFiling.w, 1.0, 1.0));
          float fall = 1.0 - smoothstep(0.0, 1.0, clamp(uDrop * 1.6 - fract(aFiling.z * 7.31) * 0.6, 0.0, 1.0));
          transformed += vec3(aFiling.x, 0.0013 + fall * 0.5, aFiling.y);
          if (hidden()) transformed = vec3(0.0, -10.0, 0.0);`,
        );
    };
    return m;
  }, [uniforms]);

  // Animate settling after a tap and falling after a sprinkle.
  const anim = useRef({
    settle: STILL ? 1 : 0,
    drop: STILL ? 1 : 0,
    tap: tapSignal,
    sprinkle: sprinkleSignal,
  });
  useSimFrame((dt) => {
    const a = anim.current;
    if (a.sprinkle !== sprinkleSignal) {
      a.sprinkle = sprinkleSignal;
      a.drop = 0;
      a.settle = 0;
    }
    if (a.tap !== tapSignal) {
      a.tap = tapSignal;
      a.settle = Math.min(a.settle, 0.15);
    }
    a.drop = Math.min(1, a.drop + dt / 1.6);
    if (a.drop >= 1) a.settle = Math.min(1, a.settle + dt / 2.2);
    uniforms.uSettle.value = a.settle;
    uniforms.uDrop.value = a.drop;
    uniforms.uPoles.value = polesFor(magnets);
    uniforms.uMagnets.value = [0, 1].map((i) =>
      magnets[i]
        ? new THREE.Vector4(magnets[i].x, magnets[i].z, magnets[i].angle, 1)
        : new THREE.Vector4(),
    );
  });

  return (
    <>
      <Bench />
      <group position={[0, BENCH_Y, 0]}>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.0006, 0]} receiveShadow>
          <planeGeometry args={[PAPER.w, PAPER.d]} />
          <meshStandardMaterial map={paperTexture()} roughness={0.95} />
        </mesh>
        <mesh geometry={geometry} material={material} frustumCulled={false} />
        {magnets.map((m, i) => (
          <BarMagnet key={i} magnet={m} />
        ))}
      </group>
    </>
  );
}

function letterTexture(letter: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 104px Archivo, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(letter, 64, 70);
  const t = new THREE.CanvasTexture(c);
  return t;
}

function BarMagnet({ magnet }: { magnet: Magnet }) {
  const n = useMemo(() => letterTexture("N"), []);
  const s = useMemo(() => letterTexture("S"), []);
  const half = BAR.length / 2;
  return (
    <group position={[magnet.x, BAR.height / 2 + 0.001, magnet.z]} rotation-y={magnet.angle}>
      <mesh position={[half / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[half, BAR.height, BAR.width]} />
        <meshPhysicalMaterial
          color="#a8211b"
          roughness={0.38}
          roughnessMap={smudgeRoughness(0.4, 0.2, 1, 12)}
          clearcoat={0.6}
          clearcoatRoughness={0.25}
        />
      </mesh>
      <mesh position={[-half / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[half, BAR.height, BAR.width]} />
        <meshPhysicalMaterial
          color="#c9ccd0"
          metalness={0.2}
          roughness={0.42}
          roughnessMap={smudgeRoughness(0.42, 0.2, 1, 13)}
          clearcoat={0.5}
          clearcoatRoughness={0.3}
        />
      </mesh>
      <mesh position={[half * 0.72, BAR.height / 2 + 0.0008, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.07, 0.07]} />
        <meshStandardMaterial color="#f2efe8" alphaMap={n} transparent roughness={0.5} />
      </mesh>
      <mesh position={[-half * 0.72, BAR.height / 2 + 0.0008, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.07, 0.07]} />
        <meshStandardMaterial color="#2a2c30" alphaMap={s} transparent roughness={0.5} />
      </mesh>
    </group>
  );
}
