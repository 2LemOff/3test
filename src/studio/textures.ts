// Surface textures generated in code (Artifact pages cannot load external images).

import * as THREE from "three";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Tileable 2D value noise with several octaves, returned as a Float32Array in 0..1. */
export function fractalNoise(size: number, octaves = 5, seed = 1, baseFreq = 4): Float32Array {
  const rand = rng(seed);
  const out = new Float32Array(size * size);
  let amp = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    const f = baseFreq << o;
    const grid = new Float32Array(f * f).map(() => rand());
    const g = (x: number, y: number) => grid[(((y % f) + f) % f) * f + (((x % f) + f) % f)];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * f;
        const fy = (y / size) * f;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const tx = fx - x0;
        const ty = fy - y0;
        const sx = tx * tx * (3 - 2 * tx);
        const sy = ty * ty * (3 - 2 * ty);
        const a = g(x0, y0) + (g(x0 + 1, y0) - g(x0, y0)) * sx;
        const b = g(x0, y0 + 1) + (g(x0 + 1, y0 + 1) - g(x0, y0 + 1)) * sx;
        out[y * size + x] += (a + (b - a) * sy) * amp;
      }
    }
    norm += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= norm;
  return out;
}

function canvasTexture(
  size: number,
  draw: (ctx: CanvasRenderingContext2D, img: ImageData) => void,
  srgb = true,
  repeat = 1,
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  const img = ctx.createImageData(size, size);
  draw(ctx, img);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  return t;
}

const cache = new Map<string, THREE.Texture>();
function cached<T extends THREE.Texture>(key: string, make: () => T): T {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key) as T;
}

/** Roughness map with fine directional streaks, like brushed or turned metal. */
export function brushedRoughness(base = 0.32, spread = 0.18, repeat = 1) {
  return cached(`brushed${base}${spread}${repeat}`, () =>
    canvasTexture(
      512,
      (ctx, img) => {
        const rand = rng(11);
        const rows = new Float32Array(512).map(() => rand());
        const n = fractalNoise(512, 4, 3, 2);
        for (let y = 0; y < 512; y++) {
          for (let x = 0; x < 512; x++) {
            const i = y * 512 + x;
            const streak = rows[y] * 0.6 + rand() * 0.4;
            const v = base + (streak - 0.5) * spread + (n[i] - 0.5) * spread * 0.8;
            const c = Math.max(0, Math.min(255, v * 255));
            img.data.set([c, c, c, 255], i * 4);
          }
        }
        ctx.putImageData(img, 0, 0);
      },
      false,
      repeat,
    ),
  );
}

/** Smudges and wear: a roughness map for painted or handled surfaces. */
export function smudgeRoughness(base = 0.45, spread = 0.3, repeat = 1, seed = 5) {
  return cached(`smudge${base}${spread}${repeat}${seed}`, () =>
    canvasTexture(
      512,
      (ctx, img) => {
        const n = fractalNoise(512, 6, seed, 3);
        for (let i = 0; i < n.length; i++) {
          const v = base + (n[i] - 0.5) * spread * 2;
          const c = Math.max(0, Math.min(255, v * 255));
          img.data.set([c, c, c, 255], i * 4);
        }
        ctx.putImageData(img, 0, 0);
      },
      false,
      repeat,
    ),
  );
}

/** Off-white paper with fibres and slight tone variation. */
export function paperTexture() {
  return cached("paper", () =>
    canvasTexture(1024, (ctx, img) => {
      const n = fractalNoise(1024, 6, 21, 8);
      const rand = rng(4);
      for (let i = 0; i < n.length; i++) {
        const fibre = rand() < 0.004 ? -18 : 0;
        const v = 236 + (n[i] - 0.5) * 16 + (rand() - 0.5) * 6 + fibre;
        img.data.set([v, v - 2, v - 7, 255], i * 4);
      }
      ctx.putImageData(img, 0, 0);
    }),
  );
}

/** Copper winding: fine parallel wire turns as a bump map, plus colour variation. */
export function windingBump(turns = 90) {
  return cached(`winding${turns}`, () =>
    canvasTexture(
      512,
      (ctx, img) => {
        for (let y = 0; y < 512; y++) {
          for (let x = 0; x < 512; x++) {
            const p = (x / 512) * turns;
            const v = Math.sqrt(Math.max(0, Math.sin((p % 1) * Math.PI))) * 255;
            img.data.set([v, v, v, 255], (y * 512 + x) * 4);
          }
        }
        ctx.putImageData(img, 0, 0);
      },
      false,
    ),
  );
}

/** Gas-giant bands with turbulence. */
export function gasGiantTexture(palette: [number, number, number][], seed = 9) {
  return cached(`giant${seed}`, () => {
    const w = 1024;
    const h = 512;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d") as CanvasRenderingContext2D;
    const img = ctx.createImageData(w, h);
    const n = fractalNoise(512, 6, seed, 4);
    const bands = rng(seed + 1);
    const bandOffsets = new Float32Array(64).map(() => bands());
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const turb = n[(y % 512) * 512 + ((x >> 1) % 512)];
        const lat = y / h + (turb - 0.5) * 0.06;
        const bi = Math.floor(lat * 22);
        const t = bandOffsets[((bi % 64) + 64) % 64];
        const a = palette[Math.floor(t * palette.length) % palette.length];
        const b = palette[(Math.floor(t * palette.length) + 1) % palette.length];
        const f = (lat * 22) % 1;
        const shade = 0.88 + turb * 0.24;
        const px = [0, 1, 2].map((k) => (a[k] + (b[k] - a[k]) * f * f) * shade);
        img.data.set([px[0], px[1], px[2], 255], (y * w + x) * 4);
      }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  });
}

/** Rocky planet / moon surface: craters and albedo variation. */
export function rockyTexture(tint: [number, number, number], seed = 3) {
  return cached(`rock${seed}`, () =>
    canvasTexture(1024, (ctx, img) => {
      const n = fractalNoise(1024, 7, seed, 4);
      for (let i = 0; i < n.length; i++) {
        const v = 0.55 + (n[i] - 0.5) * 1.1;
        img.data.set([tint[0] * v, tint[1] * v, tint[2] * v, 255], i * 4);
      }
      ctx.putImageData(img, 0, 0);
      const rand = rng(seed + 7);
      for (let k = 0; k < 140; k++) {
        const x = rand() * 1024;
        const y = rand() * 1024;
        const r = 3 + rand() ** 3 * 40;
        const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
        g.addColorStop(0, "rgba(0,0,0,0.28)");
        g.addColorStop(0.75, "rgba(0,0,0,0.12)");
        g.addColorStop(0.9, "rgba(255,255,255,0.14)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }),
  );
}

/** Wood grain for lab benches and rails. */
export function woodTexture(seed = 2) {
  return cached(`wood${seed}`, () =>
    canvasTexture(1024, (ctx, img) => {
      const n = fractalNoise(1024, 5, seed, 2);
      for (let y = 0; y < 1024; y++) {
        for (let x = 0; x < 1024; x++) {
          const i = y * 1024 + x;
          const ring = Math.sin((y / 1024) * 34 + n[i] * 22 + Math.sin(x / 140) * 1.5) * 0.5 + 0.5;
          const v = 0.7 + ring * 0.12 + (n[i] - 0.5) * 0.35;
          img.data.set([112 * v + 38, 80 * v + 24, 54 * v + 14, 255], i * 4);
        }
      }
      ctx.putImageData(img, 0, 0);
    }),
  );
}

/** Star surface: convection granulation, for an emissive map. */
export function starTexture(seed = 61) {
  return cached(`star${seed}`, () =>
    canvasTexture(1024, (ctx, img) => {
      const coarse = fractalNoise(1024, 3, seed, 6);
      const fine = fractalNoise(1024, 3, seed + 1, 48);
      for (let i = 0; i < coarse.length; i++) {
        const v = 0.78 + (coarse[i] - 0.5) * 0.35 + (fine[i] - 0.5) * 0.45;
        img.data.set([255 * Math.min(1, v * 1.05), 214 * v, 150 * v * v, 255], i * 4);
      }
      ctx.putImageData(img, 0, 0);
    }),
  );
}

/** Tileable normal map for small waves (used by the sea). */
export function waterNormals() {
  return cached("waterNormals", () => {
    const size = 512;
    const h = fractalNoise(size, 6, 77, 8);
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d") as CanvasRenderingContext2D;
    const img = ctx.createImageData(size, size);
    const at = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)];
    const k = 6;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (at(x + 1, y) - at(x - 1, y)) * k;
        const dy = (at(x, y + 1) - at(x, y - 1)) * k;
        const len = Math.hypot(dx, dy, 1);
        img.data.set(
          [(-dx / len) * 127 + 128, (-dy / len) * 127 + 128, (1 / len) * 127 + 128, 255],
          (y * size + x) * 4,
        );
      }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  });
}

/** Limestone cliff face: layered strata with cracks and weathering. */
export function cliffTexture(seed = 91) {
  return cached(`cliff${seed}`, () =>
    canvasTexture(1024, (ctx, img) => {
      const n = fractalNoise(1024, 7, seed, 4);
      const m = fractalNoise(1024, 4, seed + 3, 16);
      for (let y = 0; y < 1024; y++) {
        for (let x = 0; x < 1024; x++) {
          const i = y * 1024 + x;
          const strata = Math.sin(y * 0.11 + n[i] * 6) * 0.5 + 0.5;
          const crack = m[i] > 0.7 ? (m[i] - 0.7) * 2.2 : 0;
          const stain = Math.max(0, n[i] - 0.62) * 0.9;
          const v = 0.66 + (n[i] - 0.5) * 0.55 + strata * 0.08 - crack - stain * 0.5;
          img.data.set(
            [200 * v + 18 - stain * 30, 190 * v + 16 - stain * 18, 166 * v + 12, 255],
            i * 4,
          );
        }
      }
      ctx.putImageData(img, 0, 0);
    }),
  );
}

/** Short turf seen from a distance. */
export function grassTexture(seed = 13) {
  return cached(`grass${seed}`, () =>
    canvasTexture(
      512,
      (ctx, img) => {
        const n = fractalNoise(512, 6, seed, 8);
        const rand = (() => {
          let s = seed;
          return () => {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 4294967296;
          };
        })();
        for (let i = 0; i < n.length; i++) {
          const v = 0.55 + (n[i] - 0.5) * 0.6 + (rand() - 0.5) * 0.25;
          img.data.set([78 * v + 10, 118 * v + 14, 48 * v + 6, 255], i * 4);
        }
        ctx.putImageData(img, 0, 0);
      },
      true,
      8,
    ),
  );
}
