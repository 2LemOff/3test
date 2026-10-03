import { describe, expect, it } from "vitest";
import { checkNumeric, checkText, parseNumber } from "./check";
import { newDeck, previewIntervals, Rating, review, simulateDays } from "./scheduler";

const DAY = 86400000;

describe("scheduler", () => {
  const t0 = new Date("2026-10-01T09:00:00Z");

  it("intervals grow with each Good and collapse after Again", () => {
    let card = newDeck(["a"], t0).a;
    let now = t0;
    const gaps: number[] = [];
    for (let i = 0; i < 6; i++) {
      const next = review(card, Rating.Good, now);
      gaps.push(next.due.getTime() - now.getTime());
      card = next;
      now = next.due;
    }
    for (let i = 2; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThan(gaps[i - 1]);
    expect(gaps[gaps.length - 1]).toBeGreaterThan(20 * DAY);

    const lapsed = review(card, Rating.Again, now);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.due.getTime() - now.getTime()).toBeLessThan(DAY);
  });

  it("button previews are ordered Again < Hard < Good < Easy", () => {
    const card = review(newDeck(["a"], t0).a, Rating.Good, t0);
    const p = previewIntervals(card, card.due);
    expect(p[Rating.Again]).toBeLessThan(p[Rating.Hard]);
    expect(p[Rating.Hard]).toBeLessThanOrEqual(p[Rating.Good]);
    expect(p[Rating.Good]).toBeLessThan(p[Rating.Easy]);
  });

  it("daily load falls as cards are learned", () => {
    const deck = newDeck(
      Array.from({ length: 15 }, (_, i) => `c${i}`),
      t0,
    );
    const { reviewsPerDay } = simulateDays(deck, t0, 30);
    const firstWeek = reviewsPerDay.slice(0, 3).reduce((a, b) => a + b, 0);
    const lastWeek = reviewsPerDay.slice(-3).reduce((a, b) => a + b, 0);
    expect(lastWeek).toBeLessThan(firstWeek);
  });
});

describe("answer checking", () => {
  it("parses common ways of typing numbers", () => {
    expect(parseNumber("9.81")).toBe(9.81);
    expect(parseNumber("9,81 m/s²")).toBe(9.81);
    expect(parseNumber("3e8")).toBe(3e8);
    expect(parseNumber("3×10^8")).toBeCloseTo(3e8);
    expect(parseNumber("−4.5")).toBe(-4.5);
    expect(parseNumber("abc")).toBeNull();
  });

  it("accepts answers within 2% and rejects others", () => {
    expect(checkNumeric("19.6", 19.62)).toBe(true);
    expect(checkNumeric("20.0", 19.62)).toBe(true);
    expect(checkNumeric("20.2", 19.62)).toBe(false);
    expect(checkNumeric("", 19.62)).toBe(false);
  });

  it("matches short text answers loosely", () => {
    expect(checkText("Newtons", ["newtons", "N"])).toBe(true);
    expect(checkText(" n ", ["newtons", "N"])).toBe(true);
    expect(checkText("joules", ["newtons", "N"])).toBe(false);
  });
});
