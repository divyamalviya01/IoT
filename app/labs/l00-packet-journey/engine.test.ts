import { describe, expect, it } from "vitest";
import { PacketJourney, expectedDeliveryPct, type JourneyConfig } from "./engine";

const base: JourneyConfig = { delayMs: 100, lossPct: 0, packetCount: 20, intervalMs: 500 };

function runToEnd(journey: PacketJourney, stepMs = 50) {
  const events = [];
  for (let i = 0; i < 10_000 && !journey.done; i++) events.push(...journey.advance(stepMs));
  return events;
}

describe("PacketJourney", () => {
  it("delivers every packet when there is no loss", () => {
    const j = new PacketJourney(base);
    runToEnd(j);
    expect(j.stats).toMatchObject({ sent: 20, delivered: 20, lost: 0, inFlight: 0, deliveryPct: 100 });
  });

  it("loses every packet on the first link at 100% loss", () => {
    const j = new PacketJourney({ ...base, lossPct: 100 });
    runToEnd(j);
    expect(j.stats.delivered).toBe(0);
    expect(j.packets.every((p) => p.lostAtHop === 0)).toBe(true);
  });

  it("repeats exactly with the same seed", () => {
    const a = new PacketJourney({ ...base, lossPct: 15 }, 7);
    const b = new PacketJourney({ ...base, lossPct: 15 }, 7);
    runToEnd(a);
    runToEnd(b);
    expect(a.stats).toEqual(b.stats);
  });

  it("averages about three link delays end to end", () => {
    const j = new PacketJourney({ ...base, packetCount: 200 });
    runToEnd(j);
    // Jitter is symmetric (±20%), so the mean stays near 3 × 100 ms.
    expect(j.stats.avgDelayMs).toBeGreaterThan(285);
    expect(j.stats.avgDelayMs).toBeLessThan(315);
  });

  it("sends packets at the chosen interval", () => {
    const j = new PacketJourney(base);
    j.advance(1200);
    expect(j.packets.map((p) => p.sentAt)).toEqual([0, 500, 1000]);
  });

  it("emits events in time order, one send and one outcome per packet", () => {
    const j = new PacketJourney({ ...base, lossPct: 20 }, 3);
    const events = runToEnd(j, 70);
    const times = events.map((e) => e.t);
    expect(times).toEqual([...times].sort((x, y) => x - y));
    expect(events.filter((e) => e.kind === "sent")).toHaveLength(20);
    expect(events.filter((e) => e.kind !== "sent")).toHaveLength(20);
  });

  it("places a packet on the right link while it travels", () => {
    const j = new PacketJourney({ ...base, packetCount: 1 });
    j.advance(1);
    const p = j.packets[0];
    const [d0, d1] = p.hopDelays;
    expect(j.positionOf(p, d0 / 2)).toMatchObject({ state: "moving", link: 0 });
    expect(j.positionOf(p, d0 + d1 / 2)).toMatchObject({ state: "moving", link: 1 });
    expect(j.positionOf(p, p.endAt + 1)).toMatchObject({ state: "arrived" });
  });

  it("predicts delivery as (1 − loss) cubed over three links", () => {
    expect(expectedDeliveryPct(0)).toBe(100);
    expect(expectedDeliveryPct(10)).toBeCloseTo(72.9);
  });
});
