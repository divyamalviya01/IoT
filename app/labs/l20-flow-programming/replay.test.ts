import { describe, expect, it } from "vitest";
import { CHALLENGES, getChallenge, makeNode, simulate, wire, type Flow } from "./engine";
import { buildReplay, countsAt, fromView, nextId, nextSpot, shortResult, summarise, toView } from "./replay";

describe("replay", () => {
  it("gives each hop its depth along the chain", () => {
    const flow = getChallenge("fahrenheit").example();
    const replay = buildReplay(flow, simulate(flow));
    expect(replay.ticks[0].hops.map((h) => h.depth)).toEqual([0, 1, 2]);
    expect(replay.ticks[0].levels).toBe(3);
  });

  it("ends with the engine's counts for every example", () => {
    for (const c of CHALLENGES) {
      const flow = c.example();
      const result = simulate(flow);
      const replay = buildReplay(flow, result);
      expect(replay.wireBefore[60], c.id).toEqual(result.wireCounts);
      expect(replay.nodeBefore[60], c.id).toEqual(result.nodeCounts);
    }
  });

  it("counts a wire's message when its dot arrives", () => {
    const flow = getChallenge("gauge").example();
    const replay = buildReplay(flow, simulate(flow));
    expect(countsAt(replay, 0, 0).wires["n1:0-n2"]).toBe(0);
    expect(countsAt(replay, 0, 0.5).wires["n1:0-n2"]).toBe(0);
    expect(countsAt(replay, 0, 1).wires["n1:0-n2"]).toBe(1);
    expect(countsAt(replay, 5, 0).wires["n1:0-n2"]).toBe(5);
    expect(countsAt(replay, 60, 0).nodes.n2).toBe(60);
  });
});

describe("canvas", () => {
  it("turns positions to the view and back", () => {
    for (const vertical of [false, true]) {
      const v = toView(260, 120, vertical);
      expect(fromView(v, vertical)).toEqual({ x: 260, y: 120 });
    }
  });

  it("puts a new node in a free spot", () => {
    const flow: Flow = { nodes: [makeNode("n1", "sensor", {}, 40, 120)], wires: [] };
    const spot = nextSpot(flow, "dashboard");
    expect(spot.x).toBeGreaterThan(200);
    expect(nextSpot(flow, "sensor")).not.toEqual({ x: 40, y: 120 });
    expect(nextId(flow.nodes)).toBe("n2");
  });
});

describe("observations", () => {
  it("writes a short result and a summary", () => {
    const flow = getChallenge("save").example();
    const r = simulate(flow);
    const v = getChallenge("save").check(r);
    const result = shortResult("save", r, v);
    expect(result).toMatch(/^Pass: \d+\/60 sent$/);
    const text = summarise([{ challengeId: "save", passed: 1, result, readings: 60, mqtt: r.mqtt.length }]);
    expect(text).toContain("Report by exception");
    expect(text).toContain("% less data");
  });

  it("gives a short reason when a challenge fails", () => {
    const wrong: Flow = { nodes: [makeNode("n1", "sensor"), makeNode("n2", "threshold"), makeNode("n3", "alert")], wires: [wire("n1", "n2"), wire("n2", "n3", 1)] };
    const r = simulate(wrong);
    const v = getChallenge("alert").check(r);
    expect(v.pass).toBe(false);
    expect(shortResult("alert", r, v)).toMatch(/^Fail: \d+ alerts, \d+ hot$/);
    const noTopic = getChallenge("fahrenheit").example();
    noTopic.nodes[3].config.topic = "home/temp";
    const r2 = simulate(noTopic);
    expect(shortResult("fahrenheit", r2, getChallenge("fahrenheit").check(r2))).toBe("Fail: wrong topic");
  });
});
