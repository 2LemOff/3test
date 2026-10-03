// Small SVG line chart: one shared scale, recessive grid, 2px lines, hover crosshair + tooltip.

import { useId, useMemo, useState } from "react";

export interface Series {
  name: string;
  /** CSS colour, normally a series token such as var(--series-1). */
  color: string;
  points: [number, number][];
  dashed?: boolean;
}

function niceTicks(min: number, max: number, count = 5): number[] {
  const span = max - min || 1;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? mag * 10;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step)
    out.push(Number(v.toFixed(10)));
  return out;
}

export function LineChart({
  series,
  xLabel,
  yLabel,
  xDomain,
  yDomain,
  height = 200,
  marker,
  title,
  formatX = (v) => v.toFixed(1),
  formatY = (v) => v.toFixed(1),
}: {
  series: Series[];
  xLabel: string;
  yLabel: string;
  xDomain?: [number, number];
  yDomain?: [number, number];
  height?: number;
  /** Vertical marker at this x (e.g. the current time). */
  marker?: number;
  title?: string;
  formatX?: (v: number) => string;
  formatY?: (v: number) => string;
}) {
  const id = useId();
  const W = 320;
  const H = height;
  const m = { l: 40, r: 10, t: 10, b: 32 };
  const all = series.flatMap((s) => s.points);
  const [x0, x1] = xDomain ?? [
    Math.min(...all.map((p) => p[0])),
    Math.max(...all.map((p) => p[0])),
  ];
  const [y0, y1] = yDomain ?? [
    Math.min(0, ...all.map((p) => p[1])),
    Math.max(...all.map((p) => p[1])) * 1.08,
  ];
  const sx = (x: number) => m.l + ((x - x0) / (x1 - x0 || 1)) * (W - m.l - m.r);
  const sy = (y: number) => H - m.b - ((y - y0) / (y1 - y0 || 1)) * (H - m.t - m.b);
  const xt = useMemo(() => niceTicks(x0, x1, 5), [x0, x1]);
  const yt = useMemo(() => niceTicks(y0, y1, 4), [y0, y1]);
  const [hover, setHover] = useState<number | null>(null);

  const valueAt = (s: Series, x: number) => {
    const p = s.points;
    if (!p.length || x < p[0][0] || x > p[p.length - 1][0]) return null;
    let i = 1;
    while (i < p.length && p[i][0] < x) i++;
    const a = p[i - 1];
    const b = p[Math.min(i, p.length - 1)];
    const f = b[0] === a[0] ? 0 : (x - a[0]) / (b[0] - a[0]);
    return a[1] + f * (b[1] - a[1]);
  };

  return (
    <figure style={{ margin: 0, display: "grid", gap: 6 }}>
      {title && <figcaption className="eyebrow">{title}</figcaption>}
      {series.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            fontSize: "var(--step--1)",
            color: "var(--fg-2)",
          }}
        >
          {series.map((s) => (
            <span key={s.name} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <svg width="18" height="6" aria-hidden="true">
                <line
                  x1="0"
                  y1="3"
                  x2="18"
                  y2="3"
                  stroke={s.color}
                  strokeWidth="2"
                  strokeDasharray={s.dashed ? "4 3" : undefined}
                />
              </svg>
              {s.name}
            </span>
          ))}
        </div>
      )}
      <div style={{ position: "relative" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          role="img"
          aria-labelledby={`${id}-desc`}
          style={{ display: "block", touchAction: "none" }}
          onPointerMove={(e) => {
            const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
            const px = ((e.clientX - r.left) / r.width) * W;
            const x = x0 + ((px - m.l) / (W - m.l - m.r)) * (x1 - x0);
            setHover(x >= x0 && x <= x1 ? x : null);
          }}
          onPointerLeave={() => setHover(null)}
        >
          <desc id={`${id}-desc`}>
            {yLabel} against {xLabel}
          </desc>
          {yt.map((v) => (
            <g key={`y${v}`}>
              <line
                x1={m.l}
                x2={W - m.r}
                y1={sy(v)}
                y2={sy(v)}
                stroke="var(--line)"
                strokeWidth={v === 0 ? 1.2 : 0.6}
              />
              <text
                x={m.l - 6}
                y={sy(v)}
                dy="0.32em"
                textAnchor="end"
                fontSize="10"
                fill="var(--fg-3)"
                fontFamily="var(--font-mono)"
              >
                {formatY(v)}
              </text>
            </g>
          ))}
          {xt.map((v) => (
            <text
              key={`x${v}`}
              x={sx(v)}
              y={H - m.b + 14}
              textAnchor="middle"
              fontSize="10"
              fill="var(--fg-3)"
              fontFamily="var(--font-mono)"
            >
              {formatX(v)}
            </text>
          ))}
          <text
            x={(m.l + W - m.r) / 2}
            y={H - 4}
            textAnchor="middle"
            fontSize="10.5"
            fill="var(--fg-2)"
          >
            {xLabel}
          </text>
          <text
            x={10}
            y={(m.t + H - m.b) / 2}
            transform={`rotate(-90 10 ${(m.t + H - m.b) / 2})`}
            textAnchor="middle"
            fontSize="10.5"
            fill="var(--fg-2)"
          >
            {yLabel}
          </text>
          {series.map((s) => (
            <polyline
              key={s.name}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={s.dashed ? "5 4" : undefined}
              points={s.points
                .map(
                  (p) =>
                    `${sx(p[0]).toFixed(1)},${sy(Math.max(y0, Math.min(y1, p[1]))).toFixed(1)}`,
                )
                .join(" ")}
            />
          ))}
          {marker !== undefined && marker >= x0 && marker <= x1 && (
            <line
              x1={sx(marker)}
              x2={sx(marker)}
              y1={m.t}
              y2={H - m.b}
              stroke="var(--fg-3)"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
          )}
          {hover !== null && (
            <g>
              <line
                x1={sx(hover)}
                x2={sx(hover)}
                y1={m.t}
                y2={H - m.b}
                stroke="var(--fg-2)"
                strokeWidth={1}
              />
              {series.map((s) => {
                const v = valueAt(s, hover);
                return v === null ? null : (
                  <circle
                    key={s.name}
                    cx={sx(hover)}
                    cy={sy(v)}
                    r={4}
                    fill={s.color}
                    stroke="var(--surface)"
                    strokeWidth={2}
                  />
                );
              })}
            </g>
          )}
        </svg>
        {hover !== null && (
          <div
            role="status"
            style={{
              position: "absolute",
              top: 6,
              left: `${Math.min(70, Math.max(8, ((sx(hover) - m.l) / (W - m.l - m.r)) * 100))}%`,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: "6px 9px",
              fontSize: 12,
              boxShadow: "var(--shadow)",
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            <div className="mono" style={{ color: "var(--fg-3)" }}>
              {xLabel.split(" (")[0]} {formatX(hover)}
            </div>
            {series.map((s) => {
              const v = valueAt(s, hover);
              return v === null ? null : (
                <div key={s.name} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span className="status-dot" style={{ background: s.color, margin: 0 }} />
                  <span style={{ color: "var(--fg-2)" }}>{s.name}</span>
                  <span className="mono" style={{ marginLeft: "auto", color: "var(--fg)" }}>
                    {formatY(v)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </figure>
  );
}
