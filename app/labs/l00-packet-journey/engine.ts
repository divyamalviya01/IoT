import { transmitPath, type LinkConfig } from "~/lib/sim/network";
import { createRng, type Rng } from "~/lib/sim/random";

/** The stops a packet passes, in order. Links sit between neighbours. */
export const STOPS = ["Sensor", "Gateway", "Internet", "Cloud"] as const;
export const LINK_NAMES = ["sensor → gateway", "gateway → internet", "internet → cloud"] as const;

export interface JourneyConfig {
  /** Average delay on each of the three links, in ms */
  delayMs: number;
  /** Chance of losing a packet on each link, 0–100 */
  lossPct: number;
  packetCount: number;
  /** Time between two packets leaving the sensor, in ms */
  intervalMs: number;
  payloadBytes?: number;
}

export interface Packet {
  id: number;
  sentAt: number;
  /** Delay on each link the packet reached */
  hopDelays: number[];
  /** Link index where it was lost, or null if delivered */
  lostAtHop: number | null;
  /** Time it reached the cloud, or the time it was lost */
  endAt: number;
}

export type JourneyEventKind = "sent" | "delivered" | "lost";

export interface JourneyEvent {
  t: number;
  kind: JourneyEventKind;
  packetId: number;
  text: string;
}

export interface JourneyStats {
  sent: number;
  delivered: number;
  lost: number;
  /** Packets still travelling */
  inFlight: number;
  /** Average end-to-end delay of delivered packets, ms (0 if none) */
  avgDelayMs: number;
  minDelayMs: number;
  maxDelayMs: number;
  deliveryPct: number;
}

export type PacketPosition =
  | { state: "moving"; link: number; progress: number }
  | { state: "lost"; link: number; progress: number; since: number }
  | { state: "arrived"; since: number };

/** Lost packets are drawn disappearing halfway along the link. */
const LOSS_POINT = 0.5;

export function linksFor(config: JourneyConfig): LinkConfig[] {
  const jitterMs = config.delayMs * 0.2;
  return LINK_NAMES.map(() => ({
    latencyMs: config.delayMs,
    jitterMs,
    lossPct: config.lossPct,
  }));
}

/**
 * Discrete-event model of packets travelling sensor → gateway → internet →
 * cloud. Each packet's fate is decided when it is sent (seeded), so a run is
 * fully repeatable. Call advance() with simulated time steps.
 */
export class PacketJourney {
  readonly config: JourneyConfig;
  time = 0;
  packets: Packet[] = [];
  private rng: Rng;
  private links: LinkConfig[];
  private nextSendAt = 0;

  constructor(config: JourneyConfig, seed = 1) {
    this.config = config;
    this.rng = createRng(seed);
    this.links = linksFor(config);
  }

  /** Advances simulated time and returns everything that happened, in order. */
  advance(dtMs: number): JourneyEvent[] {
    const from = this.time;
    const to = from + dtMs;
    const events: JourneyEvent[] = [];

    // Send every packet due in (from, to].
    while (this.packets.length < this.config.packetCount && this.nextSendAt <= to) {
      const id = this.packets.length + 1;
      const sentAt = this.nextSendAt;
      const result = transmitPath(this.links, this.config.payloadBytes ?? 64, this.rng);
      const lostAtHop = result.lostAtHop;
      const endAt =
        lostAtHop === null
          ? sentAt + result.delayMs
          : sentAt +
            result.hopDelays.slice(0, lostAtHop).reduce((s, d) => s + d, 0) +
            result.hopDelays[lostAtHop] * LOSS_POINT;
      this.packets.push({ id, sentAt, hopDelays: result.hopDelays, lostAtHop, endAt });
      events.push({ t: sentAt, kind: "sent", packetId: id, text: `Packet ${id} left the sensor.` });
      this.nextSendAt += this.config.intervalMs;
    }

    // Report arrivals and losses that happen in (from, to].
    for (const p of this.packets) {
      if (p.endAt > from && p.endAt <= to) {
        if (p.lostAtHop === null) {
          events.push({
            t: p.endAt,
            kind: "delivered",
            packetId: p.id,
            text: `Packet ${p.id} reached the cloud after ${Math.round(p.endAt - p.sentAt)} ms.`,
          });
        } else {
          events.push({
            t: p.endAt,
            kind: "lost",
            packetId: p.id,
            text: `Packet ${p.id} was lost on the ${LINK_NAMES[p.lostAtHop]} link.`,
          });
        }
      }
    }

    this.time = to;
    return events.sort((a, b) => a.t - b.t);
  }

  /** True once every packet has been sent and has arrived or been lost. */
  get done(): boolean {
    return (
      this.packets.length === this.config.packetCount &&
      this.packets.every((p) => p.endAt <= this.time)
    );
  }

  get stats(): JourneyStats {
    const finished = this.packets.filter((p) => p.endAt <= this.time);
    const delivered = finished.filter((p) => p.lostAtHop === null);
    const delays = delivered.map((p) => p.endAt - p.sentAt);
    const lost = finished.length - delivered.length;
    return {
      sent: this.packets.length,
      delivered: delivered.length,
      lost,
      inFlight: this.packets.length - finished.length,
      avgDelayMs: delays.length ? delays.reduce((s, d) => s + d, 0) / delays.length : 0,
      minDelayMs: delays.length ? Math.min(...delays) : 0,
      maxDelayMs: delays.length ? Math.max(...delays) : 0,
      deliveryPct: finished.length ? (delivered.length / finished.length) * 100 : 0,
    };
  }

  /** Where a packet is at time t, for drawing. Null before it is sent. */
  positionOf(p: Packet, t = this.time): PacketPosition | null {
    if (t < p.sentAt) return null;
    if (t >= p.endAt) {
      return p.lostAtHop === null
        ? { state: "arrived", since: p.endAt }
        : { state: "lost", link: p.lostAtHop, progress: LOSS_POINT, since: p.endAt };
    }
    let elapsed = t - p.sentAt;
    for (let link = 0; link < p.hopDelays.length; link++) {
      const d = p.hopDelays[link];
      if (elapsed < d || link === p.hopDelays.length - 1) {
        return { state: "moving", link, progress: Math.min(1, d > 0 ? elapsed / d : 1) };
      }
      elapsed -= d;
    }
    return { state: "moving", link: 0, progress: 0 };
  }
}

/** Delivery chance across all three links: (1 − loss)³. */
export function expectedDeliveryPct(lossPct: number): number {
  return Math.pow(1 - lossPct / 100, LINK_NAMES.length) * 100;
}
