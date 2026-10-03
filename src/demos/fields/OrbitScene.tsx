import { Stars } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useSimFrame } from "../../studio/clock";
import { gasGiantTexture, rockyTexture, starTexture } from "../../studio/textures";
import { HOME_R, PLANET_R, type Track } from "./orbitSim";

/** Scene units per simulation unit. */
const K = 0.42;

function at(arr: Float32Array, i: number) {
  return new THREE.Vector3(arr[i * 2] * K, 0, -arr[i * 2 + 1] * K);
}

function orbitRing(r: number, opacity: number) {
  const pts = Array.from({ length: 257 }, (_, i) => {
    const a = (i / 256) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * r * K, 0, Math.sin(a) * r * K);
  });
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: "#5c6b80", transparent: true, opacity }),
  );
}

export function OrbitScene({
  track,
  playing,
  onTime,
  timeRef,
}: {
  track: Track;
  playing: boolean;
  onTime: (t: number) => void;
  timeRef: React.MutableRefObject<number>;
}) {
  const giant = gasGiantTexture(
    [
      [205, 170, 132],
      [168, 120, 86],
      [226, 207, 178],
      [140, 98, 70],
      [196, 156, 118],
      [232, 220, 196],
    ],
    17,
  );
  const home = rockyTexture([90, 120, 150], 23);
  const sunTex = starTexture();
  const planet = useRef<THREE.Group>(null);
  const probe = useRef<THREE.Group>(null);
  const n = track.t.length;

  const fullPath = useMemo(() => {
    const pts = Array.from({ length: n }, (_, i) => at(track.probe, i));
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(
      g,
      new THREE.LineDashedMaterial({
        color: "#9fb8d8",
        dashSize: 0.06,
        gapSize: 0.05,
        transparent: true,
        opacity: 0.5,
      }),
    );
    line.computeLineDistances();
    return line;
  }, [track, n]);
  const trailGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setDrawRange(0, 0);
    return g;
  }, [n]);
  const trailLine = useMemo(
    () =>
      new THREE.Line(
        trailGeom,
        new THREE.LineBasicMaterial({
          color: "#ffd27a",
          transparent: true,
          opacity: 0.95,
          toneMapped: false,
        }),
      ),
    [trailGeom],
  );
  const rings = useMemo(() => [orbitRing(PLANET_R, 0.35), orbitRing(HOME_R, 0.25)], []);

  useSimFrame((dt) => {
    if (playing) timeRef.current = Math.min(track.t[n - 1], timeRef.current + dt * 0.9);
    const t = timeRef.current;
    const i = Math.min(n - 1, Math.max(0, Math.round((t / track.t[n - 1]) * (n - 1))));
    planet.current?.position.copy(at(track.planet, i));
    if (planet.current) planet.current.rotation.y += dt * 0.6;
    if (probe.current) {
      probe.current.position.copy(at(track.probe, i));
      const j = Math.min(n - 1, i + 1);
      const dir = at(track.probe, j).sub(at(track.probe, i));
      if (dir.lengthSq() > 1e-10) probe.current.lookAt(probe.current.position.clone().add(dir));
    }
    const pos = trailGeom.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k <= i; k++) {
      const p = at(track.probe, k);
      pos.setXYZ(k, p.x, p.y, p.z);
    }
    pos.needsUpdate = true;
    trailGeom.setDrawRange(0, i + 1);
    onTime(t);
  });

  return (
    <>
      <Stars radius={60} depth={40} count={7000} factor={3.2} saturation={0.1} fade speed={0.2} />
      {/* Star */}
      <mesh>
        <sphereGeometry args={[0.42, 96, 64]} />
        <meshStandardMaterial
          color="#000000"
          emissive="#ffffff"
          emissiveMap={sunTex}
          emissiveIntensity={3.2}
          toneMapped={false}
        />
      </mesh>
      <pointLight intensity={60} distance={0} decay={1.2} color="#fff1dc" castShadow />
      <primitive object={rings[0]} />
      <primitive object={rings[1]} />
      {/* Home world on the inner orbit (static marker where the probe left) */}
      <mesh position={[HOME_R * K, 0, 0]} rotation-z={0.4}>
        <sphereGeometry args={[0.12, 64, 48]} />
        <meshStandardMaterial map={home} roughness={0.8} />
      </mesh>
      {/* Giant planet */}
      <group ref={planet}>
        <mesh rotation-z={0.05} castShadow receiveShadow>
          <sphereGeometry args={[0.17, 128, 96]} />
          <meshStandardMaterial map={giant} roughness={0.95} />
        </mesh>
      </group>
      <primitive object={fullPath} />
      <primitive object={trailLine} />
      {/* Probe: foil-wrapped bus, dish and solar panels */}
      <group ref={probe} scale={0.05}>
        <mesh>
          <boxGeometry args={[0.6, 0.5, 0.6]} />
          <meshStandardMaterial color="#d8a73f" metalness={1} roughness={0.32} />
        </mesh>
        <mesh position={[0, 0, -0.45]} rotation-x={Math.PI / 2}>
          <coneGeometry args={[0.55, 0.25, 48, 1, true]} />
          <meshStandardMaterial
            color="#e6e8ea"
            metalness={0.3}
            roughness={0.35}
            side={THREE.DoubleSide}
          />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 1.1, 0, 0]}>
            <boxGeometry args={[1.4, 0.02, 0.5]} />
            <meshStandardMaterial color="#1d2a4a" metalness={0.6} roughness={0.25} />
          </mesh>
        ))}
        <pointLight intensity={0.6} distance={1} color="#ffe2a8" />
      </group>
    </>
  );
}
