import { describe, expect, it } from "vitest";
import { CHALLENGES, check, getChallenge, realTokens, type Placement } from "./engine";

const solved = (id: string): Placement =>
  Object.fromEntries(realTokens(getChallenge(id)).map((t) => [t.id, t.accepts[0]]));

describe("challenge data", () => {
  it("every token's layers exist and ids are unique", () => {
    for (const c of CHALLENGES) {
      const layers = new Set(c.layers.map((l) => l.id));
      const ids = c.tokens.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const t of c.tokens) for (const a of t.accepts) expect(layers.has(a)).toBe(true);
      // Every layer gets at least one token.
      for (const l of c.layers) expect(c.tokens.some((t) => t.accepts[0] === l.id)).toBe(true);
    }
  });

  it("the IETF stack has exactly one protocol per layer plus three distractors", () => {
    const c = getChallenge("ietf-stack");
    expect(realTokens(c)).toHaveLength(c.layers.length);
    expect(c.tokens.filter((t) => t.accepts.length === 0).map((t) => t.label)).toEqual(["TCP", "HTTP", "Wi-Fi"]);
  });
});

describe("checking", () => {
  it("a solved board is complete with no mistakes", () => {
    for (const c of CHALLENGES) {
      const r = check(c, solved(c.id));
      expect(r.complete).toBe(true);
      expect(r.firstMistake).toBeNull();
      expect(r.correct).toBe(realTokens(c).length);
    }
  });

  it("explains the first mistake in tray order", () => {
    const c = getChallenge("iot-stack");
    const r = check(c, { ...solved("iot-stack"), udp: "network", mqtt: "transport" });
    expect(r.complete).toBe(false);
    expect(r.states.mqtt).toBe("wrong");
    expect(r.firstMistake?.token).toBe("mqtt"); // MQTT comes before UDP in the tray
    expect(r.firstMistake?.message).toContain("not a Transport item");
  });

  it("accepts a second-choice layer with a note", () => {
    const r = check(getChallenge("iot-stack"), { ...solved("iot-stack"), "6lowpan": "network" });
    expect(r.states["6lowpan"]).toBe("ok-alt");
    expect(r.complete).toBe(true);
    expect(r.notes[0]).toMatch(/^6LoWPAN:/);
  });

  it("a distractor placed anywhere is a mistake", () => {
    const r = check(getChallenge("ietf-stack"), { ...solved("ietf-stack"), tcp: "transport" });
    expect(r.states.tcp).toBe("wrong");
    expect(r.firstMistake?.message).toContain("does not belong");
    expect(r.complete).toBe(false);
  });

  it("counts what is left to place, ignoring distractors in the tray", () => {
    const r = check(getChallenge("ietf-stack"), { coap: "application" });
    expect(r.remaining).toBe(4);
    expect(r.placed).toBe(1);
    expect(r.complete).toBe(false);
  });

  it("puts the gateway in the network layer of the 3-layer model", () => {
    expect(check(getChallenge("three-layer"), { gateway: "network" }).states.gateway).toBe("ok");
    expect(check(getChallenge("three-layer"), { gateway: "perception" }).states.gateway).toBe("wrong");
  });
});
