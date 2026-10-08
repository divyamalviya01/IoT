/**
 * Seeded pseudo-random numbers (mulberry32). The same seed always gives the
 * same sequence, so a teacher's demo and a student's run match exactly.
 */
export interface Rng {
  /** Float in [0, 1) */
  next(): number;
  /** Float in [min, max) */
  range(min: number, max: number): number;
  /** Integer in [min, max] (both inclusive) */
  int(min: number, max: number): number;
  /** True with probability p (0–1) */
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** Normally distributed value (Box–Muller) */
  normal(mean: number, sd: number): number;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (items) => items[Math.floor(next() * items.length)],
    normal: (mean, sd) => {
      const u = 1 - next(); // avoid log(0)
      const v = next();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
  };
}
