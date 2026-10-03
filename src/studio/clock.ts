// Simulation time. In the browser it follows the real frame time; in recording mode
// (local only, ?record in the URL) every frame advances by exactly 1/fps, so videos are smooth
// even when software rendering is slow.

import { useFrame } from "@react-three/fiber";

const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
export const RECORDING = params?.has("record") ?? false;
export const RECORD_FPS = Number(params?.get("fps") ?? 30);
export const STILL = params?.has("still") ?? false;

/** useFrame with a clamped, or fixed when recording, time step in seconds. */
export function useSimFrame(cb: (dt: number, elapsed: number) => void, priority = 0) {
  useFrame((state, delta) => {
    const dt = RECORDING ? 1 / RECORD_FPS : Math.min(delta, 1 / 20);
    cb(dt, state.clock.elapsedTime);
  }, priority);
}
