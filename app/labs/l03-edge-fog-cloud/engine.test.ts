import { describe, expect, it } from "vitest";
import { SCENARIOS, evaluate, evaluateAll, formatLatency, meetsDeadline, type Workload } from "./engine";

const preset = (id: string): Workload & { deadlineMs: number } => {
  const s = SCENARIOS.find((x) => x.id === id)!;
  return s;
};

describe("L03 scenarios teach the intended lesson", () => {
  it("car braking: only the edge meets 10 ms", () => {
    const s = preset("braking");
    const r = evaluateAll(s);
    expect(meetsDeadline(r.edge, s.deadlineMs)).toBe(true);
    expect(meetsDeadline(r.fog, s.deadlineMs)).toBe(false);
    expect(meetsDeadline(r.cloud, s.deadlineMs)).toBe(false);
  });

  it("factory vibration: edge and fog meet 50 ms, the cloud does not", () => {
    const s = preset("vibration");
    const r = evaluateAll(s);
    expect(meetsDeadline(r.edge, s.deadlineMs)).toBe(true);
    expect(meetsDeadline(r.fog, s.deadlineMs)).toBe(true);
    expect(meetsDeadline(r.cloud, s.deadlineMs)).toBe(false);
    expect(r.cloud.overload).toBeNull();
  });

  it("CCTV: raw video overloads the uplink when sent to the cloud", () => {
    const s = preset("cctv");
    const r = evaluateAll(s);
    expect(r.cloud.overload).toBe("uplink");
    expect(r.cloud.latencyMs).toBeNull();
    expect(meetsDeadline(r.edge, s.deadlineMs)).toBe(true);
    expect(r.cloud.upstreamMbps).toBeCloseTo(40);
    expect(r.edge.upstreamMbps).toBeCloseTo(0.8);
  });

  it("monthly energy report: every tier is fast enough", () => {
    const s = preset("energy");
    const r = evaluateAll(s);
    for (const t of Object.values(r)) expect(meetsDeadline(t, s.deadlineMs)).toBe(true);
  });
});

describe("L03 model", () => {
  it("ranks round trips edge < fog < cloud for a light load", () => {
    const w = { devices: 1, dataKbps: 1, messagesPerSec: 1, uplinkMbps: 10 };
    const r = evaluateAll(w);
    expect(r.edge.latencyMs!).toBeLessThan(r.fog.latencyMs!);
    expect(r.fog.latencyMs!).toBeLessThan(r.cloud.latencyMs!);
  });

  it("queues grow as utilisation rises", () => {
    const light = evaluate("edge", { devices: 10, dataKbps: 1, messagesPerSec: 10, uplinkMbps: 10 });
    const heavy = evaluate("edge", { devices: 80, dataKbps: 1, messagesPerSec: 10, uplinkMbps: 10 });
    expect(heavy.latencyMs!).toBeGreaterThan(light.latencyMs!);
  });

  it("reports processing overload at 95% utilisation or more", () => {
    const r = evaluate("edge", { devices: 95, dataKbps: 1, messagesPerSec: 10, uplinkMbps: 10 });
    expect(r.overload).toBe("processing");
    expect(r.latencyMs).toBeNull();
  });

  it("sends less data upstream from lower tiers", () => {
    const w = { devices: 100, dataKbps: 100, messagesPerSec: 1, uplinkMbps: 100 };
    const r = evaluateAll(w);
    expect(r.cloud.upstreamMbps).toBeCloseTo(10);
    expect(r.fog.upstreamMbps).toBeCloseTo(1);
    expect(r.edge.upstreamMbps).toBeCloseTo(0.2);
    expect(r.cloud.gbPerDay).toBeCloseTo(108);
  });

  it("formats latency for display", () => {
    expect(formatLatency(null)).toBe("Overloaded");
    expect(formatLatency(4.23)).toBe("4.2 ms");
    expect(formatLatency(81.2)).toBe("81 ms");
  });
});
