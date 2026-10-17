import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, makeWorld, runAll, runPattern, type PatternConfig } from "./engine";

const cfg = (patch: Partial<PatternConfig> = {}): PatternConfig => ({ ...DEFAULT_CONFIG, ...patch });

describe("shared world", () => {
  it("gives every pattern the same readings and is repeatable", () => {
    const a = runAll(cfg());
    const b = runAll(cfg());
    expect(a.world.changes).toEqual(b.world.changes);
    expect(a.results.pubSub.messages).toEqual(b.results.pubSub.messages);
    // About 10 sensors × 120 readings × 0.3
    expect(a.world.changes.length).toBeGreaterThan(300);
    expect(a.world.changes.length).toBeLessThan(420);
  });
});

describe("request–response", () => {
  it("misses nothing when apps poll faster than readings arrive", () => {
    const r = runPattern("requestResponse", makeWorld(cfg({ pollEveryS: 4 })));
    expect(r.missed).toBe(0);
  });

  it("sends fewer messages as the poll interval grows", () => {
    const totals = [5, 10, 15, 30].map((p) => runPattern("requestResponse", makeWorld(cfg({ pollEveryS: p }))).messages.total);
    for (let i = 1; i < totals.length; i++) expect(totals[i]).toBeLessThan(totals[i - 1]);
  });

  it("still polls when nothing changes, so every message is wasted", () => {
    const w = makeWorld(cfg({ changeProb: 0 }));
    const r = runPattern("requestResponse", w);
    const polls = w.appPhase.reduce((s, p) => s + Math.ceil((600 - p) / 15), 0);
    expect(r.messages.total).toBe(2 * polls);
    expect(r.avgDelayS).toBeNull();
  });
});

describe("publish–subscribe", () => {
  it("grows linearly with the number of apps, because every app gets its own copy", () => {
    const worlds = [1, 2, 3, 4].map((apps) => makeWorld(cfg({ apps, seed: 4 })));
    // Changing the number of apps keeps the same readings.
    for (const w of worlds) expect(w.changes).toEqual(worlds[0].changes);
    const m = worlds.map((w) => runPattern("pubSub", w).messages.total);
    expect(m[1] - m[0]).toBeGreaterThan(0);
    expect(m[2] - m[1]).toBe(m[1] - m[0]);
    expect(m[3] - m[2]).toBe(m[1] - m[0]);
    worlds.forEach((w, i) => expect(runPattern("pubSub", w).messages.data).toBe(w.changes.length * (2 + i)));
  });

  it("keeps readings for an offline app and delivers them late", () => {
    const r = runPattern("pubSub", makeWorld(cfg({ appOffline: true })));
    expect(r.missed).toBe(0);
    expect(r.maxQueue).toBeGreaterThan(10);
    expect(r.worstDelayS!).toBeGreaterThan(50);
  });
});

describe("push–pull", () => {
  it("gives each reading to one worker: every reading is taken or still waiting", () => {
    const w = makeWorld(cfg());
    const r = runPattern("pushPull", w);
    expect(r.delivered + r.pending).toBe(w.changes.length);
    expect(r.copies).toBe(1);
    expect(r.missed).toBe(0);
  });

  it("builds a backlog when the workers are too slow", () => {
    const enough = runPattern("pushPull", makeWorld(cfg({ apps: 4 })));
    const tooFew = runPattern("pushPull", makeWorld(cfg({ apps: 2 })));
    expect(tooFew.maxQueue).toBeGreaterThan(enough.maxQueue * 2);
    expect(tooFew.worstDelayS!).toBeGreaterThan(enough.worstDelayS!);
  });

  it("carries on when one worker goes offline", () => {
    const r = runPattern("pushPull", makeWorld(cfg({ appOffline: true })));
    expect(r.missed).toBe(0);
  });
});

describe("exclusive pair", () => {
  it("delivers in one round of network delay but loses readings for an app that is not connected", () => {
    const online = runPattern("exclusivePair", makeWorld(cfg()));
    expect(online.avgDelayS).toBeCloseTo(0.1, 5);
    expect(online.missed).toBe(0);
    const offline = runPattern("exclusivePair", makeWorld(cfg({ appOffline: true })));
    expect(offline.missed).toBeGreaterThan(20);
  });
});

describe("the lessons hold for every seed", () => {
  it("orders delay, messages and missed readings the same way", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const r = runAll(cfg({ seed })).results;
      // Delay: polling waits for the next poll, the queue waits for a free worker, push is immediate.
      expect(r.requestResponse.avgDelayS!).toBeGreaterThan(r.pushPull.avgDelayS!);
      expect(r.pushPull.avgDelayS!).toBeGreaterThan(r.pubSub.avgDelayS!);
      expect(r.pubSub.avgDelayS).toBeCloseTo(r.exclusivePair.avgDelayS!, 5);
      // Messages: QoS 1 acknowledges every copy, so publish–subscribe sends the most.
      expect(r.pubSub.messages.total).toBeGreaterThan(r.exclusivePair.messages.total);
      expect(r.exclusivePair.messages.total).toBeGreaterThan(r.requestResponse.messages.total);
      // Only polling misses readings when every app stays online.
      expect(r.requestResponse.missed).toBeGreaterThan(0);
      expect(r.pubSub.missed + r.pushPull.missed + r.exclusivePair.missed).toBe(0);
      // Connections the server holds open.
      expect(r.pubSub.connections).toBe(13);
      expect(r.exclusivePair.connections).toBe(13);
      expect(r.requestResponse.connections + r.pushPull.connections).toBe(0);
    }
  });

  it("separates publish–subscribe from exclusive pair when an app goes offline", () => {
    const r = runAll(cfg({ appOffline: true })).results;
    expect(r.pubSub.missed).toBe(0);
    expect(r.exclusivePair.missed).toBeGreaterThan(0);
    expect(r.requestResponse.missed).toBeGreaterThan(runAll(cfg()).results.requestResponse.missed);
  });

  it("counts the busiest 10 seconds at the server", () => {
    const r = runAll(cfg()).results;
    for (const p of Object.values(r)) {
      expect(p.peakLoad).toBeGreaterThan(0);
      expect(p.peakLoad).toBeLessThanOrEqual(p.messages.total);
    }
  });
});
