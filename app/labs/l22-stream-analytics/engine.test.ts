import { describe, expect, it } from "vitest";
import { RUN_SAMPLES, analyse, clock, defaultFaults, generateStream, movingAverage, score, smoothingLag, zScores } from "./engine";

const values = (r: { value: number }[]) => r.map((x) => x.value);

describe("moving average and z-score", () => {
  it("averages the last N readings, using fewer at the start", () => {
    expect(movingAverage([1, 2, 3, 4, 5], 3)).toEqual([1, 1.5, 2, 3, 4]);
  });

  it("gives z = 0 for a constant signal and during the warm-up", () => {
    expect(zScores([5, 5, 5, 5, 5, 5], 3)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(zScores([1, 9, 2, 8, 3], 10).every((z) => z === 0)).toBe(true);
  });

  it("measures a reading against the readings before it", () => {
    const z = zScores([1, 2, 3, 2, 10], 4);
    expect(z[4]).toBeCloseTo((10 - 2) / Math.sqrt(0.5), 9);
  });

  it("trails the signal by (N − 1) / 2 readings", () => {
    expect(smoothingLag(20)).toBe(9.5);
    expect(smoothingLag(3)).toBe(1);
  });
});

describe("the default six-hour run", () => {
  const readings = generateStream();
  const run = (window: number, k: number) => score(readings, analyse(values(readings), { window, k }));

  it("runs from 08:00 with five spikes", () => {
    expect(readings).toHaveLength(RUN_SAMPLES);
    expect(clock(readings[0].minute)).toBe("08:00");
    expect(defaultFaults().map((f) => f.at)).toEqual([79, 159, 189, 269, 306]);
  });

  it("catches all five spikes with window 20 and k = 3, with one false alarm", () => {
    expect(run(20, 3)).toMatchObject({ spikes: 5, caught: 5, missed: 0, falseAlarms: 1 });
  });

  it("raises more false alarms when k is lowered", () => {
    expect(run(20, 2).falseAlarms).toBe(10);
    expect(run(20, 2).falseAlarms).toBeGreaterThan(run(20, 2.5).falseAlarms);
  });

  it("raises more false alarms with a tiny window, fewer with a big one", () => {
    expect(run(5, 3).falseAlarms).toBe(23);
    expect(run(50, 3).falseAlarms).toBe(0);
    expect(run(50, 3).caught).toBe(5);
  });
});

describe("other faults", () => {
  it("lets a slow drift slip past the z-score", () => {
    const r = generateStream({ faults: [{ kind: "drift", at: 100 }] });
    const p = analyse(values(r), { window: 20, k: 3 });
    expect(p[225].avg - p[99].avg).toBeGreaterThan(3);
    expect(p.filter((q) => q.flag && q.i >= 100 && q.i < 230).length).toBeLessThanOrEqual(2);
  });

  it("flags a stuck sensor once it repeats the same value six times", () => {
    const r = generateStream({ faults: [{ kind: "stuck", at: 150 }] });
    const p = analyse(values(r), { window: 20, k: 3 });
    expect(p.filter((q) => q.flag === "stuck").map((q) => q.i)).toEqual([154]);
    expect(score(r, p)).toMatchObject({ stuckFaults: 1, stuckCaught: 1 });
  });

  it("changes only the readings a fault touches", () => {
    const clean = generateStream({ faults: [] });
    const spiked = generateStream({ faults: [{ kind: "spike", at: 200 }] });
    expect(spiked[200].value - clean[200].value).toBeCloseTo(8, 9);
    expect(spiked.filter((r, i) => r.value !== clean[i].value).map((r) => r.i)).toEqual([200]);
  });

  it("repeats exactly with the same seed", () => {
    expect(generateStream({ seed: 4 })).toEqual(generateStream({ seed: 4 }));
  });
});
