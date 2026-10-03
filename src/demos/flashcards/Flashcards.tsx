import { Fragment, useMemo, useState } from "react";
import { checkNumeric, checkText } from "../../srs/check";
import { type CardDef, DECK, plainText, STYLE_LABEL } from "../../srs/deck";
import {
  type Card,
  type DeckState,
  dueIds,
  formatInterval,
  type Grade,
  newDeck,
  previewIntervals,
  Rating,
  retrievability,
  review,
  State,
  simulateDays,
} from "../../srs/scheduler";
import { STILL } from "../../studio/clock";
import { Studio } from "../../studio/Studio";
import { fmt, Section, TeX } from "../../ui/controls";
import { DemoShell } from "../../ui/DemoShell";
import { LineChart } from "../../ui/LineChart";
import { DeckScene } from "./DeckScene";

const KEY = "physics-lab:flashcards";
const DAY = 86400000;

function load(start: Date): { deck: DeckState; now: number } {
  const fresh = {
    deck: newDeck(
      DECK.map((c) => c.id),
      start,
    ),
    now: start.getTime(),
  };
  if (STILL) return fresh;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh;
    const saved = JSON.parse(raw) as { deck: Record<string, Card>; now: number };
    const deck: DeckState = { ...fresh.deck };
    for (const [id, c] of Object.entries(saved.deck)) {
      if (deck[id])
        deck[id] = {
          ...c,
          due: new Date(c.due),
          last_review: c.last_review ? new Date(c.last_review) : undefined,
        };
    }
    return { deck, now: saved.now };
  } catch {
    return fresh;
  }
}

/** Text with $maths$ and **bold**. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\$[^$]*\$|\*\*[^*]*\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("$") ? (
          <TeX key={i}>{p.slice(1, -1)}</TeX>
        ) : p.startsWith("**") ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

export function Flashcards() {
  const [start] = useState(() => new Date());
  const [{ deck, now }, setState] = useState(() => load(start));
  const [revealed, setRevealed] = useState(STILL);
  const [typed, setTyped] = useState("");
  const [autoGrade, setAutoGrade] = useState<boolean | null>(null);
  const [sim, setSim] = useState<null | ReturnType<typeof simulateDays>>(null);
  const [reviewsToday, setReviewsToday] = useState(0);

  const nowDate = new Date(now);
  const due = dueIds(deck, nowDate);
  const currentId = due[0];
  const def: CardDef | undefined = DECK.find((c) => c.id === currentId);
  const card = currentId ? deck[currentId] : undefined;
  const face = useMemo(() => (def ? def.make(card?.reps ?? 0) : null), [def, card?.reps]);
  const intervals = card ? previewIntervals(card, nowDate) : null;
  const dayNumber = Math.floor((now - start.getTime()) / DAY) + 1;

  const persist = (d: DeckState, n: number) => {
    setState({ deck: d, now: n });
    try {
      localStorage.setItem(KEY, JSON.stringify({ deck: d, now: n }));
    } catch {
      /* storage unavailable: progress lasts for this visit only */
    }
  };

  const grade = (g: Grade) => {
    if (!currentId || !card) return;
    // Learning steps are minutes apart; move the clock on a minute so they come back in this session.
    persist({ ...deck, [currentId]: review(card, g, nowDate) }, now + 60000);
    setRevealed(false);
    setTyped("");
    setAutoGrade(null);
    setReviewsToday((r) => r + 1);
  };

  const submitTyped = () => {
    if (!face?.check) return;
    const ok =
      face.check.kind === "numeric"
        ? checkNumeric(typed, face.check.answer, face.check.tolerance ?? 0.02)
        : checkText(typed, face.check.accepted);
    setAutoGrade(ok);
    setRevealed(true);
  };

  const cards = Object.values(deck);
  const learned = cards.filter((c) => c.state === State.Review).length;
  const seen = cards.filter((c) => c.state !== State.New);
  const retention = seen.length
    ? seen.reduce((a, c) => a + retrievability(c, nowDate), 0) / seen.length
    : 0;
  const nextDue = cards
    .filter((c) => c.due.getTime() > now)
    .sort((a, b) => a.due.getTime() - b.due.getTime())[0];

  return (
    <DemoShell
      title="Flashcards · spaced repetition"
      viewport={(photo) => (
        <Studio
          camera={{ position: [0.25, 2.95, 2.35], target: [0.2, 0.72, 0.12], fov: 34 }}
          bloom={0.15}
          bloomThreshold={1.4}
          {...photo}
        >
          <DeckScene
            front={face ? plainText(face.front) : "All done for now. Come back when cards are due."}
            back={face ? plainText(face.back) : ""}
            tag={def ? `${STYLE_LABEL[def.style]} · ${def.topic}` : "Deck"}
            revealed={revealed}
            remaining={due.length}
          />
        </Studio>
      )}
      panel={
        <>
          <Section eyebrow={`Mechanics deck · day ${dayNumber}`} title="Recall first, then check">
            <div className="prose">
              <p>
                Answer from memory before you flip the card. Then rate how hard it was: the
                scheduler (FSRS, the algorithm Anki uses) brings each card back just before you'd
                forget it.
              </p>
            </div>
          </Section>
          <div className="readouts">
            <div className="readout">
              <div className="eyebrow">Due now</div>
              <div className="v">{due.length}</div>
            </div>
            <div className="readout">
              <div className="eyebrow">Learned</div>
              <div className="v">
                {learned}
                <span className="u">/ {cards.length}</span>
              </div>
            </div>
            <div className="readout">
              <div className="eyebrow">Recall odds</div>
              <div className="v">{seen.length ? `${Math.round(retention * 100)}%` : "—"}</div>
            </div>
          </div>

          {def && face ? (
            <div className="callout" style={{ gap: 10 }}>
              <div className="eyebrow">
                {STYLE_LABEL[def.style]} · {def.topic}
              </div>
              <div style={{ fontSize: "var(--step-1)", color: "var(--fg)" }}>
                <Rich text={face.front} />
              </div>
              {def.visual && <CardVisual kind={def.visual} revealed={revealed} />}
              {face.check && !revealed && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (typed.trim()) submitTyped();
                  }}
                  style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                >
                  <label htmlFor="card-answer" className="eyebrow" style={{ width: "100%" }}>
                    Type your answer{face.check.kind === "numeric" ? ` (${face.check.unit})` : ""}
                  </label>
                  <input
                    id="card-answer"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    inputMode={face.check.kind === "numeric" ? "decimal" : "text"}
                    autoComplete="off"
                    style={{
                      flex: "1 1 140px",
                      minHeight: 40,
                      padding: "0 12px",
                      borderRadius: 8,
                      border: "1px solid var(--line)",
                      background: "var(--surface)",
                    }}
                  />
                  <button type="submit" className="btn" disabled={!typed.trim()}>
                    Check
                  </button>
                </form>
              )}
              {revealed ? (
                <div
                  style={{
                    borderTop: "1px dashed var(--line)",
                    paddingTop: 10,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  {autoGrade !== null && (
                    <strong style={{ color: autoGrade ? "var(--good)" : "var(--bad)" }}>
                      <span
                        className="status-dot"
                        style={{ background: autoGrade ? "var(--good)" : "var(--bad)" }}
                        aria-hidden="true"
                      />
                      {autoGrade ? "Correct" : `Not quite: you wrote “${typed}”`}
                    </strong>
                  )}
                  <div style={{ color: "var(--fg)" }}>
                    <Rich text={face.back} />
                  </div>
                </div>
              ) : (
                <button type="button" className="btn primary" onClick={() => setRevealed(true)}>
                  Show answer
                </button>
              )}
              {revealed && intervals && (
                <div className="grades" role="group" aria-label="How well did you remember?">
                  {(
                    [
                      [Rating.Again, "Again"],
                      [Rating.Hard, "Hard"],
                      [Rating.Good, "Good"],
                      [Rating.Easy, "Easy"],
                    ] as [Grade, string][]
                  ).map(([g, label]) => (
                    <button
                      key={label}
                      type="button"
                      className={`btn${(autoGrade === true && g === Rating.Good) || (autoGrade === false && g === Rating.Again) ? " primary" : ""}`}
                      onClick={() => grade(g)}
                    >
                      <span>{label}</span>
                      <span
                        className="mono"
                        style={{ fontSize: 11, fontWeight: 400, opacity: 0.8 }}
                      >
                        {formatInterval(intervals[g])}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="callout good" role="status">
              <strong>Nothing due right now</strong>
              <span>
                {reviewsToday} reviews done. Next card due in{" "}
                {nextDue ? formatInterval(nextDue.due.getTime() - now) : "—"}.
              </span>
            </div>
          )}

          <div className="seg">
            <button
              type="button"
              className="btn"
              onClick={() => {
                persist(deck, now + DAY);
                setRevealed(false);
                setReviewsToday(0);
              }}
            >
              Skip to tomorrow
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                persist(
                  newDeck(
                    DECK.map((c) => c.id),
                    start,
                  ),
                  start.getTime(),
                );
                setRevealed(false);
                setSim(null);
              }}
            >
              Reset deck
            </button>
          </div>

          <Section eyebrow="How spacing works" title="Simulate a month of daily reviews">
            <div className="prose">
              <p>
                A simulated student reviews whatever is due each day and remembers each card with
                the odds FSRS predicts. The daily workload drops as intervals stretch out.
              </p>
            </div>
            <button
              type="button"
              className="btn"
              onClick={() =>
                setSim(
                  simulateDays(
                    newDeck(
                      DECK.map((c) => c.id),
                      start,
                    ),
                    start,
                    30,
                  ),
                )
              }
            >
              Simulate 30 days
            </button>
            {sim && (
              <>
                <LineChart
                  title="Reviews per day"
                  series={[
                    {
                      name: "Reviews",
                      color: "var(--series-1)",
                      points: sim.reviewsPerDay.map((v, i) => [i + 1, v]),
                    },
                  ]}
                  xLabel="Day"
                  yLabel="Reviews"
                  formatX={(v) => v.toFixed(0)}
                  formatY={(v) => v.toFixed(0)}
                  height={170}
                />
                <p style={{ color: "var(--fg-2)", fontSize: "var(--step--1)" }}>
                  After 30 days the median gap between reviews is{" "}
                  <strong>
                    {fmt(
                      [...Object.values(sim.state)]
                        .map((c) => c.scheduled_days)
                        .sort((a, b) => a - b)[Math.floor(cards.length / 2)],
                      0,
                    )}{" "}
                    days
                  </strong>
                  .
                </p>
              </>
            )}
          </Section>
        </>
      }
    />
  );
}

function CardVisual({
  kind,
  revealed,
}: {
  kind: NonNullable<CardDef["visual"]>;
  revealed: boolean;
}) {
  const box = { width: "100%", maxWidth: 300, height: "auto", display: "block" } as const;
  const axis = "var(--fg-3)";
  const ink = "var(--series-1)";
  if (kind === "vt-throw-up" || kind === "xt-constant") {
    if (!revealed) {
      return (
        <svg viewBox="0 0 300 150" style={box} role="img" aria-label="Empty axes to sketch on">
          <line
            x1="30"
            y1={kind === "vt-throw-up" ? 75 : 130}
            x2="290"
            y2={kind === "vt-throw-up" ? 75 : 130}
            stroke={axis}
          />
          <line x1="30" y1="10" x2="30" y2="140" stroke={axis} />
          <text
            x="285"
            y={kind === "vt-throw-up" ? 90 : 145}
            fontSize="12"
            fill={axis}
            textAnchor="end"
          >
            t
          </text>
          <text x="14" y="20" fontSize="12" fill={axis}>
            {kind === "vt-throw-up" ? "v" : "x"}
          </text>
        </svg>
      );
    }
    return (
      <svg
        viewBox="0 0 300 150"
        style={box}
        role="img"
        aria-label={
          kind === "vt-throw-up"
            ? "Straight line falling through zero"
            : "Straight line rising from the origin"
        }
      >
        <line
          x1="30"
          y1={kind === "vt-throw-up" ? 75 : 130}
          x2="290"
          y2={kind === "vt-throw-up" ? 75 : 130}
          stroke={axis}
        />
        <line x1="30" y1="10" x2="30" y2="140" stroke={axis} />
        {kind === "vt-throw-up" ? (
          <>
            <line
              x1="30"
              y1="20"
              x2="270"
              y2="130"
              stroke={ink}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="150" cy="75" r="4" fill={ink} />
            <text x="158" y="68" fontSize="11" fill="var(--fg-2)">
              top: v = 0 for an instant
            </text>
          </>
        ) : (
          <line
            x1="30"
            y1="130"
            x2="270"
            y2="25"
            stroke={ink}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )}
      </svg>
    );
  }
  if (kind === "fbd-incline") {
    return (
      <svg
        viewBox="0 0 300 170"
        style={box}
        role="img"
        aria-label="Block on a slope with force arrows"
      >
        <defs>
          <marker
            id="arr"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0 0L10 5L0 10z" fill="var(--fg)" />
          </marker>
        </defs>
        <polygon points="20,160 280,160 280,40" fill="var(--surface-2)" stroke={axis} />
        <g transform="translate(170 105) rotate(-24.8)">
          <rect x="-28" y="-30" width="56" height="30" fill="var(--series-2)" opacity="0.85" />
          <line
            x1="0"
            y1="-15"
            x2="0"
            y2="-78"
            stroke="var(--fg)"
            strokeWidth="2"
            markerEnd="url(#arr)"
          />
          <line
            x1="0"
            y1="-15"
            x2="-66"
            y2="-15"
            stroke="var(--fg)"
            strokeWidth="2"
            markerEnd="url(#arr)"
          />
        </g>
        <line
          x1="170"
          y1="92"
          x2="170"
          y2="158"
          stroke="var(--fg)"
          strokeWidth="2"
          markerEnd="url(#arr)"
        />
        <text x="178" y="150" fontSize="12" fill="var(--fg)">
          weight
        </text>
        <text x="96" y="100" fontSize="12" fill="var(--fg)">
          friction
        </text>
        {revealed ? (
          <text x="148" y="22" fontSize="12" fill="var(--good)" fontWeight="600">
            normal reaction
          </text>
        ) : (
          <rect x="140" y="8" width="70" height="20" rx="4" fill="var(--fg)" />
        )}
      </svg>
    );
  }
  // two balls
  return (
    <svg viewBox="0 0 300 160" style={box} role="img" aria-label="Two balls leaving a table">
      <rect x="10" y="40" width="90" height="10" fill="var(--fg-3)" />
      <line x1="10" y1="150" x2="290" y2="150" stroke={axis} />
      {revealed ? (
        <>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <g key={i} opacity={0.35 + i * 0.13}>
              <circle cx={100} cy={46 + i * i * 2.8} r="6" fill="var(--series-1)" />
              <circle cx={100 + i * 30} cy={46 + i * i * 2.8} r="6" fill="var(--series-2)" />
            </g>
          ))}
          <text x="150" y="30" fontSize="11" fill="var(--fg-2)">
            equal heights at equal times
          </text>
        </>
      ) : (
        <>
          <circle cx="100" cy="34" r="6" fill="var(--series-1)" />
          <circle cx="86" cy="34" r="6" fill="var(--series-2)" />
          <text x="120" y="30" fontSize="11" fill="var(--fg-2)">
            drop one, push one
          </text>
        </>
      )}
    </svg>
  );
}
