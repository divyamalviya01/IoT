/**
 * Lab L03: where should IoT data be processed? A simple, illustrative model of
 * response time and internet bandwidth for edge, fog and cloud processing.
 *
 * Numbers are typical values chosen for teaching, not measurements:
 * - round trip: edge 2 ms, fog 10 ms, cloud 80 ms
 * - processing: slower at the edge, fastest in the cloud
 * - queueing: service time ÷ (1 − utilisation), like a single checkout queue
 * - upstream data: the cloud receives raw data; fog sends summaries; edge sends results
 */

export type Tier = "edge" | "fog" | "cloud";
export const TIERS: Tier[] = ["edge", "fog", "cloud"];

export interface TierParams {
  label: string;
  /** Network round trip from a device to this tier and back, ms */
  rttMs: number;
  /** Time to process one message when idle, ms */
  serviceMs: number;
  /** Messages per second this tier can process */
  capacityPerSec: number;
  /** Share of raw data that still has to cross the internet uplink */
  upstreamShare: number;
}

export const TIER_PARAMS: Record<Tier, TierParams> = {
  edge: { label: "Edge", rttMs: 2, serviceMs: 2, capacityPerSec: 1000, upstreamShare: 0.02 },
  fog: { label: "Fog", rttMs: 10, serviceMs: 3, capacityPerSec: 2000, upstreamShare: 0.1 },
  cloud: { label: "Cloud", rttMs: 80, serviceMs: 1, capacityPerSec: 100_000, upstreamShare: 1 },
};

/** Utilisation at or above this counts as overloaded: the queue grows without limit. */
export const OVERLOAD = 0.95;

export interface ScenarioPreset {
  id: string;
  title: string;
  story: string;
  devices: number;
  /** Raw data each device produces, kbps */
  dataKbps: number;
  /** Messages (decisions needed) per second per device */
  messagesPerSec: number;
  /** Longest acceptable response time, ms */
  deadlineMs: number;
  uplinkMbps: number;
}

export const SCENARIOS: ScenarioPreset[] = [
  {
    id: "braking",
    title: "Car braking",
    story: "A car's sensors must decide to brake within 10 ms.",
    devices: 1,
    dataKbps: 500,
    messagesPerSec: 100,
    deadlineMs: 10,
    uplinkMbps: 20,
  },
  {
    id: "vibration",
    title: "Factory vibration",
    story: "50 machines report vibration; a fault must be caught within 50 ms.",
    devices: 50,
    dataKbps: 100,
    messagesPerSec: 10,
    deadlineMs: 50,
    uplinkMbps: 50,
  },
  {
    id: "cctv",
    title: "CCTV people count",
    story: "20 cameras count people at a station; counts are needed within 200 ms.",
    devices: 20,
    dataKbps: 2000,
    messagesPerSec: 5,
    deadlineMs: 200,
    uplinkMbps: 20,
  },
  {
    id: "energy",
    title: "Monthly energy report",
    story: "200 smart meters send a reading every minute for a monthly report.",
    devices: 200,
    dataKbps: 0.1,
    messagesPerSec: 1 / 60,
    deadlineMs: 3_600_000,
    uplinkMbps: 10,
  },
];

export interface Workload {
  devices: number;
  dataKbps: number;
  messagesPerSec: number;
  uplinkMbps: number;
}

export interface TierResult {
  tier: Tier;
  /** Response time in ms, or null when overloaded */
  latencyMs: number | null;
  /** Why the tier cannot keep up, if it cannot */
  overload: "processing" | "uplink" | null;
  utilisation: number;
  uplinkUtilisation: number;
  /** Data leaving the site over the internet, Mbps */
  upstreamMbps: number;
  /** Data sent over the internet per day, GB */
  gbPerDay: number;
}

export function evaluate(tier: Tier, w: Workload): TierResult {
  const p = TIER_PARAMS[tier];
  const messageRate = w.devices * w.messagesPerSec;
  const utilisation = messageRate / p.capacityPerSec;
  const upstreamMbps = (w.devices * w.dataKbps * p.upstreamShare) / 1000;
  const uplinkUtilisation = upstreamMbps / w.uplinkMbps;
  const gbPerDay = (upstreamMbps * 86_400) / 8 / 1000;

  let overload: TierResult["overload"] = null;
  if (utilisation >= OVERLOAD) overload = "processing";
  else if (tier === "cloud" && uplinkUtilisation >= OVERLOAD) overload = "uplink";

  let latencyMs: number | null = null;
  if (!overload) {
    const processing = p.serviceMs / (1 - utilisation);
    let transmission = 0;
    if (tier === "cloud") {
      // Each message carries its share of the raw data across the uplink.
      const messageKbits = w.dataKbps / w.messagesPerSec;
      const txMs = messageKbits / (w.uplinkMbps * 1000) * 1000;
      transmission = txMs / (1 - uplinkUtilisation);
    }
    latencyMs = p.rttMs + processing + transmission;
  }

  return { tier, latencyMs, overload, utilisation, uplinkUtilisation, upstreamMbps, gbPerDay };
}

export function evaluateAll(w: Workload): Record<Tier, TierResult> {
  return { edge: evaluate("edge", w), fog: evaluate("fog", w), cloud: evaluate("cloud", w) };
}

export function meetsDeadline(result: TierResult, deadlineMs: number): boolean {
  return result.latencyMs !== null && result.latencyMs <= deadlineMs;
}

export function formatDeadline(ms: number): string {
  if (ms >= 3_600_000) return `${ms / 3_600_000} h`;
  if (ms >= 1000) return `${ms / 1000} s`;
  return `${ms} ms`;
}

export function formatLatency(ms: number | null): string {
  if (ms === null) return "Overloaded";
  return ms < 10 ? `${ms.toFixed(1)} ms` : `${Math.round(ms)} ms`;
}
