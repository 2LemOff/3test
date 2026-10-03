// Reusable physical props: lab stands, chrome spheres, arrows and glowing field lines.

import { useThree } from "@react-three/fiber";
import { type ReactNode, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { brushedRoughness, smudgeRoughness, woodTexture } from "./textures";

/** Emissive helpers live on this layer so they cast no contact shadows. */
export const GLOW_LAYER = 1;

export function ChromeSphere({
  radius = 0.22,
  tint = "#e9ecef",
}: {
  radius?: number;
  tint?: string;
}) {
  return (
    <mesh castShadow receiveShadow>
      <sphereGeometry args={[radius, 96, 64]} />
      <meshStandardMaterial
        color={tint}
        metalness={1}
        roughness={0.07}
        roughnessMap={smudgeRoughness(0.08, 0.06, 1, 9)}
        envMapIntensity={1.2}
      />
    </mesh>
  );
}

/** Insulating stand: weighted anodised base, clear acrylic rod, coloured collar. */
export function LabStand({
  height = 0.9,
  collar = "#b02a2a",
}: {
  height?: number;
  collar?: string;
}) {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.025, 0]}>
        <cylinderGeometry args={[0.2, 0.22, 0.05, 64]} />
        <meshStandardMaterial
          color="#111214"
          metalness={0.6}
          roughness={0.38}
          roughnessMap={brushedRoughness(0.36, 0.12)}
        />
      </mesh>
      <mesh castShadow position={[0, 0.058, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 0.018, 48]} />
        <meshStandardMaterial color={collar} metalness={0.7} roughness={0.32} />
      </mesh>
      <mesh castShadow position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.018, 0.018, height, 32]} />
        <meshPhysicalMaterial
          color="#f4f8fb"
          transmission={1}
          thickness={0.04}
          roughness={0.04}
          ior={1.49}
          metalness={0}
          clearcoat={1}
          attenuationColor="#d8eef0"
          attenuationDistance={0.6}
        />
      </mesh>
    </group>
  );
}

/** Solid arrow from origin along `dir` with the given length. */
export function Arrow({
  dir,
  length,
  color = "#ff9b3d",
  radius = 0.012,
  glow = 1.6,
  position = [0, 0, 0],
}: {
  dir: THREE.Vector3;
  length: number;
  color?: string;
  radius?: number;
  glow?: number;
  position?: [number, number, number] | THREE.Vector3;
}) {
  const q = useMemo(() => {
    const d = dir.clone().normalize();
    return new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      d.lengthSq() ? d : new THREE.Vector3(0, 1, 0),
    );
  }, [dir]);
  const head = Math.min(radius * 6, length * 0.4);
  const shaft = Math.max(0.0001, length - head);
  return (
    <group position={position} quaternion={q}>
      <mesh position={[0, shaft / 2, 0]} castShadow>
        <cylinderGeometry args={[radius, radius, shaft, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={glow}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, shaft + head / 2, 0]} castShadow>
        <coneGeometry args={[radius * 2.6, head, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={glow}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/** Many polylines as one merged tube mesh that glows (and lights the path-traced scene). */
export function GlowLines({
  lines,
  radius = 0.0034,
  color = "#a9dcff",
  intensity = 1.8,
  segmentsPerPoint = 1,
}: {
  lines: THREE.Vector3[][];
  radius?: number;
  color?: string;
  intensity?: number;
  segmentsPerPoint?: number;
}) {
  const geometry = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (const pts of lines) {
      if (pts.length < 2) continue;
      const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
      parts.push(
        new THREE.TubeGeometry(curve, Math.max(8, pts.length * segmentsPerPoint), radius, 6, false),
      );
    }
    return parts.length ? mergeGeometries(parts) : new THREE.BufferGeometry();
  }, [lines, radius, segmentsPerPoint]);
  return (
    <mesh geometry={geometry} layers={GLOW_LAYER}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={intensity}
        toneMapped={false}
        roughness={0.4}
      />
    </mesh>
  );
}

/** Drag an object across a horizontal plane at height y. Disables camera orbit while dragging. */
export function Draggable({
  y,
  onDrag,
  children,
  bounds = 2.2,
}: {
  y: number;
  onDrag: (x: number, z: number) => void;
  children: ReactNode;
  bounds?: number;
}) {
  const controls = useThree((s) => s.controls) as { enabled: boolean } | null;
  const dragging = useRef(false);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), [y]);
  const hit = useMemo(() => new THREE.Vector3(), []);
  return (
    <group
      onPointerDown={(e) => {
        e.stopPropagation();
        dragging.current = true;
        (e.target as Element).setPointerCapture?.(e.pointerId);
        if (controls) controls.enabled = false;
        document.body.style.cursor = "grabbing";
      }}
      onPointerUp={(e) => {
        dragging.current = false;
        (e.target as Element).releasePointerCapture?.(e.pointerId);
        if (controls) controls.enabled = true;
        document.body.style.cursor = "";
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        e.stopPropagation();
        if (e.ray.intersectPlane(plane, hit)) {
          onDrag(
            THREE.MathUtils.clamp(hit.x, -bounds, bounds),
            THREE.MathUtils.clamp(hit.z, -bounds, bounds),
          );
        }
      }}
      onPointerOver={() => {
        if (!dragging.current) document.body.style.cursor = "grab";
      }}
      onPointerOut={() => {
        if (!dragging.current) document.body.style.cursor = "";
      }}
    >
      {children}
    </group>
  );
}

export const BENCH_Y = 0.72;

/** Wooden lab bench with steel legs; its top surface is at y = BENCH_Y. */
export function Bench({ width = 3.4, depth = 2.2 }: { width?: number; depth?: number }) {
  return (
    <group position={[0, BENCH_Y, 0]}>
      <mesh position={[0, -0.03, 0]} receiveShadow castShadow>
        <boxGeometry args={[width, 0.06, depth]} />
        <meshStandardMaterial
          map={woodTexture()}
          roughness={0.55}
          roughnessMap={smudgeRoughness(0.55, 0.15, 2, 4)}
        />
      </mesh>
      {[-width / 2 + 0.15, width / 2 - 0.15].map((x) =>
        [-depth / 2 + 0.15, depth / 2 - 0.15].map((z) => (
          <mesh key={`${x}${z}`} position={[x, -BENCH_Y / 2 - 0.03, z]} castShadow receiveShadow>
            <boxGeometry args={[0.07, BENCH_Y - 0.06, 0.07]} />
            <meshStandardMaterial
              color="#2b2d30"
              metalness={0.8}
              roughness={0.35}
              roughnessMap={brushedRoughness(0.35, 0.1)}
            />
          </mesh>
        )),
      )}
    </group>
  );
}

/**
 * A text label drawn into the 3D scene as a sprite with a constant on-screen size.
 * (drei's <Html> mounts a separate React root, which React 19 can't unmount mid-render.)
 */
export function Label({
  text,
  position,
  height = 0.034,
}: {
  text: string;
  position: [number, number, number] | THREE.Vector3;
  height?: number;
}) {
  const { texture, aspect } = useMemo(() => {
    const scale = 3;
    const font = `600 ${15 * scale}px Archivo, "Helvetica Neue", Arial, sans-serif`;
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d") as CanvasRenderingContext2D;
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(text).width) + 24 * scale;
    const h = 30 * scale;
    c.width = w;
    c.height = h;
    ctx.font = font;
    ctx.fillStyle = "rgba(14,16,18,0.78)";
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(1, 1, w - 2, h - 2, h / 2);
    ctx.fill();
    ctx.stroke();
    // Kept below the glow threshold so labels stay crisp under bloom.
    ctx.fillStyle = "#cdd2d6";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, h / 2 + scale);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return { texture: t, aspect: w / h };
  }, [text]);
  return (
    <sprite
      position={position}
      scale={[height * aspect, height, 1]}
      layers={GLOW_LAYER}
      renderOrder={10}
    >
      <spriteMaterial
        map={texture}
        sizeAttenuation={false}
        depthTest={false}
        transparent
        toneMapped={false}
      />
    </sprite>
  );
}
