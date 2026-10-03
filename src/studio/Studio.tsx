// Shared "photo studio" for every 3D demo: physically based lighting from generated softboxes,
// a seamless backdrop, soft shadows, post-processing and an optional path-traced photo mode.

import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  PerformanceMonitor,
  Sky,
  SoftShadows,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Bloom,
  EffectComposer,
  N8AO,
  Noise,
  SMAA,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { WebGLPathTracer } from "three-gpu-pathtracer";
import { RECORDING } from "./clock";

/** In recording mode the page renders only when the recorder asks for the next frame. */
function RecordBridge() {
  const advance = useThree((s) => s.advance);
  useEffect(() => {
    const w = window as unknown as { __advance?: () => void };
    w.__advance = () => advance(performance.now());
    return () => {
      if (w.__advance) w.__advance = undefined;
    };
  }, [advance]);
  return null;
}

import { smudgeRoughness } from "./textures";

export type Look = "studio" | "lab" | "space" | "outdoor";

export interface StudioProps {
  children: ReactNode;
  camera: { position: [number, number, number]; fov?: number; target?: [number, number, number] };
  look?: Look;
  backdrop?: string;
  bloom?: number;
  bloomThreshold?: number;
  ao?: boolean;
  shadowFloor?: number;
  controls?: {
    minDistance?: number;
    maxDistance?: number;
    maxPolarAngle?: number;
    enabled?: boolean;
    autoRotate?: boolean;
  };
  /** Sun direction for the outdoor look. */
  sun?: [number, number, number];
  /** When true, the path tracer takes over rendering. */
  photo?: boolean;
  onPhotoSamples?: (n: number) => void;
}

export function Studio({
  children,
  camera,
  look = "studio",
  backdrop = "#3b3e43",
  bloom = 0.6,
  bloomThreshold = 0.85,
  ao = true,
  shadowFloor = 0,
  controls,
  photo = false,
  onPhotoSamples,
  sun = [-0.45, 0.62, 0.65],
}: StudioProps) {
  const outdoor = look === "outdoor";
  const indoor = look === "studio" || look === "lab";
  const [degraded, setDegraded] = useState(false);
  const dprMax = Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2);
  return (
    <Canvas
      frameloop={RECORDING ? "never" : "always"}
      shadows="percentage"
      dpr={[1, degraded ? 1 : dprMax]}
      gl={{
        antialias: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer: RECORDING,
        toneMapping: THREE.NoToneMapping,
      }}
      camera={{
        position: camera.position,
        fov: camera.fov ?? 38,
        near: outdoor ? 0.2 : 0.02,
        far: outdoor ? 9000 : 400,
      }}
    >
      {RECORDING ? (
        <RecordBridge />
      ) : (
        <PerformanceMonitor onDecline={() => setDegraded(true)} flipflops={2} />
      )}
      <CameraLayers />
      {indoor && <SoftShadows size={18} samples={degraded ? 6 : 12} focus={0.6} />}
      {!outdoor && <color attach="background" args={[look === "space" ? "#000000" : backdrop]} />}
      {indoor && <Backdrop color={backdrop} floorY={shadowFloor} />}
      {outdoor ? <Outdoor sun={sun} /> : <Lighting look={look} />}
      {children}
      {indoor && (
        <ContactShadows
          position={[0, shadowFloor + 0.002, 0]}
          opacity={0.55}
          scale={14}
          blur={2.6}
          far={3}
          resolution={512}
          color="#000000"
        />
      )}
      <OrbitControls
        makeDefault
        target={camera.target ?? [0, 0.6, 0]}
        enableDamping
        dampingFactor={0.08}
        minDistance={controls?.minDistance ?? (outdoor ? 5 : 1.2)}
        maxDistance={controls?.maxDistance ?? (outdoor ? 3000 : 14)}
        maxPolarAngle={controls?.maxPolarAngle ?? Math.PI * 0.49}
        enabled={!photo && (controls?.enabled ?? true)}
        autoRotate={controls?.autoRotate ?? false}
        autoRotateSpeed={0.4}
      />
      {photo ? (
        <PhotoMode onSamples={onPhotoSamples} />
      ) : (
        <Post ao={ao && !degraded} bloom={bloom} threshold={bloomThreshold} />
      )}
    </Canvas>
  );
}

/** Seamless photo-studio cove: the floor curves up into the back wall, so there is no horizon line. */
function Backdrop({ color, floorY }: { color: string; floorY: number }) {
  const geometry = useMemo(() => {
    // Profile in (z, y): wall top → curve → floor towards the camera.
    const R = 3;
    const profile: [number, number][] = [[-5, 16]];
    for (let i = 24; i >= 0; i--) {
      const a = (i / 24) * (Math.PI / 2);
      profile.push([-2 - Math.sin(a) * R, R - Math.cos(a) * R]);
    }
    profile.push([10, 0]);
    const g = new THREE.PlaneGeometry(40, 1, 1, profile.length - 1);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const [z, y] = profile[Math.floor(i / 2)];
      pos.setXYZ(i, pos.getX(i), y, z);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geometry} position={[0, floorY, 0]} receiveShadow>
      <meshStandardMaterial
        color={color}
        roughness={0.92}
        roughnessMap={smudgeRoughness(0.9, 0.06, 4)}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** Generated softboxes: the reflections in metal and glass come from these. */
function Lighting({ look }: { look: Look }) {
  if (look === "space") {
    return (
      <Environment resolution={64} frames={1}>
        <Lightformer
          form="rect"
          intensity={0.25}
          position={[0, 0, -10]}
          scale={[30, 30, 1]}
          color="#20242c"
        />
      </Environment>
    );
  }
  const k = look === "lab" ? 0.7 : 1;
  return (
    <>
      <Environment resolution={256} frames={1}>
        <color attach="background" args={["#24272b"]} />
        {/* Overhead softbox */}
        <Lightformer
          form="rect"
          intensity={5 * k}
          position={[0, 6, 0]}
          rotation-x={Math.PI / 2}
          scale={[10, 6, 1]}
        />
        {/* Key softbox, front left */}
        <Lightformer
          form="rect"
          intensity={4 * k}
          position={[-6, 2.5, 4]}
          rotation-y={Math.PI / 3}
          scale={[4, 6, 1]}
        />
        {/* Large fill card behind the camera */}
        <Lightformer
          form="rect"
          intensity={1.2 * k}
          position={[0, 1.5, 9]}
          rotation-y={Math.PI}
          scale={[12, 5, 1]}
        />
        {/* Strip lights for edge highlights */}
        <Lightformer
          form="rect"
          intensity={4 * k}
          position={[6, 2, -2]}
          rotation-y={-Math.PI / 2.4}
          scale={[0.6, 6, 1]}
        />
        <Lightformer
          form="rect"
          intensity={2 * k}
          position={[-5, 1.5, -5]}
          rotation-y={Math.PI / 4}
          scale={[0.5, 5, 1]}
        />
        {/* Warm bounce card */}
        <Lightformer
          form="rect"
          intensity={0.6}
          color="#ffd9b0"
          position={[3, -1, 5]}
          rotation-y={-Math.PI / 5}
          scale={[6, 2, 1]}
        />
      </Environment>
      <directionalLight
        castShadow
        position={[-3.5, 6, 3]}
        intensity={1.6 * k}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />
      <ambientLight intensity={0.05} />
    </>
  );
}

function Post({ ao, bloom, threshold }: { ao: boolean; bloom: number; threshold: number }) {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {ao ? (
        <N8AO aoRadius={0.35} intensity={2.2} distanceFalloff={0.6} quality="medium" halfRes />
      ) : (
        // biome-ignore lint/complexity/noUselessFragments: EffectComposer needs an element in every slot
        <></>
      )}
      <Bloom
        mipmapBlur
        intensity={bloom}
        luminanceThreshold={threshold}
        luminanceSmoothing={0.2}
        radius={0.7}
      />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <Vignette offset={0.38} darkness={0.32} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.06} />
      <SMAA />
    </EffectComposer>
  );
}

/**
 * Path-traced photo mode: light bounces are simulated per pixel and refine every frame,
 * so stills converge towards a physically correct render. Interaction is paused meanwhile.
 */
function PhotoMode({ onSamples }: { onSamples?: (n: number) => void }) {
  const { gl, scene, camera } = useThree();
  const tracer = useRef<WebGLPathTracer | null>(null);
  useEffect(() => {
    const prevTone = gl.toneMapping;
    gl.toneMapping = THREE.AgXToneMapping;
    const pt = new WebGLPathTracer(gl);
    pt.tiles.set(2, 2);
    pt.minSamples = 1;
    pt.renderScale = Math.min(1, 1.5 / gl.getPixelRatio());
    pt.setScene(scene, camera);
    tracer.current = pt;
    return () => {
      pt.dispose();
      tracer.current = null;
      gl.toneMapping = prevTone;
    };
  }, [gl, scene, camera]);
  useFrame(() => {
    const pt = tracer.current;
    if (!pt) return;
    pt.renderSample();
    onSamples?.(Math.floor(pt.samples));
  }, 1);
  return null;
}

/** The main camera also sees layer 1 (glowing helpers); the contact-shadow camera does not. */
function CameraLayers() {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.layers.enable(1);
  }, [camera]);
  return null;
}

/** Daylight: physically based sky (Preetham model) used both as background and as image-based light. */
function Outdoor({ sun }: { sun: [number, number, number] }) {
  const dir = new THREE.Vector3(...sun).normalize();
  const sky = (
    <Sky
      distance={4500}
      sunPosition={dir.clone().multiplyScalar(100)}
      turbidity={2.6}
      rayleigh={1.1}
      mieCoefficient={0.003}
      mieDirectionalG={0.86}
    />
  );
  return (
    <>
      {sky}
      <Environment resolution={256} frames={1}>
        {sky}
      </Environment>
      <fog attach="fog" args={["#cbd9e4", 420, 3200]} />
      <directionalLight
        castShadow
        position={dir.clone().multiplyScalar(160).toArray()}
        intensity={2.6}
        color="#fff3e2"
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.05}
        shadow-camera-left={-90}
        shadow-camera-right={140}
        shadow-camera-top={90}
        shadow-camera-bottom={-90}
        shadow-camera-near={1}
        shadow-camera-far={500}
      />
    </>
  );
}

/** Move the camera and orbit target when a demo changes its framing. */
export function CameraRig({
  position,
  target,
}: {
  position: [number, number, number];
  target: [number, number, number];
}) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3;
    update: () => void;
  } | null;
  const key = [...position, ...target].map((v) => v.toFixed(2)).join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: the key captures position and target
  useEffect(() => {
    camera.position.set(...position);
    camera.lookAt(...target);
    if (controls) {
      controls.target.set(...target);
      controls.update();
    }
  }, [key, camera, controls]);
  return null;
}
