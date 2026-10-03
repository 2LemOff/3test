import katex from "katex";
import { type ReactNode, useId, useMemo } from "react";

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  id,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  id?: string;
}) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <div className="control">
      <div className="control-head">
        <label htmlFor={inputId}>{label}</label>
        <output htmlFor={inputId}>{format ? format(value) : value}</output>
      </div>
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function Readout({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="readout">
      <div className="eyebrow">{label}</div>
      <div>
        <span className="v">{value}</span>
        {unit && <span className="u">{unit}</span>}
      </div>
    </div>
  );
}

export function Readouts({ children }: { children: ReactNode }) {
  return <div className="readouts">{children}</div>;
}

/** Inline or display maths, typeset with KaTeX. */
export function TeX({ children, block = false }: { children: string; block?: boolean }) {
  const html = useMemo(
    () =>
      katex.renderToString(children, { displayMode: block, throwOnError: false, output: "html" }),
    [children, block],
  );
  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: KaTeX output for our own static strings
    <span className={block ? "tex-block" : undefined} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

export function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title?: string;
  children?: ReactNode;
}) {
  return (
    <section style={{ display: "grid", gap: 10 }}>
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      {title && <h2 style={{ fontSize: "var(--step-1)" }}>{title}</h2>}
      {children}
    </section>
  );
}

export const fmt = (v: number, d = 2) =>
  Number.isFinite(v)
    ? v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })
    : "—";
