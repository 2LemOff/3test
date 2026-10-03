// A cannon on a sea cliff in daylight, used by the lesson and by predict-then-watch.
// Coordinates are metres: x is horizontal distance from the muzzle, y is height above the sea.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Water } from "three/examples/jsm/objects/Water.js";
import { components, type Launch, type State, sampleAt, simulate } from "../../physics/projectile";
import { STILL, useSimFrame } from "../../studio/clock";
import { Label } from "../../studio/props";
import {
  brushedRoughness,
  cliffTexture,
  fractalNoise,
  grassTexture,
  smudgeRoughness,
  waterNormals,
  woodTexture,
} from "../../studio/textures";

const BALL_R = 0.45;
const TRUNNION_H = 1.0;
const BARREL = 2.2;
/** Distance from the trunnion pivot to the muzzle. */
const PIVOT_TO_MUZZLE = BARREL * 0.55;
/** The cliff face sits this far in front of the muzzle. */
const EDGE_X = 2;

/** Height of the muzzle above the cliff top for a given elevation. */
export const muzzleAboveGround = (angle: number) => TRUNNION_H + PIVOT_TO_MUZZLE * Math.sin(angle);

export interface CliffSceneProps {
  launch: Launch;
  /** Increment to fire. */
  fireKey: number;
  /** Show the whole flight path without animating (for stills and answers). */
  showPath?: boolean;
  /** A buoy marking a predicted landing distance, m. */
  predictedX?: number | null;
  predictedLabel?: string;
  onTime?: (t: number, s: State) => void;
  onLand?: (s: State) => void;
  /** Gives the parent a way to map metres to screen pixels and back (for sketching). */
  onProjector?: (p: Projector) => void;
  markers?: boolean;
}

export interface Projector {
  toScreen: (x: number, y: number) => [number, number];
  toWorld: (px: number, py: number) => [number, number] | null;
  width: number;
  height: number;
}

export function CliffScene({
  launch,
  fireKey,
  showPath = false,
  predictedX = null,
  predictedLabel,
  onTime,
  onLand,
  onProjector,
  markers = true,
}: CliffSceneProps) {
  const path = useMemo(() => simulate(launch, 1 / 120), [launch]);
  const flight = path[path.length - 1].t;
  const anim = useRef({ t: STILL ? flight : -1, key: fireKey, landed: STILL });
  const ball = useRef<THREE.Mesh>(null);
  const ghosts = useRef<THREE.InstancedMesh>(null);
  const splash = useRef<THREE.Group>(null);
  const strobe = 0.25;
  const ghostCount = Math.ceil(flight / strobe) + 1;
  const m4 = useMemo(() => new THREE.Matrix4(), []);

  useEffect(() => {
    if (anim.current.key !== fireKey) {
      anim.current = { t: 0, key: fireKey, landed: false };
    }
  }, [fireKey]);

  useSimFrame((dt) => {
    const a = anim.current;
    if (showPath && a.t < 0) a.t = flight;
    if (a.t >= 0 && a.t < flight) a.t = Math.min(flight, a.t + dt);
    const t = Math.max(0, a.t);
    const s = sampleAt(path, t);
    if (ball.current) {
      ball.current.visible = a.t >= 0 || showPath;
      ball.current.position.set(s.x, s.y, 0);
    }
    if (ghosts.current) {
      let n = 0;
      for (let k = 0; k < ghostCount; k++) {
        const tk = k * strobe;
        if (a.t < 0 || tk > t) break;
        const g = sampleAt(path, tk);
        m4.makeTranslation(g.x, g.y, 0);
        ghosts.current.setMatrixAt(n++, m4);
      }
      ghosts.current.count = n;
      ghosts.current.instanceMatrix.needsUpdate = true;
    }
    if (splash.current) {
      const since = a.t >= flight ? (a.landed ? splash.current.userData.age + dt : 0) : -1;
      splash.current.userData.age = since;
      splash.current.visible = since >= 0 && since < 3 && !STILL;
      splash.current.position.set(path[path.length - 1].x, 0.05, 0);
      splash.current.scale.setScalar(1 + Math.max(0, since) * 3);
      splash.current.children.forEach((c) => {
        ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(
          0,
          0.8 - since * 0.3,
        );
      });
    }
    if (a.t >= 0) onTime?.(t, s);
    if (a.t >= flight && !a.landed) {
      a.landed = true;
      onLand?.(path[path.length - 1]);
    }
  });

  const pathLine = useMemo(() => {
    const pts = path.filter((_, i) => i % 4 === 0).map((s) => new THREE.Vector3(s.x, s.y, 0));
    pts.push(new THREE.Vector3(path[path.length - 1].x, 0, 0));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 0.08, 6, false);
  }, [path]);

  const h = launch.h;
  const { vx, vy } = components(launch);
  const angle = Math.atan2(vy, vx);
  const ground = h - muzzleAboveGround(angle);

  return (
    <>
      <Sea />
      <Cliff top={ground} />
      {/* Drawn 1.8× life size so it reads at this distance; scaled about the muzzle, the launch point. */}
      <group position={[0, h, 0]} scale={1.8}>
        <group position={[0, -h, 0]}>
          <Cannon ground={ground} angle={angle} />
        </group>
      </group>
      {markers && (
        <RangeMarkers maxX={Math.max(60, Math.ceil((path[path.length - 1].x + 25) / 20) * 20)} />
      )}
      {/* Cannonball */}
      <mesh ref={ball} castShadow visible={showPath}>
        <sphereGeometry args={[BALL_R, 48, 32]} />
        <meshStandardMaterial
          color="#2a2b2d"
          metalness={0.85}
          roughness={0.45}
          roughnessMap={smudgeRoughness(0.45, 0.25, 1, 51)}
        />
      </mesh>
      {/* Strobe images every 0.25 s: equal horizontal spacing shows that vx is constant */}
      <instancedMesh ref={ghosts} args={[undefined, undefined, ghostCount]} key={ghostCount}>
        <sphereGeometry args={[BALL_R * 0.55, 20, 14]} />
        <meshStandardMaterial
          color="#fff4dc"
          emissive="#ffd9a0"
          emissiveIntensity={1.4}
          transparent
          opacity={0.85}
          toneMapped={false}
        />
      </instancedMesh>
      {showPath && (
        <mesh geometry={pathLine}>
          <meshStandardMaterial
            color="#ffe1a8"
            emissive="#ffb347"
            emissiveIntensity={1.6}
            toneMapped={false}
            transparent
            opacity={0.9}
          />
        </mesh>
      )}
      <group ref={splash} visible={false}>
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.8, 1.3, 48]} />
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={0.8}
            roughness={0.3}
            depthWrite={false}
          />
        </mesh>
      </group>
      {predictedX !== null && <PredictionBuoy x={predictedX} label={predictedLabel} />}
      {onProjector && <ProjectorBridge onProjector={onProjector} />}
    </>
  );
}

function Sea() {
  const water = useMemo(() => {
    const w = new Water(new THREE.PlaneGeometry(6000, 6000), {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: waterNormals(),
      sunDirection: new THREE.Vector3(-0.45, 0.62, 0.65).normalize(),
      sunColor: 0xfff1dc,
      waterColor: 0x0c4660,
      distortionScale: 7,
      fog: true,
    });
    w.rotation.x = -Math.PI / 2;
    (w.material as THREE.ShaderMaterial).uniforms.size.value = 6;
    return w;
  }, []);
  useSimFrame((dt) => {
    (water.material as THREE.ShaderMaterial).uniforms.time.value += dt * 0.4;
  });
  return <primitive object={water} />;
}

/** A weathered rock: an icosphere pushed in and out by layered noise. */
const boulderCache = new Map<string, THREE.BufferGeometry>();
function boulder(r: number, seed: number) {
  const key = `${r}:${seed}`;
  const hit = boulderCache.get(key);
  if (hit) return hit;
  const g = new THREE.IcosahedronGeometry(r, 4);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const n =
      Math.sin(v.x * 3.1 + seed) * 0.12 +
      Math.sin(v.y * 5.3 + seed * 2) * 0.08 +
      Math.sin(v.z * 9.7 + seed * 3) * 0.05 +
      Math.sin((v.x + v.z) * 17) * 0.02;
    const flat = v.y < -0.2 ? 0.55 : 1;
    v.multiplyScalar(r * (1 + n));
    v.y *= 0.72 * flat;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  boulderCache.set(key, g);
  return g;
}

/** End of the headland nearest the camera (the visible cliff profile). */
const Z_END = 7;

/** A displaced cliff face: recedes into the rock by up to `depth`, tapering to zero at the ends. */
function rockFace(width: number, height: number, seed: number, depth = 5) {
  const g = new THREE.PlaneGeometry(
    width,
    height,
    Math.round(width / 0.9),
    Math.max(30, Math.round(height / 0.45)),
  );
  const coarse = fractalNoise(256, 6, seed, 4);
  const fine = fractalNoise(256, 4, seed + 9, 32);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const at = (arr: Float32Array, u: number, v: number) => {
    const row = Math.min(255, Math.max(0, Math.floor(v * 255)));
    const col = ((Math.floor(u * 255) % 256) + 256) % 256;
    return arr[row * 256 + col];
  };
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / width + 0.5;
    const v = pos.getY(i) / height + 0.5;
    const y = v * height;
    const n = at(coarse, (u * width) / 60, v);
    // Bedding planes: layers a metre or two thick that weather back at different rates.
    const bed = Math.floor(y / 1.7 + n * 1.5);
    const bedOffset = ((bed * 7919) % 13) / 13;
    const ledge = ((y / 1.7 + n * 1.5) % 1) ** 6 * 0.5;
    const rough = at(fine, (u * width) / 9, v * 3) - 0.5;
    const taper = Math.min(1, (u * width) / 5, ((1 - u) * width) / 5);
    const foot = v < 0.08 ? (0.08 - v) * 30 : 0;
    pos.setZ(i, (-(n * depth + bedOffset * 1.4 + ledge) + rough * 0.7 - 0.6 + foot * 0.4) * taper);
  }
  g.computeVertexNormals();
  return g;
}

function Cliff({ top }: { top: number }) {
  const depthBack = 300;
  const landLen = 200;
  const seaward = useMemo(() => rockFace(depthBack + Z_END, top + 4, 5), [top]);
  const profile = useMemo(() => rockFace(landLen, top + 4, 8), [top]);
  const tex = cliffTexture();
  tex.repeat.set(10, 1.1);
  const grass = grassTexture();
  const rock = (
    <meshStandardMaterial
      map={tex}
      bumpMap={tex}
      bumpScale={2.2}
      roughness={0.92}
      side={THREE.DoubleSide}
    />
  );
  return (
    <group>
      {/* Seaward face (normal +x) */}
      <mesh
        geometry={seaward}
        position={[EDGE_X, (top - 4) / 2, (Z_END - depthBack) / 2]}
        rotation-y={Math.PI / 2}
        castShadow
        receiveShadow
      >
        {rock}
      </mesh>
      {/* End face towards the camera (normal +z): the profile you see side-on */}
      <mesh
        geometry={profile}
        position={[EDGE_X - landLen / 2, (top - 4) / 2, Z_END]}
        castShadow
        receiveShadow
      >
        {rock}
      </mesh>
      {/* Turf on top */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[EDGE_X - landLen / 2, top, (Z_END - depthBack) / 2]}
        receiveShadow
      >
        <planeGeometry args={[landLen, depthBack + Z_END]} />
        <meshStandardMaterial map={grass} roughness={1} />
      </mesh>
      {/* Boulders at the foot of the cliff */}
      {[
        [EDGE_X + 1.5, 1.2, -9, 2.4],
        [EDGE_X + 4, 0.6, 3, 1.6],
        [EDGE_X - 6, 0.9, Z_END + 2.5, 2.2],
        [EDGE_X + 2.5, 0.4, -24, 1.9],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} geometry={boulder(r, i)} position={[x, y, z]} castShadow receiveShadow>
          <meshStandardMaterial color="#77716a" bumpMap={tex} bumpScale={3} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function Cannon({ ground, angle }: { ground: number; angle: number }) {
  const wood = woodTexture(8);
  const bronze = (
    <meshPhysicalMaterial
      color="#8a6a3a"
      metalness={1}
      roughness={0.38}
      roughnessMap={brushedRoughness(0.38, 0.2)}
      clearcoat={0.2}
    />
  );
  // The barrel pivots on trunnions; the muzzle (the launch point) is at x = 0.
  const pivotX = -PIVOT_TO_MUZZLE * Math.cos(angle);
  return (
    <group position={[pivotX, ground, 0]}>
      <mesh position={[-0.2, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.5, 0.8]} />
        <meshStandardMaterial map={wood} roughness={0.7} color="#7d6a55" />
      </mesh>
      {[-0.5, 0.5].map((z) =>
        [-0.75, 0.45].map((x) => (
          <mesh key={`${x}${z}`} position={[x, 0.4, z * 1.1]} rotation-x={Math.PI / 2} castShadow>
            <cylinderGeometry args={[0.4, 0.4, 0.12, 32]} />
            <meshStandardMaterial map={wood} roughness={0.7} color="#5e4c3a" />
          </mesh>
        )),
      )}
      <group position={[0, TRUNNION_H, 0]} rotation-z={angle}>
        <mesh position={[PIVOT_TO_MUZZLE - BARREL / 2, 0, 0]} rotation-z={-Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.22, 0.32, BARREL, 40]} />
          {bronze}
        </mesh>
        <mesh position={[PIVOT_TO_MUZZLE, 0, 0]} rotation-y={Math.PI / 2}>
          <torusGeometry args={[0.23, 0.05, 16, 40]} />
          {bronze}
        </mesh>
        <mesh position={[PIVOT_TO_MUZZLE - BARREL, 0, 0]}>
          <sphereGeometry args={[0.3, 32, 24]} />
          {bronze}
        </mesh>
        <mesh rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.09, 0.09, 0.95, 20]} />
          {bronze}
        </mesh>
      </group>
    </group>
  );
}

function RangeMarkers({ maxX }: { maxX: number }) {
  const xs = [];
  for (let x = 20; x <= maxX; x += 20) xs.push(x);
  return (
    <>
      {xs.map((x) => (
        <group key={x} position={[x, 0, -8]}>
          <group scale={1.8}>
            <Buoy color="#f2f0ea" stripe="#c2412d" />
          </group>
          <Label text={`${x} m`} position={[0, 6.4, 0]} height={0.03} />
        </group>
      ))}
    </>
  );
}

function Buoy({ color, stripe }: { color: string; stripe: string }) {
  const Bob = useRef<THREE.Group>(null);
  const phase = useMemo(() => Math.random() * 6, []);
  useSimFrame((_, t) => {
    if (Bob.current) {
      Bob.current.position.y = Math.sin(t * 1.3 + phase) * 0.12;
      Bob.current.rotation.z = Math.sin(t * 0.9 + phase) * 0.05;
    }
  });
  return (
    <group ref={Bob}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.6, 1.4, 32]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.47, 0.5, 0.35, 32]} />
        <meshStandardMaterial color={stripe} roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.0, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 1.6, 12]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.8} roughness={0.4} />
      </mesh>
    </group>
  );
}

function PredictionBuoy({ x, label }: { x: number; label?: string }) {
  return (
    <group position={[x, 0, 4]}>
      <Buoy color="#e8432f" stripe="#f2f0ea" />
      <mesh position={[0.45, 2.55, 0]}>
        <planeGeometry args={[0.9, 0.55]} />
        <meshStandardMaterial color="#ffd23f" side={THREE.DoubleSide} roughness={0.7} />
      </mesh>
      <Label text={label ?? `Prediction ${x.toFixed(0)} m`} position={[0, 5.4, 0]} />
    </group>
  );
}

function ProjectorBridge({ onProjector }: { onProjector: (p: Projector) => void }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const last = useRef("");
  useFrame(() => {
    const key = `${size.width}x${size.height}:${camera.position.toArray().map((v) => v.toFixed(3))}`;
    if (key === last.current) return;
    last.current = key;
    const v = new THREE.Vector3();
    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    onProjector({
      width: size.width,
      height: size.height,
      toScreen: (x, y) => {
        v.set(x, y, 0).project(camera);
        return [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height];
      },
      toWorld: (px, py) => {
        ray.setFromCamera(
          new THREE.Vector2((px / size.width) * 2 - 1, 1 - (py / size.height) * 2),
          camera,
        );
        const hit = new THREE.Vector3();
        return ray.ray.intersectPlane(plane, hit) ? [hit.x, hit.y] : null;
      },
    });
  });
  return null;
}
