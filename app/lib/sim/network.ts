import type { Rng } from "./random";

/** One network hop, e.g. sensor → gateway. */
export interface LinkConfig {
  /** Propagation + processing delay in milliseconds */
  latencyMs: number;
  /** Random variation added to latency, ± this many ms */
  jitterMs?: number;
  /** Chance a packet is lost on this link, 0–100 */
  lossPct: number;
  /** Link speed in kilobits per second; omit for "fast enough to ignore" */
  bandwidthKbps?: number;
}

export interface Transmission {
  delivered: boolean;
  /** Total time on this link, including serialization */
  delayMs: number;
  serializationMs: number;
}

/** Time to push `bytes` onto a link of `kbps` kilobits per second. */
export function serializationDelayMs(bytes: number, kbps: number | undefined): number {
  if (!kbps || kbps <= 0) return 0;
  // 1 kbps = 1 bit per millisecond.
  return (bytes * 8) / kbps;
}

/** Sends one packet over one link. */
export function transmit(link: LinkConfig, bytes: number, rng: Rng): Transmission {
  const serializationMs = serializationDelayMs(bytes, link.bandwidthKbps);
  const jitter = link.jitterMs ? rng.range(-link.jitterMs, link.jitterMs) : 0;
  const delayMs = Math.max(0, link.latencyMs + jitter) + serializationMs;
  const delivered = !rng.chance(clampPct(link.lossPct) / 100);
  return { delivered, delayMs, serializationMs };
}

export interface PathTransmission {
  delivered: boolean;
  /** Time until delivery, or until the packet was lost */
  delayMs: number;
  /** Delay on each hop that the packet reached */
  hopDelays: number[];
  /** Index of the hop where the packet was lost, or null */
  lostAtHop: number | null;
}

/** Sends one packet across several links in a row (store and forward). */
export function transmitPath(links: LinkConfig[], bytes: number, rng: Rng): PathTransmission {
  const hopDelays: number[] = [];
  let delayMs = 0;
  for (let i = 0; i < links.length; i++) {
    const hop = transmit(links[i], bytes, rng);
    hopDelays.push(hop.delayMs);
    delayMs += hop.delayMs;
    if (!hop.delivered) {
      return { delivered: false, delayMs, hopDelays, lostAtHop: i };
    }
  }
  return { delivered: true, delayMs, hopDelays, lostAtHop: null };
}

/** Probability a packet survives every link: the product of (1 − loss). */
export function pathDeliveryProbability(links: LinkConfig[]): number {
  return links.reduce((p, link) => p * (1 - clampPct(link.lossPct) / 100), 1);
}

function clampPct(value: number) {
  return Math.min(100, Math.max(0, value));
}
