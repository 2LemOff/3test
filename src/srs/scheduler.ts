// Spaced repetition with FSRS (the algorithm Anki now uses by default), via ts-fsrs.

import { type Card, createEmptyCard, fsrs, type Grade, Rating, State } from "ts-fsrs";

export type { Card, Grade };
export { Rating, State };

const scheduler = fsrs({ enable_fuzz: false, request_retention: 0.9 });

export type DeckState = Record<string, Card>;

export function newDeck(ids: string[], now: Date): DeckState {
  return Object.fromEntries(ids.map((id) => [id, createEmptyCard(now)]));
}

export function review(card: Card, rating: Grade, now: Date): Card {
  return scheduler.next(card, now, rating).card;
}

/** Interval each button would give, for showing on the buttons. */
export function previewIntervals(card: Card, now: Date): Record<Grade, number> {
  const p = scheduler.repeat(card, now);
  const ms = (g: Grade) => p[g].card.due.getTime() - now.getTime();
  return {
    [Rating.Again]: ms(Rating.Again),
    [Rating.Hard]: ms(Rating.Hard),
    [Rating.Good]: ms(Rating.Good),
    [Rating.Easy]: ms(Rating.Easy),
  } as Record<Grade, number>;
}

export function retrievability(card: Card, now: Date): number {
  if (card.state === State.New) return 0;
  return scheduler.get_retrievability(card, now, false);
}

export function dueIds(deck: DeckState, now: Date): string[] {
  return Object.entries(deck)
    .filter(([, c]) => c.due.getTime() <= now.getTime())
    .sort(([, a], [, b]) => a.due.getTime() - b.due.getTime())
    .map(([id]) => id);
}

export function formatInterval(ms: number): string {
  const min = ms / 60000;
  if (min < 60) return `${Math.max(1, Math.round(min))} min`;
  const h = min / 60;
  if (h < 24) return `${Math.round(h)} h`;
  const d = h / 24;
  if (d < 31) return `${Math.round(d)} d`;
  const mo = d / 30.4;
  if (mo < 12) return `${mo.toFixed(mo < 3 ? 1 : 0)} mo`;
  return `${(d / 365).toFixed(1)} y`;
}

/**
 * Simulate a learner who reviews every due card each day and answers "Good" with
 * probability equal to the card's retrievability (otherwise "Again").
 * Returns per-day review counts and the deck's interval spread at the end.
 */
export function simulateDays(deck: DeckState, start: Date, days: number, seed = 7) {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  const state: DeckState = { ...deck };
  const reviewsPerDay: number[] = [];
  for (let d = 0; d < days; d++) {
    const now = new Date(start.getTime() + d * 86400000 + 9 * 3600000);
    let count = 0;
    // Learning steps are minutes apart, so loop until nothing is due later today.
    for (let pass = 0; pass < 6; pass++) {
      const t = new Date(now.getTime() + pass * 15 * 60000);
      for (const id of dueIds(state, t)) {
        const c = state[id];
        const p = c.state === State.New ? 0.7 : retrievability(c, t);
        state[id] = review(c, rand() < p ? Rating.Good : Rating.Again, t);
        count++;
      }
    }
    reviewsPerDay.push(count);
  }
  return { reviewsPerDay, state };
}
