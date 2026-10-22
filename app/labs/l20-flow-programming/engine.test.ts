import { describe, expect, it } from "vitest";
import { CHALLENGES, canDeploy, getChallenge, makeNode, sensorSeries, simulate, toF, validateFlow, wire, type Flow } from "./engine";

const run = (flow: Flow) => simulate(flow, 60, 1);
const verdict = (id: string, flow: Flow) => getChallenge(id).check(run(flow));

describe("nodes", () => {
  it("converts 25 °C to 77 °F", () => {
    expect(toF(25)).toBe(77);
    expect(toF(-40)).toBe(-40);
  });

  it("gives a seeded sensor series of about 31–37 °C", () => {
    const s = sensorSeries(60, 1);
    expect(s).toEqual(sensorSeries(60, 1));
    expect(Math.min(...s)).toBeGreaterThan(30);
    expect(Math.max(...s)).toBeLessThan(38);
    expect(s.some((v) => v > 35)).toBe(true);
  });

  it("sends a reading every 5 s when the interval is 5", () => {
    const r = simulate({ nodes: [makeNode("n1", "sensor", { interval: 5 }), makeNode("n2", "debug")], wires: [wire("n1", "n2")] }, 60);
    expect(r.readings).toHaveLength(12);
    expect(r.debug).toHaveLength(12);
  });

  it("fills a template and counts messages on each wire", () => {
    const flow: Flow = { nodes: [makeNode("n1", "sensor"), makeNode("n2", "template"), makeNode("n3", "mqtt", { topic: "a/b" })], wires: [wire("n1", "n2"), wire("n2", "n3")] };
    const r = run(flow);
    expect(r.mqtt[0].payload).toBe(`{"temp": ${r.readings[0].value.toFixed(1)}}`);
    expect(r.wireCounts["n2:0-n3"]).toBe(60);
    expect(r.ticks[0].hops.map((h) => h.wire)).toEqual(["n1:0-n2", "n2:0-n3"]);
  });
});

describe("checking a flow", () => {
  it("needs a sensor", () => {
    expect(canDeploy({ nodes: [makeNode("n1", "debug")], wires: [] })).toBe(false);
  });

  it("finds a node with nothing wired in, and a dangling output", () => {
    const p = validateFlow({ nodes: [makeNode("n1", "sensor"), makeNode("n2", "convert"), makeNode("n3", "mqtt")], wires: [wire("n1", "n3")] });
    expect(p.filter((x) => x.level === "error").map((x) => x.node)).toEqual(["n2"]);
    expect(p.some((x) => x.level === "warning" && x.node === "n2")).toBe(true);
  });

  it("refuses a loop", () => {
    const flow: Flow = { nodes: [makeNode("n1", "sensor"), makeNode("n2", "convert"), makeNode("n3", "convert")], wires: [wire("n1", "n2"), wire("n2", "n3"), wire("n3", "n2")] };
    expect(validateFlow(flow).some((p) => p.text.includes("loop"))).toBe(true);
    expect(() => run(flow)).not.toThrow();
  });

  it("refuses to publish to a wildcard topic", () => {
    const p = validateFlow({ nodes: [makeNode("n1", "sensor"), makeNode("n2", "mqtt", { topic: "home/#" })], wires: [wire("n1", "n2")] });
    expect(p.some((x) => x.level === "error" && x.text.includes("wildcard"))).toBe(true);
  });
});

describe("challenges", () => {
  it("passes every challenge with its example flow", () => {
    for (const c of CHALLENGES) {
      const flow = c.example();
      expect(canDeploy(flow)).toBe(true);
      expect(c.check(run(flow)), c.id).toMatchObject({ pass: true });
    }
  });

  it("fails the gauge when the reading is converted to °F first", () => {
    const flow: Flow = { nodes: [makeNode("n1", "sensor"), makeNode("n2", "convert"), makeNode("n3", "dashboard")], wires: [wire("n1", "n2"), wire("n2", "n3")] };
    expect(verdict("gauge", flow).pass).toBe(false);
  });

  it("fails the heat alert when the No output is wired, or there is no threshold", () => {
    const wrongPort: Flow = { nodes: [makeNode("n1", "sensor"), makeNode("n2", "threshold"), makeNode("n3", "alert")], wires: [wire("n1", "n2"), wire("n2", "n3", 1)] };
    expect(verdict("alert", wrongPort)).toMatchObject({ pass: false });
    const direct: Flow = { nodes: [makeNode("n1", "sensor"), makeNode("n2", "alert")], wires: [wire("n1", "n2")] };
    expect(verdict("alert", direct).pass).toBe(false);
  });

  it("sends exactly one alert per reading above 35 °C", () => {
    const r = run(getChallenge("alert").example());
    expect(r.alerts).toHaveLength(r.readings.filter((x) => x.value > 35).length);
  });

  it("fails Fahrenheit without the conversion, or on the wrong topic", () => {
    const noConvert: Flow = { nodes: [makeNode("n1", "sensor"), makeNode("n2", "template"), makeNode("n3", "mqtt", { topic: "home/temp/f" })], wires: [wire("n1", "n2"), wire("n2", "n3")] };
    expect(verdict("fahrenheit", noConvert).text).toContain("°F");
    const flow = getChallenge("fahrenheit").example();
    flow.nodes[3].config.topic = "home/temp";
    expect(verdict("fahrenheit", flow).text).toContain("wrong topic");
  });

  it("fails Save data when the filter lets every reading through", () => {
    const flow = getChallenge("save").example();
    flow.nodes[1].config.minChange = 0;
    expect(verdict("save", flow)).toMatchObject({ pass: false });
  });

  it("publishes fewer readings with report by exception", () => {
    const r = run(getChallenge("save").example());
    expect(r.mqtt.length).toBeGreaterThan(0);
    expect(r.mqtt.length).toBeLessThan(60);
  });
});
