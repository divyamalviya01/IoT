import { describe, expect, it } from "vitest";
import {
  pathDeliveryProbability,
  serializationDelayMs,
  transmit,
  transmitPath,
} from "./network";
import { createRng } from "./random";

describe("createRng", () => {
  it("repeats the same sequence for the same seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("gives different sequences for different seeds", () => {
    expect(createRng(1).next()).not.toEqual(createRng(2).next());
  });

  it("keeps int() inside its inclusive bounds", () => {
    const rng = createRng(7);
    const values = Array.from({ length: 2000 }, () => rng.int(3, 6));
    expect(Math.min(...values)).toBe(3);
    expect(Math.max(...values)).toBe(6);
  });

  it("produces a normal distribution with roughly the right mean", () => {
    const rng = createRng(99);
    const values = Array.from({ length: 5000 }, () => rng.normal(10, 2));
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    expect(mean).toBeGreaterThan(9.9);
    expect(mean).toBeLessThan(10.1);
  });
});

describe("network model", () => {
  it("computes serialization delay from bytes and kbps", () => {
    // 125 bytes = 1000 bits; at 100 kbps (100 bits/ms) that takes 10 ms.
    expect(serializationDelayMs(125, 100)).toBe(10);
    expect(serializationDelayMs(125, undefined)).toBe(0);
  });

  it("never loses packets at 0% loss and always loses them at 100%", () => {
    const rng = createRng(1);
    for (let i = 0; i < 200; i++) {
      expect(transmit({ latencyMs: 10, lossPct: 0 }, 50, rng).delivered).toBe(true);
      expect(transmit({ latencyMs: 10, lossPct: 100 }, 50, rng).delivered).toBe(false);
    }
  });

  it("loses roughly the configured share of packets", () => {
    const rng = createRng(5);
    let lost = 0;
    const n = 10000;
    for (let i = 0; i < n; i++) {
      if (!transmit({ latencyMs: 10, lossPct: 20 }, 50, rng).delivered) lost++;
    }
    expect(lost / n).toBeGreaterThan(0.18);
    expect(lost / n).toBeLessThan(0.22);
  });

  it("keeps delay within latency ± jitter plus serialization", () => {
    const rng = createRng(3);
    for (let i = 0; i < 500; i++) {
      const t = transmit({ latencyMs: 50, jitterMs: 10, lossPct: 0, bandwidthKbps: 80 }, 100, rng);
      expect(t.delayMs).toBeGreaterThanOrEqual(40 + 10);
      expect(t.delayMs).toBeLessThanOrEqual(60 + 10);
    }
  });

  it("adds hop delays along a path and reports where a packet was lost", () => {
    const ok = transmitPath(
      [
        { latencyMs: 5, lossPct: 0 },
        { latencyMs: 20, lossPct: 0 },
      ],
      40,
      createRng(1),
    );
    expect(ok).toEqual({ delivered: true, delayMs: 25, hopDelays: [5, 20], lostAtHop: null });

    const lost = transmitPath(
      [
        { latencyMs: 5, lossPct: 0 },
        { latencyMs: 20, lossPct: 100 },
        { latencyMs: 30, lossPct: 0 },
      ],
      40,
      createRng(1),
    );
    expect(lost.delivered).toBe(false);
    expect(lost.lostAtHop).toBe(1);
    expect(lost.hopDelays).toHaveLength(2);
  });

  it("multiplies survival probabilities across hops", () => {
    expect(
      pathDeliveryProbability([
        { latencyMs: 0, lossPct: 10 },
        { latencyMs: 0, lossPct: 50 },
      ]),
    ).toBeCloseTo(0.45);
  });
});
