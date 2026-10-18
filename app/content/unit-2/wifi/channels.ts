/**
 * 2.4 GHz Wi-Fi channels and how much nearby access points get in each
 * other's way.
 *
 * Channel n is centred on 2407 + 5n MHz (channel 14, Japan only, on 2484).
 * A channel is about 22 MHz wide (older 802.11b) or 20 MHz (802.11g/n), so
 * channels closer than 5 apart overlap.
 *
 * Two kinds of trouble:
 * - Same channel: the access points hear each other and take turns. They
 *   share the airtime, which is slower but orderly (penalty 1).
 * - Partly overlapping channels: they cannot decode each other, so they do
 *   not wait, and their signals corrupt each other. This is worse
 *   (penalty 2 × the overlap).
 */

export const CHANNELS = Array.from({ length: 13 }, (_, i) => i + 1);
export type Width = 20 | 22;

export function centreMHz(ch: number): number {
  return ch === 14 ? 2484 : 2407 + 5 * ch;
}

/** Share of a channel's width that the other channel covers, 0–1. */
export function overlap(a: number, b: number, width: Width): number {
  return Math.max(0, 1 - Math.abs(centreMHz(a) - centreMHz(b)) / width);
}

/** Trouble between two access points that can hear each other. */
export function pairPenalty(a: number, b: number, width: Width): number {
  if (a === b) return 1;
  return 2 * overlap(a, b, width);
}

/**
 * How strongly each pair of access points hears each other. Three are close
 * together (all neighbours). Four sit on a 2 × 2 grid: side neighbours
 * count fully, diagonal ones (farther apart) count 0.3.
 */
export function pairWeight(count: number, i: number, j: number): number {
  if (count <= 3) return 1;
  const row = (k: number) => Math.floor(k / 2);
  const col = (k: number) => k % 2;
  const diagonal = row(i) !== row(j) && col(i) !== col(j);
  return diagonal ? 0.3 : 1;
}

export interface PairReport {
  a: number;
  b: number;
  kind: "clear" | "sharing" | "clashing";
  penalty: number;
}

export interface InterferenceReport {
  total: number;
  pairs: PairReport[];
}

export function interference(channels: number[], width: Width): InterferenceReport {
  const pairs: PairReport[] = [];
  let total = 0;
  for (let i = 0; i < channels.length; i++) {
    for (let j = i + 1; j < channels.length; j++) {
      const p = pairPenalty(channels[i], channels[j], width) * pairWeight(channels.length, i, j);
      const kind = channels[i] === channels[j] ? "sharing" : p > 0 ? "clashing" : "clear";
      pairs.push({ a: i, b: j, kind, penalty: p });
      total += p;
    }
  }
  return { total: Math.round(total * 100) / 100, pairs };
}

/** The best channel plan for this many access points, found by trying every combination. */
export function bestPlan(count: number, width: Width): { channels: number[]; total: number } {
  let best = { channels: Array(count).fill(1) as number[], total: Infinity };
  const plan = Array(count).fill(1) as number[];
  const visit = (k: number) => {
    if (k === count) {
      const total = interference(plan, width).total;
      if (total < best.total) best = { channels: [...plan], total };
      return;
    }
    for (const ch of CHANNELS) {
      plan[k] = ch;
      visit(k + 1);
    }
  };
  visit(0);
  return best;
}
