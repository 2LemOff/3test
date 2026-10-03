// A deck of ruled index cards on a desk. The top card shows the current prompt and turns over
// to the answer, like flipping a real card.

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { STILL, useSimFrame } from "../../studio/clock";
import { BENCH_Y, Bench } from "../../studio/props";
import { smudgeRoughness } from "../../studio/textures";

const CARD = { w: 1.27, h: 0.76, t: 0.0035 };

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Ruled index card with handwriting-sized text. */
export function cardTexture(
  text: string,
  side: "front" | "back",
  tag: string,
): THREE.CanvasTexture {
  const W = 1270;
  const H = 760;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  ctx.fillStyle = "#f3f0e7";
  ctx.fillRect(0, 0, W, H);
  // Paper grain
  const img = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 7;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  // Rules: red header line, blue body lines (backs are plain, like real index cards)
  if (side === "front") {
    ctx.strokeStyle = "rgba(214, 64, 64, 0.75)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 150);
    ctx.lineTo(W, 150);
    ctx.stroke();
    ctx.strokeStyle = "rgba(90, 140, 200, 0.45)";
    ctx.lineWidth = 2;
    for (let y = 210; y < H; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }
  ctx.fillStyle = "#6b6f75";
  ctx.font = "600 34px Archivo, Arial, sans-serif";
  ctx.fillText(tag.toUpperCase(), 60, 100);
  ctx.fillStyle = "#0e1424";
  const size = text.length > 120 ? 46 : text.length > 70 ? 54 : 62;
  ctx.font = `600 ${size}px "Source Sans 3", "Segoe UI", Arial, sans-serif`;
  const lines = wrap(ctx, text, W - 140);
  const lineH = size * 1.22;
  const startY =
    side === "front" ? 250 : Math.max(200, (H - lines.length * lineH) / 2 + size * 0.4);
  for (const [i, l] of lines.slice(0, 8).entries()) ctx.fillText(l, 70, startY + i * lineH);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function DeckScene({
  front,
  back,
  tag,
  revealed,
  remaining,
}: {
  front: string;
  back: string;
  tag: string;
  revealed: boolean;
  remaining: number;
}) {
  const frontTex = useMemo(() => cardTexture(front, "front", tag), [front, tag]);
  const backTex = useMemo(() => cardTexture(back, "back", `${tag} · answer`), [back, tag]);
  const blank = useMemo(() => cardTexture("", "front", ""), []);
  const top = useRef<THREE.Group>(null);
  const flip = useRef(STILL && revealed ? 1 : 0);
  useSimFrame((dt) => {
    const target = revealed ? 1 : 0;
    flip.current += (target - flip.current) * Math.min(1, dt * 6);
    const g = top.current;
    if (!g) return;
    const a = flip.current * Math.PI;
    // Turn over about the card's long edge, lifting as it goes.
    g.rotation.x = -a;
    g.position.y = BENCH_Y + 0.06 + Math.sin(a) * 0.35;
    g.position.z = 0.1 - Math.sin(a) * 0.05;
  });

  const stack = Math.max(3, Math.min(14, remaining + 2));
  const offsets = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        r: Math.sin(i * 12.9898) * 0.5 * 0.06,
        x: Math.sin(i * 78.233) * 0.012,
      })),
    [],
  );
  return (
    <>
      <Bench width={3.2} depth={1.8} />
      {/* The deck */}
      {Array.from({ length: stack }, (_, i) => (
        <mesh
          key={i}
          position={[offsets[i].x, BENCH_Y + 0.002 + i * CARD.t, 0.1]}
          rotation-y={offsets[i].r}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[CARD.w, CARD.t, CARD.h]} />
          <meshStandardMaterial attach="material-0" color="#ece8de" roughness={0.9} />
          <meshStandardMaterial attach="material-1" color="#ece8de" roughness={0.9} />
          <meshStandardMaterial attach="material-2" map={blank} roughness={0.85} />
          <meshStandardMaterial attach="material-3" color="#f4f1ea" roughness={0.9} />
          <meshStandardMaterial attach="material-4" color="#ece8de" roughness={0.9} />
          <meshStandardMaterial attach="material-5" color="#ece8de" roughness={0.9} />
        </mesh>
      ))}
      {/* The current card */}
      <group ref={top} position={[0, BENCH_Y + 0.06, 0.1]}>
        <mesh position={[0, stack * CARD.t - 0.055, 0]} castShadow receiveShadow>
          <boxGeometry args={[CARD.w, CARD.t, CARD.h]} />
          <meshStandardMaterial attach="material-0" color="#efece4" roughness={0.9} />
          <meshStandardMaterial attach="material-1" color="#efece4" roughness={0.9} />
          <meshStandardMaterial
            attach="material-2"
            map={frontTex}
            roughness={0.82}
            roughnessMap={smudgeRoughness(0.82, 0.08, 1, 71)}
          />
          <meshStandardMaterial attach="material-3" map={backTex} roughness={0.85} />
          <meshStandardMaterial attach="material-4" color="#efece4" roughness={0.9} />
          <meshStandardMaterial attach="material-5" color="#efece4" roughness={0.9} />
        </mesh>
      </group>
      {/* Reviewed pile and a pencil, for scale */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[1.55 + i * 0.01, BENCH_Y + 0.002 + i * CARD.t, -0.05 - i * 0.015]}
          rotation-y={0.35 + i * 0.07}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[CARD.w, CARD.t, CARD.h]} />
          <meshStandardMaterial color="#f4f1ea" roughness={0.9} />
        </mesh>
      ))}
      <group position={[-1.2, BENCH_Y + 0.02, 0.62]} rotation-y={0.5}>
        <mesh rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.9, 6]} />
          <meshStandardMaterial color="#e2b23c" roughness={0.45} />
        </mesh>
        <mesh position={[0.5, 0, 0]} rotation-z={-Math.PI / 2} castShadow>
          <coneGeometry args={[0.02, 0.1, 6]} />
          <meshStandardMaterial color="#d9b48c" roughness={0.7} />
        </mesh>
        <mesh position={[-0.47, 0, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.021, 0.021, 0.05, 12]} />
          <meshStandardMaterial color="#c7a24a" metalness={1} roughness={0.3} />
        </mesh>
      </group>
    </>
  );
}
