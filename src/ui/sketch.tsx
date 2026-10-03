// Freehand sketching: pointer capture and smooth ink strokes (perfect-freehand).

import { getStroke } from "perfect-freehand";
import { type ReactNode, useRef } from "react";

export type ScreenPt = [number, number];

export function strokePath(points: ScreenPt[], size = 6): string {
  if (points.length < 2) return "";
  const outline = getStroke(points, {
    size,
    thinning: 0.35,
    smoothing: 0.6,
    streamline: 0.45,
    simulatePressure: true,
  });
  if (!outline.length) return "";
  const d = outline.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...outline[0], "Q"] as (string | number)[],
  );
  d.push("Z");
  return d.map((v) => (typeof v === "number" ? v.toFixed(1) : v)).join(" ");
}

/** An SVG surface you can draw one stroke on. Coordinates are in the SVG's own pixel space. */
export function SketchSurface({
  width,
  height,
  points,
  onChange,
  active,
  children,
  color = "#ff7a2f",
  ariaLabel,
}: {
  width: number;
  height: number;
  points: ScreenPt[];
  onChange: (pts: ScreenPt[]) => void;
  active: boolean;
  children?: ReactNode;
  color?: string;
  ariaLabel: string;
}) {
  const drawing = useRef(false);
  const svg = useRef<SVGSVGElement>(null);
  const toLocal = (e: React.PointerEvent): ScreenPt => {
    const r = svg.current?.getBoundingClientRect();
    if (!r) return [0, 0];
    return [((e.clientX - r.left) / r.width) * width, ((e.clientY - r.top) / r.height) * height];
  };
  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      role="img"
      aria-label={ariaLabel}
      style={{
        display: "block",
        touchAction: active ? "none" : "auto",
        cursor: active ? "crosshair" : "default",
      }}
      onPointerDown={(e) => {
        if (!active) return;
        drawing.current = true;
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
        onChange([toLocal(e)]);
      }}
      onPointerMove={(e) => {
        if (!drawing.current || !active) return;
        const p = toLocal(e);
        const last = points[points.length - 1];
        if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) > 2) onChange([...points, p]);
      }}
      onPointerUp={() => {
        drawing.current = false;
      }}
    >
      {children}
      {points.length > 1 && <path d={strokePath(points, Math.max(4, width / 160))} fill={color} />}
    </svg>
  );
}
